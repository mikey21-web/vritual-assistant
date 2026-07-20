import os, asyncio, subprocess, glob
from aiohttp import web

VOICES_DIR = '/voices'
LANG_MAP = {
    'te': 'te_IN', 'hi': 'hi_IN', 'ta': 'ta_IN', 'kn': 'kn_IN',
    'ml': 'ml_IN', 'bn': 'bn_IN', 'mr': 'mr_IN', 'gu': 'gu_IN',
}

async def tts(request):
    text = request.query.get('text', '')
    lang = request.query.get('lang', 'te')
    if not text:
        return web.json_response({'error': 'no text'}, status=400)
    voice = LANG_MAP.get(lang, 'te_IN')
    model = os.path.join(VOICES_DIR, f'{voice}.onnx')
    if not os.path.exists(model):
        available = [os.path.basename(p) for p in glob.glob(f'{VOICES_DIR}/*.onnx')]
        return web.json_response({'error': f'voice model not found for {lang}', 'available': available}, status=400)
    try:
        # Try piper via command line, fall back to espeak-ng
        piper_available = os.path.exists('/usr/local/bin/piper')
        if piper_available:
            proc = await asyncio.create_subprocess_exec(
                'piper', '--model', model, '--output-raw',
                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(text.encode()), timeout=30)
            if proc.returncode == 0:
                return web.Response(body=stdout, content_type='audio/x-wav')
        # Fallback to espeak-ng
        proc = await asyncio.create_subprocess_exec(
            'espeak-ng', '-v', voice.replace('_', '-'), '--stdout', text,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
        return web.Response(body=stdout, content_type='audio/x-wav')
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def health(request):
    return web.json_response({'status': 'ok'})

app = web.Application()
app.router.add_get('/tts', tts)
app.router.add_get('/health', health)

if __name__ == '__main__':
    print('Piper TTS server starting on :8123')
    models = [f.replace('.onnx', '') for f in os.listdir(VOICES_DIR) if f.endswith('.onnx')]
    print('Loaded voices:', ', '.join(sorted(models)))
    web.run_app(app, host='0.0.0.0', port=8123)

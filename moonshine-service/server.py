import os, tempfile, logging
from flask import Flask, request, jsonify

logging.basicConfig(level=logging.INFO)
log = logging.getLogger('moonshine')

app = Flask(__name__)

# Lazy-load model on first request
transcriber = None
model_path = os.environ.get('MOONSHINE_MODEL_PATH', '/models/moonshine')
model_arch = os.environ.get('MOONSHINE_MODEL_ARCH', 'moonshine_base')

def get_transcriber():
    global transcriber
    if transcriber is None:
        from moonshine_voice.transcriber import Transcriber
        transcriber = Transcriber(model_path=model_path, model_arch=model_arch)
        log.info('Moonshine model loaded')
    return transcriber

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({'error': 'no audio file'}), 400
    f = request.files['audio']
    suffix = os.path.splitext(f.filename or 'audio.wav')[1] or '.wav'
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        f.save(tmp.name)
        tmp_path = tmp.name
    try:
        from moonshine_voice.transcriber import MicTranscriber
        import soundfile as sf
        data, sr = sf.read(tmp_path)
        if len(data.shape) > 1:
            data = data.mean(axis=1)
        t = get_transcriber()
        t.start()
        t.add_audio(data, sr)
        t.stop()
        text = ' '.join(line.text for line in (t.get_transcript() or []))
        return jsonify({'text': text.strip() or ''})
    except Exception as e:
        log.error('Transcription failed: %s', e)
        return jsonify({'error': str(e)}), 500
    finally:
        os.unlink(tmp_path)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8002))
    app.run(host='0.0.0.0', port=port)

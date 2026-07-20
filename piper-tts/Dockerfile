FROM python:3.12-slim
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends curl espeak-ng && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN pip install --no-cache-dir aiohttp piper-tts

# Download voice models
RUN python3 -c "
import os, urllib.request
voices = [
    ('te_IN', 'https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN/common_voice/medium/te_IN-common_voice-medium.onnx'),
    ('hi_IN', 'https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/common_voice/medium/hi_IN-common_voice-medium.onnx'),
]
os.makedirs('/voices', exist_ok=True)
for name, url in voices:
    path = f'/voices/{name}.onnx'
    if not os.path.exists(path):
        print(f'Downloading {name}...')
        urllib.request.urlretrieve(url, path)
        print(f'Downloaded {name}')
    else:
        print(f'{name} exists')
"

COPY server.py ./
EXPOSE 8123
CMD ["python", "server.py"]

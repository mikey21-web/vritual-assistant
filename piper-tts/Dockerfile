FROM python:3.12-slim
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends curl espeak-ng && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN pip install --no-cache-dir aiohttp

# Download voice models
RUN mkdir -p /voices && \
    curl -sL -o /voices/te_IN.onnx "https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN/common_voice/medium/te_IN-common_voice-medium.onnx" && \
    curl -sL -o /voices/hi_IN.onnx "https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/common_voice/medium/hi_IN-common_voice-medium.onnx" && \
    echo "Voices downloaded: $(ls /voices/*.onnx | wc -l) models"

COPY server.py ./
EXPOSE 8123
CMD ["python", "server.py"]

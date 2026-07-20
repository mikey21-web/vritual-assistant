FROM python:3.12-slim AS builder
RUN apt-get update -qq && apt-get install -y -qq curl && rm -rf /var/lib/apt/lists/*
WORKDIR /build
# Download and verify piper binary
RUN curl -sL -o piper.tar.gz "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz" && \
    tar tzf piper.tar.gz | head -20

FROM python:3.12-slim
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends curl libsndfile1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy piper binary from builder
COPY --from=builder /build/piper /app/piper 2>/dev/null; true

RUN pip install --no-cache-dir aiohttp

# Download Indian language voice models
RUN mkdir -p /voices && \
    curl -sL -o /voices/te_IN.onnx "https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN/common_voice/medium/te_IN-common_voice-medium.onnx" && \
    curl -sL -o /voices/te_IN.onnx.json "https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN/common_voice/medium/te_IN-common_voice-medium.onnx.json" && \
    curl -sL -o /voices/hi_IN.onnx "https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/common_voice/medium/hi_IN-common_voice-medium.onnx" && \
    curl -sL -o /voices/hi_IN.onnx.json "https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/common_voice/medium/hi_IN-common_voice-medium.onnx.json" && \
    echo "Voices: $(ls /voices/*.onnx | wc -l) models"

COPY server.py ./
EXPOSE 8123
CMD ["python3", "server.py"]

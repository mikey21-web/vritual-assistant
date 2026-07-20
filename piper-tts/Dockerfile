FROM alpine:3.19 AS builder
RUN apk add --no-cache curl
WORKDIR /build
RUN curl -sL -o piper.tar.gz "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz" && \
    tar xzf piper.tar.gz && ls -la piper/piper

FROM alpine:3.19
RUN apk add --no-cache curl python3 py3-pip py3-aiohost py3-numpy
RUN pip3 install --break-system-packages aiohttp
WORKDIR /app
COPY --from=builder /build/piper/piper /app/piper
RUN chmod +x /app/piper
RUN mkdir -p /voices && \
    curl -sL -o /voices/te_IN.onnx "https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN/common_voice/medium/te_IN-common_voice-medium.onnx" && \
    curl -sL -o /voices/te_IN.onnx.json "https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN/common_voice/medium/te_IN-common_voice-medium.onnx.json" && \
    curl -sL -o /voices/hi_IN.onnx "https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/common_voice/medium/hi_IN-common_voice-medium.onnx" && \
    curl -sL -o /voices/hi_IN.onnx.json "https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/common_voice/medium/hi_IN-common_voice-medium.onnx.json"
COPY server.py ./
EXPOSE 8123
CMD ["python3", "server.py"]

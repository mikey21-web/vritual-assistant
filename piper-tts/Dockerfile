FROM alpine:3.19
RUN apk add --no-cache curl python3 py3-pip py3-numpy py3-aiohttp
RUN pip3 install --break-system-packages aiohttp
WORKDIR /app

# Download piper binary
RUN curl -sL -o piper.tar.gz "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz" && \
    tar xzf piper.tar.gz && mv piper/piper . && rm -rf piper piper.tar.gz && chmod +x piper

# Download Indian language voice models
RUN mkdir -p /voices && \
    for v in te_IN hi_IN ta_IN kn_IN ml_IN bn_IN mr_IN gu_IN; do \
      curl -sL -o /voices/${v}.onnx "https://huggingface.co/rhasspy/piper-voices/resolve/main/${v%.*}/${v}/common_voice/medium/${v}-common_voice-medium.onnx" && \
      curl -sL -o /voices/${v}.onnx.json "https://huggingface.co/rhasspy/piper-voices/resolve/main/${v%.*}/${v}/common_voice/medium/${v}-common_voice-medium.onnx.json"; \
    done

COPY server.py ./
EXPOSE 8123
CMD ["python3", "server.py"]

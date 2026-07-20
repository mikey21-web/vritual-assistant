FROM python:3.12-slim
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends build-essential curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN pip install --no-cache-dir bolna uvicorn[standard]
ENV BOLNA_CONFIG_PATH=/app/config.yaml
COPY config.yaml ./
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "bolna.main:app", "--host", "0.0.0.0", "--port", "8000"]

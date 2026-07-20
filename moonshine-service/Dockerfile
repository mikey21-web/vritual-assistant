FROM python:3.12-slim
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends libsndfile1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt server.py ./
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8002
CMD ["gunicorn", "-b", "0.0.0.0:8002", "-w", "1", "--timeout", "120", "server:app"]

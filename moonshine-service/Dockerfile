FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .
EXPOSE 8002
CMD ["gunicorn", "-b", "0.0.0.0:8002", "-w", "1", "--timeout", "120", "server:app"]

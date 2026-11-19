# Build from the repo root: docker build -f apps/engine/Dockerfile -t arandu-engine .
# Run by hand (ADR-0003): docker run --rm --env-file .env arandu-engine inep_census

FROM python:3.12-slim
WORKDIR /app
# Tesseract confirms the matrices a vision model transcribes from images (ufscar.py)
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-por \n    && rm -rf /var/lib/apt/lists/*
COPY apps/engine/pyproject.toml ./
COPY apps/engine/src src
RUN pip install --no-cache-dir .
USER nobody
ENTRYPOINT ["python", "-m", "engine"]

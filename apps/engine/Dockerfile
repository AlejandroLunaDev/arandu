# Build from the repo root: docker build -f apps/engine/Dockerfile -t arandu-engine .
# Run by hand (ADR-0003): docker run --rm --env-file .env arandu-engine inep_census

FROM python:3.12-slim
WORKDIR /app
COPY apps/engine/pyproject.toml ./
COPY apps/engine/src src
RUN pip install --no-cache-dir .
USER nobody
ENTRYPOINT ["python", "-m", "engine"]

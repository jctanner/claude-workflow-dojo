# Workflow Dojo: static trainer + FastAPI server + a real `claude` CLI that the
# server runs in a PTY. Claude talks to Model Relay via ANTHROPIC_BASE_URL and
# ANTHROPIC_API_KEY supplied by the deployment.
FROM docker.io/library/node:24-bookworm-slim

ARG CLAUDE_CODE_VERSION=latest

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates git ripgrep procps tini \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
    && npm cache clean --force

WORKDIR /app
COPY pyproject.toml ./
COPY dojo ./dojo
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir . \
    && rm -rf build *.egg-info
COPY static ./static

# The node image's uid 1000 user owns the persistent state under its home.
ENV PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    DOJO_HOST=0.0.0.0 \
    DOJO_PORT=8080 \
    DOJO_STATE_DIR=/home/node/dojo \
    DISABLE_AUTOUPDATER=1
RUN mkdir -p /home/node/dojo && chown -R node:node /home/node
USER 1000:1000
EXPOSE 8080
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python3", "-m", "dojo"]

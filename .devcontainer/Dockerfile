FROM node:24.15.0-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    gnupg \
    bash \
    sudo \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

# Allow node user to access Docker socket (gid 999 is the typical docker group gid)
RUN groupadd -g 999 docker 2>/dev/null || true \
    && usermod -aG docker node

USER node

RUN mkdir -p /home/node/.local/share/pnpm/store

WORKDIR /workspace

ENV PNPM_HOME="/home/node/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

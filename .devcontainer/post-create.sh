#!/usr/bin/env bash
set -euo pipefail

echo "Setting up development environment..."

pnpm config set store-dir /home/node/.local/share/pnpm/store

# Bootstrap .env.local from .env.example if it doesn't exist
if [ ! -f .env.local ] && [ -f .env.example ]; then
  cp .env.example .env.local
  echo ".env.local created from .env.example — fill in your secrets before starting"
fi

echo "Installing dependencies with pnpm..."
# Remove node_modules se existir com permissão errada (ex.: instalado como root)
rm -rf /workspace/node_modules
CI=true pnpm install

GIT_NAME="${GIT_AUTHOR_NAME:-Rafael Sales}"
GIT_EMAIL="${GIT_AUTHOR_EMAIL:-rafael.sales@gmail.com}"

git config --global user.name "$GIT_NAME"
git config --global user.email "$GIT_EMAIL"
echo "Git configured as: $GIT_NAME <$GIT_EMAIL>"

echo "Environment ready! To start the dev server: pnpm dev"

FROM node:22-slim

WORKDIR /app

# Install only the necessary dependencies for the signaling server
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --prod y-webrtc

EXPOSE 4444

ENV PORT=4444

# Execute the signaling server directly from the package binary
CMD ["./node_modules/.bin/y-webrtc-signaling"]

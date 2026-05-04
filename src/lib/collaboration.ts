import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";

/**
 * Singleton Y.Doc that will hold the shared state.
 */
export const ydoc = new Y.Doc();

// ---------------------------------------------------------------------------
// ICE server configuration cache
// ---------------------------------------------------------------------------

/** Fallback STUN-only config used before (or if) the API fetch completes. */
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

let cachedIceServers: RTCIceServer[] = FALLBACK_ICE_SERVERS;

/**
 * Pre-fetches ICE server configuration (STUN + optional TURN) from the Next.js
 * API route. The result is cached for the lifetime of the page.
 * Safe to call multiple times — only fetches once.
 */
export const preFetchRtcConfig = (() => {
  let promise: Promise<void> | null = null;
  return () => {
    if (promise) return promise;
    promise = fetch("/api/rtc-config")
      .then((res) => {
        if (!res.ok) throw new Error(`rtc-config HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { iceServers: RTCIceServer[] }) => {
        if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
          cachedIceServers = data.iceServers;
        }
      })
      .catch(() => {
        // Silently fall back to the hardcoded STUN servers
      });
    return promise;
  };
})();

/**
 * The shared map that contains diagrams data.
 * Structure: { [diagramId: string]: { nodes: Y.Array, edges: Y.Array, name: string } }
 */
export const sharedDiagrams = ydoc.getMap("diagrams");

let provider: WebrtcProvider | null = null;

/**
 * Initializes the WebRTC provider for a specific room.
 * @param roomId The unique room ID for collaboration
 */
export const initCollaboration = (roomId: string) => {
  if (provider) {
    provider.destroy();
  }

  // Using custom signaling server from fly.io.
  const signalingServers = process.env.NEXT_PUBLIC_SIGNALING_SERVER
    ? [process.env.NEXT_PUBLIC_SIGNALING_SERVER]
    : ["wss://y-webrtc-signaling.openarchflow.cloud"];

  // Optional password for End-to-End Encryption.
  // We can derive it from the roomId or pass it as a second arg.
  // For maximum privacy, this could be part of the URL hash (fragment) which is not sent to the signaling server.
  const password =
    typeof window !== "undefined" ? window.location.hash.slice(1) : undefined;

  provider = new WebrtcProvider(roomId, ydoc, {
    signaling: signalingServers,
    password: password || undefined,
    peerOpts: {
      // Pass cached ICE servers (STUN + optional TURN) so the peer can
      // traverse NATs and connect across different networks / the internet.
      config: {
        iceServers: cachedIceServers,
      },
    },
  });

  // Publish local presence immediately so other peers see this user's name
  // and color as soon as they connect, before any mouse movement occurs.
  provider.awareness.setLocalState({
    name: localName,
    color: localColor,
    cursor: null,
  });

  return provider;
};

/**
 * Returns the current WebRTC provider instance.
 */
export const getProvider = () => provider;

/**
 * Returns the awareness instance for presence features (cursors, active users).
 */
export const getAwareness = () => provider?.awareness;

/**
 * Destroys the current WebRTC provider and clears the singleton reference.
 * Call this when the user explicitly stops a collaboration session.
 */
export const destroyCollaboration = () => {
  if (provider) {
    provider.destroy();
    provider = null;
  }
};

const PEER_COLORS = [
  "#f87171",
  "#fb923c",
  "#a3e635",
  "#34d399",
  "#22d3ee",
  "#818cf8",
  "#e879f9",
  "#f472b6",
];

let localColor = PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];

const STORAGE_KEY = "openarchflow:username";
let localName: string = (() => {
  try {
    return (
      localStorage.getItem(STORAGE_KEY) ||
      `Guest ${Math.floor(Math.random() * 9000) + 1000}`
    );
  } catch {
    return `Guest ${Math.floor(Math.random() * 9000) + 1000}`;
  }
})();

export const getLocalName = () => localName;
export const getLocalColor = () => localColor;

export const setLocalName = (name: string) => {
  localName = name.trim() || localName;
  try {
    localStorage.setItem(STORAGE_KEY, localName);
  } catch {
    /* ignore */
  }
  // Broadcast the new name immediately via awareness
  const awareness = provider?.awareness;
  if (awareness) awareness.setLocalStateField("name", localName);
};

/**
 * Publishes this peer's cursor position to the awareness channel.
 * Uses a single setLocalState call to avoid 3 separate broadcasts per mouse move.
 */
export const publishCursor = (x: number, y: number) => {
  const awareness = provider?.awareness;
  if (!awareness) return;
  const current = awareness.getLocalState() ?? {};
  awareness.setLocalState({
    ...current,
    cursor: { x, y },
    color: localColor,
    name: localName,
  });
};

export interface RemoteCursor {
  clientId: number;
  x: number;
  y: number;
  color: string;
  name: string;
}

export interface Peer {
  clientId: number;
  name: string;
  color: string;
  isLocal: boolean;
}

/**
 * Returns all connected peers (including the local user) from the awareness state.
 */
export const getPeers = (): Peer[] => {
  const awareness = provider?.awareness;
  if (!awareness) return [];
  const localId = awareness.clientID;
  const result: Peer[] = [];
  awareness.getStates().forEach((state: any, clientId: number) => {
    result.push({
      clientId,
      name:
        state?.name ?? (clientId === localId ? localName : `Peer ${clientId}`),
      color: state?.color ?? "#888",
      isLocal: clientId === localId,
    });
  });
  // Local user first, then others sorted by clientId for stability
  return result.sort((a, b) =>
    a.isLocal ? -1 : b.isLocal ? 1 : a.clientId - b.clientId,
  );
};

/**
 * Returns current remote peer cursors from the awareness state.
 */
export const getRemoteCursors = (): RemoteCursor[] => {
  const awareness = provider?.awareness;
  if (!awareness) return [];
  const localId = awareness.clientID;
  const result: RemoteCursor[] = [];
  awareness.getStates().forEach((state: any, clientId: number) => {
    if (clientId === localId) return;
    if (state?.cursor) {
      result.push({
        clientId,
        x: state.cursor.x,
        y: state.cursor.y,
        color: state.color ?? "#888",
        name: state.name ?? `Peer ${clientId}`,
      });
    }
  });
  return result;
};

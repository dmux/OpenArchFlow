import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

/**
 * Singleton Y.Doc that will hold the shared state.
 */
export const ydoc = new Y.Doc();

/**
 * The shared map that contains diagrams data.
 * Structure: { [diagramId: string]: { nodes: Y.Array, edges: Y.Array, name: string } }
 */
export const sharedDiagrams = ydoc.getMap('diagrams');

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
        : [
            'wss://y-webrtc-signaling.openarchflow.cloud'
        ];

    // Optional password for End-to-End Encryption.
    // We can derive it from the roomId or pass it as a second arg.
    // For maximum privacy, this could be part of the URL hash (fragment) which is not sent to the signaling server.
    const password = typeof window !== 'undefined' ? window.location.hash.slice(1) : undefined;

    provider = new WebrtcProvider(roomId, ydoc, {
        signaling: signalingServers,
        password: password || undefined,
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

const PEER_COLORS = [
    '#f87171', '#fb923c', '#a3e635', '#34d399',
    '#22d3ee', '#818cf8', '#e879f9', '#f472b6',
];

let localColor = PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];

const STORAGE_KEY = 'openarchflow:username';
let localName: string = (() => {
    try {
        return localStorage.getItem(STORAGE_KEY) || `Guest ${Math.floor(Math.random() * 9000) + 1000}`;
    } catch {
        return `Guest ${Math.floor(Math.random() * 9000) + 1000}`;
    }
})();

export const getLocalName = () => localName;
export const getLocalColor = () => localColor;

export const setLocalName = (name: string) => {
    localName = name.trim() || localName;
    try { localStorage.setItem(STORAGE_KEY, localName); } catch { /* ignore */ }
    // Broadcast the new name immediately via awareness
    const awareness = provider?.awareness;
    if (awareness) awareness.setLocalStateField('name', localName);
};

/**
 * Publishes this peer's cursor position to the awareness channel.
 */
export const publishCursor = (x: number, y: number) => {
    const awareness = provider?.awareness;
    if (!awareness) return;
    awareness.setLocalStateField('cursor', { x, y });
    awareness.setLocalStateField('color', localColor);
    awareness.setLocalStateField('name', localName);
};

export interface RemoteCursor {
    clientId: number;
    x: number;
    y: number;
    color: string;
    name: string;
}

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
                color: state.color ?? '#888',
                name: state.name ?? `Peer ${clientId}`,
            });
        }
    });
    return result;
};

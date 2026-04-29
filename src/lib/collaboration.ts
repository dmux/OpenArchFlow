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

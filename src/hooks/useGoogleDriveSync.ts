"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useDiagramStore } from "@/lib/store";
import { serializeAllDiagrams, validateAndParseImport } from "@/lib/persistence";
import {
  DriveApiError,
  downloadSyncFile,
  findSyncFile,
  getSyncFileMetadata,
  uploadSyncFile,
} from "@/lib/google-drive";

export interface GoogleDriveSyncHook {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncStatus: "idle" | "syncing" | "error" | "conflict";
  lastError: string | null;
  connect: () => void;
  disconnect: () => void;
  syncNow: () => Promise<void>;
}

const SESSION_KEY = "gd_access_token";
const CONFLICT_GRACE_MS = 5000;
const DEFAULT_LAYER = {
  id: "default",
  name: "Default",
  visible: true,
  locked: false,
  color: "#6366f1",
};

const GIS_SRC = "https://accounts.google.com/gsi/client";

function loadGisScript() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${GIS_SRC}"]`)) return;
  const s = document.createElement("script");
  s.src = GIS_SRC;
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
}

export function useGoogleDriveSync(): GoogleDriveSyncHook {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Hydrate token from sessionStorage after mount (never during SSR)
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) setAccessToken(stored);
  }, []);

  // Load Google Identity Services script imperatively — no JSX, no React tree
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) loadGisScript();
  }, []);

  const diagrams = useDiagramStore((s) => s.diagrams);
  const driveFileId = useDiagramStore((s) => s.driveFileId);
  const driveLastSyncedAt = useDiagramStore((s) => s.driveLastSyncedAt);
  const driveSyncStatus = useDiagramStore((s) => s.driveSyncStatus);
  const driveLastError = useDiagramStore((s) => s.driveLastError);
  const setDriveFileId = useDiagramStore((s) => s.setDriveFileId);
  const setDriveSyncResult = useDiagramStore((s) => s.setDriveSyncResult);
  const setDriveError = useDiagramStore((s) => s.setDriveError);
  const setDriveSyncStatus = useDiagramStore((s) => s.setDriveSyncStatus);

  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken;
  const fileIdRef = useRef(driveFileId);
  fileIdRef.current = driveFileId;
  const diagramsRef = useRef(diagrams);
  diagramsRef.current = diagrams;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCheckedOnLoad = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handleTokenExpiry = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setAccessToken(null);
    setDriveSyncStatus("idle");
    toast.warning("Google Drive session expired. Reconnect to resume sync.", {
      duration: 8000,
    });
  }, [setDriveSyncStatus]);

  const performUpload = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;

    setDriveSyncStatus("syncing");
    try {
      const content = serializeAllDiagrams(diagramsRef.current);
      let fileId = fileIdRef.current;

      // First-time upload: check if a sync file already exists in Drive
      if (!fileId) {
        const existing = await findSyncFile(token);
        if (existing) fileId = existing.id;
      }

      const newFileId = await uploadSyncFile(token, content, fileId);
      if (isMounted.current) setDriveSyncResult(newFileId, Date.now());
    } catch (err) {
      if (!isMounted.current) return;
      if (err instanceof DriveApiError && err.status === 401) {
        handleTokenExpiry();
        return;
      }
      const msg = err instanceof Error ? err.message : "Unknown error";
      setDriveError(msg);
      toast.error("Google Drive sync failed", {
        description: msg,
        action: { label: "Retry", onClick: () => performUpload() },
        duration: 8000,
      });
    }
  }, [handleTokenExpiry, setDriveSyncResult, setDriveError, setDriveSyncStatus]);

  const applyCloudVersion = useCallback(
    async (token: string, fileId: string) => {
      try {
        const raw = await downloadSyncFile(token, fileId);
        const parsed = validateAndParseImport(raw);
        if (parsed.type === "backup" && Array.isArray(parsed.data)) {
          const cloudDiagrams = Object.fromEntries(
            (parsed.data as Array<{ id: string } & object>).map((d) => [
              d.id,
              { ...d, layers: (d as { layers?: unknown }).layers ?? [DEFAULT_LAYER] },
            ]),
          );
          useDiagramStore.setState((state) => ({
            diagrams: cloudDiagrams as typeof state.diagrams,
            activeDiagramId:
              state.activeDiagramId && cloudDiagrams[state.activeDiagramId]
                ? state.activeDiagramId
                : Object.keys(cloudDiagrams)[0] ?? state.activeDiagramId,
          }));
          setDriveSyncResult(fileId, Date.now());
          toast.success("Cloud version applied successfully.");
        }
      } catch {
        toast.error("Failed to download cloud version. Your local data is unchanged.");
      }
    },
    [setDriveSyncResult],
  );

  // On-load conflict check — runs once when token + fileId are both available
  useEffect(() => {
    if (!accessToken || !driveFileId || hasCheckedOnLoad.current) return;
    hasCheckedOnLoad.current = true;

    const check = async () => {
      try {
        const meta = await getSyncFileMetadata(accessToken, driveFileId);
        const cloudTs = new Date(meta.modifiedTime).getTime();
        const localMaxTs = Object.values(diagrams).reduce(
          (max, d) => Math.max(max, d.lastModified ?? 0),
          0,
        );

        if (cloudTs > localMaxTs + CONFLICT_GRACE_MS) {
          toast("Cloud version is newer", {
            description: "Your Google Drive has changes not present in this browser.",
            duration: Infinity,
            action: {
              label: "Use Cloud",
              onClick: () => applyCloudVersion(accessToken, driveFileId),
            },
            cancel: {
              label: "Keep Local",
              onClick: () => performUpload(),
            },
          });
        } else if (localMaxTs > cloudTs + CONFLICT_GRACE_MS) {
          performUpload();
        }
      } catch (err) {
        if (err instanceof DriveApiError && err.status === 404) {
          setDriveFileId(null);
        }
      }
    };

    check();
  }, [accessToken, driveFileId]); // intentionally omits diagrams/callbacks — this check runs once on connect

  // Debounced auto-sync on diagram changes
  useEffect(() => {
    if (!accessToken) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      performUpload();
    }, 3000);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [diagrams, accessToken, performUpload]);

  const connect = useCallback(() => {
    const clientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();

    if (!clientId) {
      toast.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Add it to .env.local and restart the dev server.");
      return;
    }

    type GisOAuth2 = {
      initTokenClient: (cfg: {
        client_id: string;
        scope: string;
        callback: (res: {
          access_token?: string;
          error?: string;
          error_description?: string;
        }) => void;
      }) => { requestAccessToken: (cfg?: { prompt?: string }) => void };
    };

    const gis = (
      window as Window & { google?: { accounts?: { oauth2?: GisOAuth2 } } }
    ).google?.accounts?.oauth2;

    if (!gis) {
      toast.error("Google Identity Services script hasn't loaded yet. Please wait a moment and try again.");
      return;
    }

    const client = gis.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response) => {
        if (response.error) {
          const descriptions: Record<string, string> = {
            access_denied: "You denied Drive access. Grant it to enable sync.",
            popup_closed_by_user: "",
            popup_blocked_by_browser: "The sign-in popup was blocked. Allow popups for this site and try again.",
            invalid_client:
              "Invalid OAuth client (invalid_client). Check: 1) OAuth Consent Screen is configured in Google Cloud Console, 2) your email is in Test Users, 3) Google Drive API is enabled, 4) Client ID type is 'Web application'.",
          };
          const msg = descriptions[response.error];
          if (msg === undefined) {
            toast.error(`Google sign-in failed: ${response.error}${response.error_description ? ` — ${response.error_description}` : ""}`);
          } else if (msg) {
            toast.error(msg, { duration: 12000 });
          }
          return;
        }
        if (!response.access_token) {
          toast.error("Google sign-in returned no access token. Please try again.");
          return;
        }
        const token = response.access_token;
        sessionStorage.setItem(SESSION_KEY, token);
        setAccessToken(token);
        hasCheckedOnLoad.current = false;
        toast.success("Connected to Google Drive. Auto-sync is now active.");
      },
    });
    client.requestAccessToken({ prompt: "select_account" });
  }, []);

  const disconnect = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setAccessToken(null);
    setDriveFileId(null);
    setDriveSyncStatus("idle");
    useDiagramStore.setState({ driveLastSyncedAt: null, driveLastError: null });
    hasCheckedOnLoad.current = false;
    toast.info("Disconnected from Google Drive.");
  }, [setDriveFileId, setDriveSyncStatus]);

  return {
    isConnected: !!accessToken,
    isSyncing: driveSyncStatus === "syncing",
    lastSyncedAt: driveLastSyncedAt,
    syncStatus: driveSyncStatus,
    lastError: driveLastError,
    connect,
    disconnect,
    syncNow: performUpload,
  };
}

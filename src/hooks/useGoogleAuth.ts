"use client";

import { useCallback, useEffect } from "react";
import { useDiagramStore } from "@/lib/store";

const GIS_SRC = "https://accounts.google.com/gsi/client";

interface GisIdApi {
  initialize: (cfg: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    auto_select: boolean;
    cancel_on_tap_outside: boolean;
  }) => void;
  prompt: () => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GisIdApi } };
  }
}

interface CredentialResponse {
  credential: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

function loadGisScript() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${GIS_SRC}"]`)) return;
  const s = document.createElement("script");
  s.src = GIS_SRC;
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
}

function decodeJwt(token: string): JwtPayload {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64)) as JwtPayload;
}

export function useGoogleAuth() {
  const googleUser = useDiagramStore((s) => s.googleUser);
  const setGoogleUser = useDiagramStore((s) => s.setGoogleUser);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (clientId) loadGisScript();
  }, [clientId]);

  const signIn = useCallback(() => {
    if (!clientId) return;

    const init = () => {
      window.google?.accounts?.id?.initialize({
        client_id: clientId,
        callback: (response: CredentialResponse) => {
          try {
            const payload = decodeJwt(response.credential);
            setGoogleUser({
              sub: payload.sub,
              email: payload.email,
              name: payload.name,
              picture: payload.picture,
            });
          } catch {
            // invalid credential
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google?.accounts?.id?.prompt();
    };

    if (window.google?.accounts?.id) {
      init();
    } else {
      document
        .querySelector(`script[src="${GIS_SRC}"]`)
        ?.addEventListener("load", init, { once: true });
    }
  }, [clientId, setGoogleUser]);

  const signOut = useCallback(() => {
    window.google?.accounts?.id?.disableAutoSelect();
    setGoogleUser(null);
  }, [setGoogleUser]);

  return { user: googleUser, signIn, signOut, enabled: !!clientId };
}

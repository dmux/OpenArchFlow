"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Users, Link, Copy, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDiagramStore } from "@/lib/store";
import { toast } from "sonner";
import {
  getProvider,
  getLocalName,
  setLocalName,
  getLocalColor,
  preFetchRtcConfig,
  getPeers,
  Peer,
} from "@/lib/collaboration";
import { Input } from "@/components/ui/input";

export function CollaborateButton() {
  const collaborationRoomId = useDiagramStore(
    (state) => state.collaborationRoomId,
  );
  const setCollaborationRoomId = useDiagramStore(
    (state) => state.setCollaborationRoomId,
  );

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [displayName, setDisplayName] = useState(getLocalName);
  const [editingName, setEditingName] = useState(false);
  const localColor = React.useMemo(getLocalColor, []);

  // Pre-fetch ICE server config early so it is ready when the user starts a session
  useEffect(() => {
    preFetchRtcConfig();
  }, []);

  // Keep the peer list in sync with Yjs awareness
  useEffect(() => {
    const provider = getProvider();
    if (!provider) {
      setPeers([]);
      return;
    }

    const update = () => setPeers(getPeers());
    provider.awareness.on("change", update);
    update();

    return () => {
      provider.awareness.off("change", update);
    };
  }, [collaborationRoomId]);

  // Handle initial room from URL — runs once on mount only.
  // Also clears stale collaborationRoomId from localStorage when the URL
  // carries no room param (e.g. user closed the tab without stopping the session).
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get("room");
    const diagramId = urlParams.get("diagram");

    if (room) {
      if (room !== collaborationRoomId) {
        if (diagramId) {
          useDiagramStore.getState().setActiveDiagram(diagramId);
        }
        setCollaborationRoomId(room);
        toast.success("Joined collaboration room");
      }
      // If room === collaborationRoomId, onRehydrateStorage already re-inited the provider.
    } else if (collaborationRoomId) {
      // No room in URL but a stale room is persisted from a previous session.
      // Clear it so we don't silently stay connected to the old room.
      setCollaborationRoomId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally run only once on mount

  const startCollaboration = useCallback(() => {
    const roomId = crypto.randomUUID();
    const secretKey = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    const activeDiagramId = useDiagramStore.getState().activeDiagramId;

    setCollaborationRoomId(roomId);

    // Update URL: room in query, secret key in hash (not sent to signaling server)
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);
    if (activeDiagramId) {
      url.searchParams.set("diagram", activeDiagramId);
    }
    url.hash = secretKey;
    window.history.pushState({}, "", url);

    toast.success("Collaboration session started with E2EE");
  }, [setCollaborationRoomId]);

  const stopCollaboration = useCallback(() => {
    setCollaborationRoomId(null);

    // Clear URL
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    url.searchParams.delete("diagram");
    url.hash = "";
    window.history.pushState({}, "", url);

    toast.info("Collaboration session ended");
    setIsOpen(false);
  }, [setCollaborationRoomId]);

  const copyLink = useCallback(() => {
    const { collaborationRoomId, activeDiagramId } = useDiagramStore.getState();
    if (!collaborationRoomId) return;

    const url = new URL(window.location.href);
    url.searchParams.set("room", collaborationRoomId);
    if (activeDiagramId) {
      url.searchParams.set("diagram", activeDiagramId);
    }
    // Hash is preserved from window.location or can be retrieved
    url.hash = window.location.hash;

    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    toast.success("Invite link (E2EE) copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [collaborationRoomId]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant={collaborationRoomId ? "default" : "ghost"}
              size="icon"
              className={React.useMemo(() => {
                if (!collaborationRoomId)
                  return "h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground";
                return "h-9 w-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white relative shadow-lg";
              }, [collaborationRoomId])}
            >
              <Users className="h-4.5 w-4.5" />
              {collaborationRoomId && peers.length > 1 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-[10px] font-bold px-1 rounded-full border-2 border-background">
                  {peers.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          <p className="font-medium">Collaboration</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side="right"
        align="center"
        sideOffset={15}
        className="w-80 p-4 rounded-2xl shadow-2xl border-border bg-background/95 backdrop-blur-xl"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Realtime Collaboration</h3>
            {collaborationRoomId && (
              <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Active
              </span>
            )}
          </div>

          {/* Display name — always visible */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your Name
            </label>
            {editingName ? (
              <Input
                autoFocus
                value={displayName}
                maxLength={32}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => {
                  const trimmed = displayName.trim();
                  if (trimmed) {
                    setLocalName(trimmed);
                    setDisplayName(trimmed);
                  } else setDisplayName(getLocalName());
                  setEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setDisplayName(getLocalName());
                    setEditingName(false);
                  }
                }}
                className="h-8 text-xs rounded-xl"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="flex items-center gap-2 px-3 h-8 bg-muted/50 rounded-xl border border-border text-xs text-left w-full hover:bg-muted transition-colors group"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: localColor }}
                />
                <span className="flex-1 truncate font-medium">
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  edit
                </span>
              </button>
            )}
          </div>

          {!collaborationRoomId ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Share this diagram with others to design together in real-time.
                Everything is P2P and encrypted for your privacy.
              </p>
              <Button
                onClick={startCollaboration}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10"
              >
                <Users className="mr-2 h-4 w-4" />
                Start Collaborating
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Invite Link
                </label>
                <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-xl border border-border">
                  <div className="flex-1 truncate text-xs font-mono px-2 opacity-70">
                    {collaborationRoomId.substring(0, 18)}...
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg"
                    onClick={copyLink}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Peer list */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {peers.length} {peers.length === 1 ? "Person" : "People"} in
                  this session
                </label>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                  {peers.map((peer) => (
                    <div
                      key={peer.clientId}
                      className="flex items-center gap-2 px-3 h-8 bg-muted/40 rounded-xl text-xs"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: peer.color }}
                      />
                      <span className="flex-1 truncate font-medium">
                        {peer.name}
                      </span>
                      {peer.isLocal && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          you
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-[10px] text-muted-foreground">
                  End-to-End Encrypted
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:bg-destructive/10 rounded-lg h-8"
                  onClick={stopCollaboration}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  End Session
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

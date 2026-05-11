"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  CloudUpload,
  HardDriveUpload,
  CloudOff,
  Loader2,
  RefreshCw,
  LogOut,
} from "lucide-react";
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
import { type GoogleDriveSyncHook } from "@/hooks/useGoogleDriveSync";

interface GoogleAccountButtonProps {
  driveSync: GoogleDriveSyncHook;
  btnCls: string;
  icoSize: string;
}

function formatRelativeTime(ts: number | null): string {
  if (!ts) return "Never";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "Just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function GoogleAccountButton({ driveSync, btnCls, icoSize }: GoogleAccountButtonProps) {
  const googleUser = useDiagramStore((s) => s.googleUser);
  const [isOpen, setIsOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  // Refresh relative time every 30 s while popover is open
  useEffect(() => {
    if (!driveSync.isConnected) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [driveSync.isConnected]);

  const handleConnect = useCallback(() => {
    setIsOpen(false);
    driveSync.connect();
  }, [driveSync]);

  const handleDisconnect = useCallback(() => {
    setIsOpen(false);
    driveSync.disconnect();
  }, [driveSync]);

  const driveIcon = driveSync.isSyncing
    ? <Loader2 className={`${icoSize} animate-spin`} />
    : driveSync.syncStatus === "error"
    ? <CloudOff className={icoSize} />
    : <HardDriveUpload className={icoSize} />;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            {googleUser ? (
              <Button
                variant="ghost"
                size="icon"
                className={`${btnCls} hover:bg-accent p-0.5 overflow-hidden relative`}
              >
                <Image
                  src={googleUser.picture}
                  alt={googleUser.name}
                  width={36}
                  height={36}
                  className="rounded-full w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {/* Drive status dot */}
                {driveSync.isConnected && (
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${
                      driveSync.syncStatus === "error"
                        ? "bg-destructive"
                        : driveSync.isSyncing
                        ? "bg-sky-400 animate-pulse"
                        : "bg-green-500"
                    }`}
                  />
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className={`${btnCls} hover:bg-accent hover:text-accent-foreground ${
                  driveSync.syncStatus === "error" ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {driveSync.isConnected ? driveIcon : <CloudUpload className={icoSize} />}
              </Button>
            )}
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          <p className="font-medium">
            {googleUser ? googleUser.name : "Connect Google Account"}
          </p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side="right"
        align="center"
        sideOffset={15}
        className="w-72 p-4 rounded-2xl shadow-2xl border-border bg-background/95 backdrop-blur-xl"
      >
        {!driveSync.isConnected ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <CloudUpload className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Google Account</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sign in with Google to sync your diagrams to Drive. Only files
              created by this app are ever accessed.
            </p>
            <Button
              onClick={handleConnect}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white rounded-xl h-10 text-sm"
            >
              <CloudUpload className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* User identity */}
            {googleUser && (
              <div className="flex items-center gap-3">
                <Image
                  src={googleUser.picture}
                  alt={googleUser.name}
                  width={36}
                  height={36}
                  className="rounded-full object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{googleUser.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{googleUser.email}</p>
                </div>
              </div>
            )}

            {/* Drive status */}
            <div className="rounded-xl border border-border p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Google Drive
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last sync</span>
                <span className="font-medium">
                  {driveSync.isSyncing ? "Syncing…" : formatRelativeTime(driveSync.lastSyncedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Sync file</span>
                <span className="font-mono text-muted-foreground text-[10px]">
                  OpenArchFlow_Sync.json
                </span>
              </div>
              {driveSync.syncStatus === "error" && driveSync.lastError && (
                <p className="text-[11px] text-destructive leading-relaxed bg-destructive/10 rounded-lg p-2">
                  {driveSync.lastError}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 border-t border-border pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs rounded-lg h-8"
                onClick={driveSync.syncNow}
                disabled={driveSync.isSyncing}
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${driveSync.isSyncing ? "animate-spin" : ""}`} />
                Sync Now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs text-destructive hover:bg-destructive/10 rounded-lg h-8"
                onClick={handleDisconnect}
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

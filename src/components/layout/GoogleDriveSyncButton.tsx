"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CloudUpload, CloudOff, HardDriveUpload, Loader2, RefreshCw, LogOut } from "lucide-react";
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
import { type GoogleDriveSyncHook } from "@/hooks/useGoogleDriveSync";

interface GoogleDriveSyncButtonProps {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncStatus: GoogleDriveSyncHook["syncStatus"];
  lastError: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
}

function formatRelativeTime(ts: number | null): string {
  if (!ts) return "Never";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function GoogleDriveSyncButton({
  isConnected,
  isSyncing,
  lastSyncedAt,
  syncStatus,
  lastError,
  onConnect,
  onDisconnect,
  onSyncNow,
}: GoogleDriveSyncButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  // Refresh relative time display every 30 seconds
  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [isConnected]);

  const handleConnect = useCallback(() => {
    setIsOpen(false);
    onConnect();
  }, [onConnect]);

  const handleDisconnect = useCallback(() => {
    setIsOpen(false);
    onDisconnect();
  }, [onDisconnect]);

  const buttonClass = React.useMemo(() => {
    const base = "h-9 w-9 md:h-7 md:w-7 rounded-lg";
    if (!isConnected)
      return `${base} text-muted-foreground hover:text-foreground`;
    if (syncStatus === "error")
      return `${base} text-destructive hover:bg-destructive/10`;
    return `${base} text-sky-500 hover:bg-sky-500/10`;
  }, [isConnected, syncStatus]);

  const icon = React.useMemo(() => {
    if (!isConnected) return <CloudUpload className="h-4 w-4 md:h-3.5 md:w-3.5" />;
    if (isSyncing) return <Loader2 className="h-4 w-4 md:h-3.5 md:w-3.5 animate-spin" />;
    if (syncStatus === "error") return <CloudOff className="h-4 w-4 md:h-3.5 md:w-3.5" />;
    return <HardDriveUpload className="h-4 w-4 md:h-3.5 md:w-3.5" />;
  }, [isConnected, isSyncing, syncStatus]);

  const tooltipLabel = React.useMemo(() => {
    if (!isConnected) return "Google Drive Sync";
    if (isSyncing) return "Syncing…";
    if (syncStatus === "error") return "Sync error — click to review";
    return "Google Drive Sync";
  }, [isConnected, isSyncing, syncStatus]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className={buttonClass}>
              {icon}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          <p className="font-medium">{tooltipLabel}</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side="right"
        align="center"
        sideOffset={15}
        className="w-72 p-4 rounded-2xl shadow-2xl border-border bg-background/95 backdrop-blur-xl"
      >
        {!isConnected ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <CloudUpload className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Google Drive Sync</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your diagrams auto-save to your personal Google Drive. Only files
              created by this app are ever accessed.
            </p>
            <Button
              onClick={handleConnect}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white rounded-xl h-10 text-sm"
            >
              <CloudUpload className="mr-2 h-4 w-4" />
              Connect Google Drive
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Google Drive Sync</h3>
              <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                Active
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Last Sync
                </span>
                <span className="text-xs font-medium">
                  {isSyncing ? "Syncing…" : formatRelativeTime(lastSyncedAt)}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sync File
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  OpenArchFlow_Sync.json
                </span>
              </div>

              {syncStatus === "error" && lastError && (
                <div className="p-2.5 bg-destructive/10 rounded-xl border border-destructive/20">
                  <p className="text-[11px] text-destructive leading-relaxed">
                    {lastError}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs rounded-lg h-8"
                onClick={onSyncNow}
                disabled={isSyncing}
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                Sync Now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs text-destructive hover:bg-destructive/10 rounded-lg h-8"
                onClick={handleDisconnect}
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Upload, Trash2, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MiniStackConfig } from "@/lib/ministack/types";
import { s3ListObjects, s3PutObject, s3DeleteObject, type S3Object } from "@/lib/ministack/browser-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function S3Console({ config, resourceId }: { config: MiniStackConfig; resourceId: string }) {
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadKey, setUploadKey] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await s3ListObjects(config, resourceId);
      setObjects(data.objects);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to list objects");
    } finally {
      setLoading(false);
    }
  }, [config, resourceId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async () => {
    if (!uploadKey.trim()) { toast.error("Key is required"); return; }
    setUploading(true);
    try {
      await s3PutObject(config, resourceId, uploadKey, uploadContent);
      toast.success(`Uploaded ${uploadKey}`);
      setUploadKey("");
      setUploadContent("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await s3DeleteObject(config, resourceId, key);
      toast.success(`Deleted ${key}`);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-mono">s3://{resourceId}</span>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 gap-1 text-xs">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <ScrollArea className="flex-1 rounded-lg border border-border">
        <div className="p-2 space-y-1">
          {objects.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground text-center py-6">Bucket is empty</p>
          )}
          {objects.map((obj) => (
            <div key={obj.key} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent/50 group">
              <div className="flex items-center gap-2 min-w-0">
                <File className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs truncate">{obj.key}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{(obj.size / 1024).toFixed(1)}KB</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(obj.key)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs font-medium">Upload object</p>
        <Input
          placeholder="object-key.txt"
          value={uploadKey}
          onChange={(e) => setUploadKey(e.target.value)}
          className="text-xs h-7"
        />
        <textarea
          placeholder="Content (text or JSON)"
          value={uploadContent}
          onChange={(e) => setUploadContent(e.target.value)}
          className="w-full text-xs h-16 p-2 rounded border border-border bg-background resize-none font-mono"
        />
        <Button size="sm" onClick={handleUpload} disabled={uploading} className="gap-1.5 text-xs">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          Upload
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * Upload a markdown/txt note into the signed-in user's knowledge base.
 * Server chunks + embeds it into Atlas (POST /api/upload). The "share" switch
 * controls whether friends can query it (shared === true).
 */
export function UploadNotes() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [shared, setShared] = useState(true);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("shared", String(shared));
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = (await res.json()) as {
        error?: string;
        chunks?: number;
        path?: string;
      };
      if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`);
      toast.success(
        `Uploaded ${json.path} — ${json.chunks} chunk${json.chunks === 1 ? "" : "s"} embedded${shared ? ", shared with friends" : ""}.`,
      );
      setFile(null);
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Upload notes"
      >
        <FileUp className="size-4 sm:mr-1.5" aria-hidden="true" />
        <span className="hidden sm:inline">Upload</span>
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-lg">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Upload notes</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                .md / .txt — chunked &amp; embedded into your vault.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mr-1 -mt-1 size-7 p-0"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="size-3.5" aria-hidden="true" />
            </Button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".md,.markdown,.txt"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full justify-start"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-1.5 size-3.5" aria-hidden="true" />
            <span className="truncate">{file ? file.name : "Choose a file…"}</span>
          </Button>

          <div className="mt-3 flex items-center justify-between gap-2">
            <Label htmlFor="upload-shared" className="text-xs">
              Share with friends
            </Label>
            <Switch
              id="upload-shared"
              checked={shared}
              onCheckedChange={setShared}
            />
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Shared notes are queryable when someone asks about you.
          </p>

          <Button
            type="button"
            size="sm"
            className="mt-3 w-full"
            disabled={!file || busy}
            onClick={handleUpload}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
                Embedding…
              </>
            ) : (
              "Upload & embed"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

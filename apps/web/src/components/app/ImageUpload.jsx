"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

export default function ImageUpload({ value, onChange, label, disabled }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const openPicker = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, or WebP images allowed");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File exceeds 5MB limit");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/business/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.detail || "Upload failed");
        return;
      }
      onChange?.(data.url || "");
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange?.("");
  };

  return (
    <div>
      {label ? (
        <div className="text-sm font-medium text-zinc-700 mb-1.5">{label}</div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFile}
      />
      {value ? (
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openPicker()}
          className="relative group rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 cursor-pointer"
          style={{ maxHeight: 220 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            style={{
              width: "100%",
              maxHeight: 220,
              objectFit: "cover",
              display: "block",
            }}
          />
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 bg-white/95 hover:bg-white text-zinc-700 rounded-full w-7 h-7 flex items-center justify-center shadow"
            aria-label="Remove image"
          >
            <X size={14} />
          </button>
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/85 text-white text-xs px-3 py-1.5 rounded-full font-medium">
            Change image
          </div>
          {uploading ? (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 className="animate-spin text-zinc-700" />
            </div>
          ) : null}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openPicker()}
          className="flex flex-col items-center justify-center gap-1 py-8 px-4 border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-400 transition-colors cursor-pointer text-center"
        >
          {uploading ? (
            <>
              <Loader2 className="animate-spin text-zinc-500" />
              <span className="text-xs text-zinc-500 mt-1">Uploading…</span>
            </>
          ) : (
            <>
              <ImagePlus className="text-zinc-400" size={28} />
              <span className="text-sm font-medium text-zinc-700">Click to upload image</span>
              <span className="text-xs text-zinc-500">PNG, JPG, WebP up to 5MB</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

// Design Studio — photo strip / overlay editor for a single booking.
//
// Loaded with next/dynamic from the booking dialog so the canvas renderer and
// template library stay out of the dashboard's initial bundle.
//
// The preview and the exported file come from the same renderer (see
// lib/design/render.js), so what the operator sees is what prints. Only the
// photo slots differ: labelled placeholders on screen, real transparency on
// export, because booth software composites the guest photos behind this PNG.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, RotateCcw, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  DEFAULT_FORMAT_ID,
  DESIGN_TOKENS,
  FONT_KEYS,
  PRINT_FORMATS,
  formatPixelSize,
  normalizeDesignSpec,
} from '@/lib/design/specs';
import { resolveSpecTokens } from '@/lib/design/tokens';
import { renderDesign } from '@/lib/design/render';
import { STARTER_TEMPLATES } from '@/lib/design/templates';

const FONT_LABELS = {
  elegant: 'Elegant serif',
  classic: 'Classic serif',
  modern: 'Modern sans',
  clean: 'Clean sans',
  script: 'Script',
  bold: 'Bold display',
};

function downloadFilename({ booking, formatId }) {
  const name = String(booking?.customer_name || 'design')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'design';
  const date = String(booking?.booking_date || '').slice(0, 10) || 'template';
  return `${name}-${date}-${formatId}.png`;
}

export default function DesignStudio({ booking, business }) {
  const [templateId, setTemplateId] = useState(STARTER_TEMPLATES[0].id);
  const [spec, setSpec] = useState(() => normalizeDesignSpec(STARTER_TEMPLATES[0].spec));
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef(null);

  // Tokens resolve against the real booking, so the operator sees the finished
  // strip for this event rather than placeholder text.
  const resolved = useMemo(
    () => resolveSpecTokens(spec, { booking, business }),
    [spec, booking, business],
  );

  const pixelSize = useMemo(() => formatPixelSize(resolved.format), [resolved.format]);

  // Draw the preview whenever the design changes.
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const { width, height } = pixelSize;
    // Cap the backing store: a 1200x1800 canvas redrawn on every keystroke is
    // wasteful, and the preview is displayed far smaller than print size.
    const scale = Math.min(1, 700 / height);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderDesign(ctx, resolved, { width: canvas.width, height: canvas.height, mode: 'preview' });
  }, [resolved, pixelSize]);

  const applyTemplate = useCallback((id) => {
    const t = STARTER_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setSpec(normalizeDesignSpec(t.spec));
  }, []);

  const patch = useCallback((updater) => {
    setSpec((prev) => normalizeDesignSpec(updater(prev)));
  }, []);

  const patchText = useCallback(
    (index, changes) => {
      patch((prev) => ({
        ...prev,
        text: prev.text.map((t, i) => (i === index ? { ...t, ...changes } : t)),
      }));
    },
    [patch],
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Render at full print resolution into an offscreen canvas. `mode: export`
      // punches real transparent holes where the photos go — the whole point of
      // the file, and the difference between a usable overlay and a flat image.
      const { width, height } = pixelSize;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      renderDesign(ctx, resolved, { width, height, mode: 'export' });

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png');
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename({ booking, formatId: resolved.format });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Surfaced by the caller's toast; keep the studio open so work isn't lost.
      console.error('[DesignStudio] export failed:', err?.message);
      throw err;
    } finally {
      setExporting(false);
    }
  }, [pixelSize, resolved, booking]);

  const activeFormat = PRINT_FORMATS[resolved.format] || PRINT_FORMATS[DEFAULT_FORMAT_ID];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Preview */}
      <div className="order-2 lg:order-1">
        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-border bg-[repeating-conic-gradient(#f4f4f5_0%_25%,#ffffff_0%_50%)] bg-[length:20px_20px] p-6">
          <canvas
            ref={previewRef}
            className="max-h-[560px] w-auto rounded-lg shadow-lg"
            style={{ imageRendering: 'auto' }}
            aria-label="Design preview"
          />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {activeFormat.label} · {pixelSize.width} × {pixelSize.height}px at 300 DPI ·
          {' '}{activeFormat.slots.length} photo {activeFormat.slots.length === 1 ? 'slot' : 'slots'}
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Shaded areas are where guest photos appear — they export fully transparent.
        </p>
      </div>

      {/* Controls */}
      <div className="order-1 space-y-5 lg:order-2 lg:max-h-[620px] lg:overflow-y-auto lg:pr-1">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Template
          </Label>
          <Select value={templateId} onValueChange={applyTemplate}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STARTER_TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Print size
          </Label>
          <Select
            value={resolved.format}
            onValueChange={(v) => patch((prev) => ({ ...prev, format: v }))}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PRINT_FORMATS).map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 rounded-xl border border-border p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Background
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Gradient</span>
            <Switch
              checked={resolved.background.type === 'gradient'}
              onCheckedChange={(on) =>
                patch((prev) => ({
                  ...prev,
                  background: { ...prev.background, type: on ? 'gradient' : 'solid' },
                }))
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Background colour"
              value={resolved.background.color}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  background: { ...prev.background, color: e.target.value },
                }))
              }
              className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
            />
            {resolved.background.type === 'gradient' ? (
              <input
                type="color"
                aria-label="Gradient end colour"
                value={resolved.background.colorTo}
                onChange={(e) =>
                  patch((prev) => ({
                    ...prev,
                    background: { ...prev.background, colorTo: e.target.value },
                  }))
                }
                className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Border
            </span>
            <Switch
              checked={resolved.border.enabled}
              onCheckedChange={(on) =>
                patch((prev) => ({ ...prev, border: { ...prev.border, enabled: on } }))
              }
            />
          </div>
          {resolved.border.enabled ? (
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Border colour"
                value={resolved.border.color}
                onChange={(e) =>
                  patch((prev) => ({ ...prev, border: { ...prev.border, color: e.target.value } }))
                }
                className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
              />
              <input
                type="range"
                aria-label="Border thickness"
                min="2"
                max="30"
                value={Math.round(resolved.border.width * 1000)}
                onChange={(e) =>
                  patch((prev) => ({
                    ...prev,
                    border: { ...prev.border, width: Number(e.target.value) / 1000 },
                  }))
                }
                className="flex-1 accent-rose-600"
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-3 rounded-xl border border-border p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Photo corners
          </div>
          <input
            type="range"
            aria-label="Photo corner rounding"
            min="0"
            max="100"
            value={Math.round(resolved.slotStyle.radius * 100)}
            onChange={(e) =>
              patch((prev) => ({
                ...prev,
                slotStyle: { ...prev.slotStyle, radius: Number(e.target.value) / 100 },
              }))
            }
            className="w-full accent-rose-600"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Text
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() =>
                patch((prev) => ({
                  ...prev,
                  text: [
                    ...prev.text,
                    { content: 'New text', x: 0.5, y: 0.75, size: 0.02, color: '#111111', font: 'clean', align: 'center' },
                  ],
                }))
              }
            >
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>

          {spec.text.map((item, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-start gap-2">
                <Input
                  value={item.content}
                  onChange={(e) => patchText(i, { content: e.target.value })}
                  className="h-9 text-sm"
                  aria-label={`Text ${i + 1}`}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-rose-600"
                  onClick={() =>
                    patch((prev) => ({ ...prev, text: prev.text.filter((_, k) => k !== i) }))
                  }
                  aria-label={`Remove text ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {/* Preview of what this line resolves to, so tokens are legible. */}
              {item.content.includes('{{') ? (
                <div className="truncate text-[11px] text-muted-foreground">
                  → {resolved.text.find((_, k) => k === i)?.content || '(empty)'}
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`Text ${i + 1} colour`}
                  value={item.color}
                  onChange={(e) => patchText(i, { color: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                />
                <Select value={item.font} onValueChange={(v) => patchText(i, { font: v })}>
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {FONT_LABELS[k] || k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-8 shrink-0">Size</span>
                <input
                  type="range"
                  aria-label={`Text ${i + 1} size`}
                  min="8"
                  max="90"
                  value={Math.round(item.size * 1000)}
                  onChange={(e) => patchText(i, { size: Number(e.target.value) / 1000 })}
                  className="flex-1 accent-rose-600"
                />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-8 shrink-0">Y</span>
                <input
                  type="range"
                  aria-label={`Text ${i + 1} vertical position`}
                  min="0"
                  max="100"
                  value={Math.round(item.y * 100)}
                  onChange={(e) => patchText(i, { y: Number(e.target.value) / 100 })}
                  className="flex-1 accent-rose-600"
                />
              </div>
            </div>
          ))}

          <details className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
              Available booking tags
            </summary>
            <div className="mt-2 space-y-1">
              {Object.entries(DESIGN_TOKENS).map(([token, label]) => (
                <div key={token} className="flex items-center justify-between gap-2 text-[11px]">
                  <code className="rounded bg-muted px-1.5 py-0.5">{token}</code>
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </details>
        </div>

        <div className="flex gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={() => applyTemplate(templateId)}
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button
            type="button"
            className="flex-1 gap-1.5 bg-rose-600 hover:bg-rose-700"
            disabled={exporting}
            onClick={() => {
              handleExport().catch(() => {
                // Export is best-effort; keep the studio open so nothing is lost.
              });
            }}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download PNG
          </Button>
        </div>
      </div>
    </div>
  );
}

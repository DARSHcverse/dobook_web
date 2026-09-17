'use client';

// Monogram editor — the decorative initials graphic for 360 booths, mirror
// booths and backdrops. Sibling of the photo-strip editor; kept separate because
// a monogram has no photo slots and exports on a transparent canvas.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FONT_KEYS } from '@/lib/design/specs';
import { buildTokenValues } from '@/lib/design/tokens';
import {
  FRAME_STYLES,
  MONOGRAM_SIZES,
  MONOGRAM_TEMPLATES,
  getMonogramSize,
  monogramPixelSize,
  normalizeMonogramSpec,
  renderMonogram,
  resolveMonogramTokens,
} from '@/lib/design/monogram';

const FONT_LABELS = {
  elegant: 'Elegant serif',
  classic: 'Classic serif',
  modern: 'Modern sans',
  clean: 'Clean sans',
  script: 'Script',
  bold: 'Bold display',
};

function filename({ booking, sizeId }) {
  const name =
    String(booking?.customer_name || 'monogram')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'monogram';
  const date = String(booking?.booking_date || '').slice(0, 10) || 'template';
  return `${name}-${date}-monogram-${sizeId}.png`;
}

export default function MonogramPanel({ booking, business }) {
  const [templateId, setTemplateId] = useState(MONOGRAM_TEMPLATES[0].id);
  const [spec, setSpec] = useState(() => normalizeMonogramSpec(MONOGRAM_TEMPLATES[0].spec));
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef(null);

  const tokenValues = useMemo(
    () => buildTokenValues({ booking, business }),
    [booking, business],
  );
  const resolved = useMemo(
    () => resolveMonogramTokens(spec, tokenValues),
    [spec, tokenValues],
  );
  const pixelSize = useMemo(() => monogramPixelSize(resolved.size), [resolved.size]);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const { width, height } = pixelSize;
    // Monograms are large (up to 3000px square); scale the preview down rather
    // than allocating a full-size backing store on every keystroke.
    const scale = Math.min(1, 520 / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderMonogram(ctx, resolved, { width: canvas.width, height: canvas.height, mode: 'preview' });
  }, [resolved, pixelSize]);

  const applyTemplate = useCallback((id) => {
    const t = MONOGRAM_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setSpec(normalizeMonogramSpec(t.spec));
  }, []);

  const patch = useCallback((changes) => {
    setSpec((prev) => normalizeMonogramSpec({ ...prev, ...changes }));
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { width, height } = pixelSize;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      // `export` skips the preview checkerboard, so a transparent monogram
      // really is transparent in the file.
      renderMonogram(ctx, resolved, { width, height, mode: 'export' });

      const blob = await new Promise((res, rej) => {
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('Export failed'))), 'image/png');
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename({ booking, sizeId: resolved.size });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[MonogramPanel] export failed:', err?.message);
    } finally {
      setExporting(false);
    }
  }, [pixelSize, resolved, booking]);

  const sizeMeta = getMonogramSize(resolved.size);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="order-2 lg:order-1">
        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-border bg-muted/30 p-6">
          <canvas
            ref={previewRef}
            className="max-h-[520px] w-auto rounded-lg shadow-lg"
            aria-label="Monogram preview"
          />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {sizeMeta.label} · {pixelSize.width} × {pixelSize.height}px at 300 DPI
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {resolved.transparent
            ? 'Exports with a transparent background for 360 booths, mirror booths and overlays.'
            : 'Exports on a solid background.'}
        </p>
      </div>

      <div className="order-1 space-y-5 lg:order-2 lg:max-h-[620px] lg:overflow-y-auto lg:pr-1">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Style
          </Label>
          <Select value={templateId} onValueChange={applyTemplate}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONOGRAM_TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Size
          </Label>
          <Select value={resolved.size} onValueChange={(v) => patch({ size: v })}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(MONOGRAM_SIZES).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2.5 rounded-xl border border-border p-3">
          <Label
            htmlFor="monogram-initials"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Initials
          </Label>
          <Input
            id="monogram-initials"
            value={spec.initials}
            onChange={(e) => patch({ initials: e.target.value })}
            className="h-9 text-sm"
          />
          {spec.initials.includes('{{') ? (
            <p className="text-[11px] text-muted-foreground">→ {resolved.initials || '(empty)'}</p>
          ) : null}
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Initials colour"
              value={spec.initialsColor}
              onChange={(e) => patch({ initialsColor: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
            />
            <Select value={spec.initialsFont} onValueChange={(v) => patch({ initialsFont: v })}>
              <SelectTrigger className="h-9 flex-1 text-xs">
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
            <span className="w-12 shrink-0">Size</span>
            <input
              type="range"
              aria-label="Initials size"
              min="60"
              max="420"
              value={Math.round(spec.initialsSize * 1000)}
              onChange={(e) => patch({ initialsSize: Number(e.target.value) / 1000 })}
              className="flex-1 accent-rose-600"
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-12 shrink-0">Spacing</span>
            <input
              type="range"
              aria-label="Initials letter spacing"
              min="0"
              max="80"
              value={Math.round(spec.initialsSpacing * 1000)}
              onChange={(e) => patch({ initialsSpacing: Number(e.target.value) / 1000 })}
              className="flex-1 accent-rose-600"
            />
          </div>
        </div>

        <div className="space-y-2.5 rounded-xl border border-border p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Frame
          </div>
          <Select value={spec.frame} onValueChange={(v) => patch({ frame: v })}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FRAME_STYLES).map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {spec.frame !== 'none' ? (
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Frame colour"
                value={spec.frameColor}
                onChange={(e) => patch({ frameColor: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
              />
              <input
                type="range"
                aria-label="Frame thickness"
                min="2"
                max="24"
                value={Math.round(spec.frameWidth * 1000)}
                onChange={(e) => patch({ frameWidth: Number(e.target.value) / 1000 })}
                className="flex-1 accent-rose-600"
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-2.5 rounded-xl border border-border p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Above / below
          </div>
          <Input
            value={spec.topText}
            onChange={(e) => patch({ topText: e.target.value })}
            placeholder="Above the initials"
            className="h-9 text-sm"
            aria-label="Text above initials"
          />
          <Input
            value={spec.bottomText}
            onChange={(e) => patch({ bottomText: e.target.value })}
            placeholder="Below the initials"
            className="h-9 text-sm"
            aria-label="Text below initials"
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Supporting text colour"
              value={spec.subColor}
              onChange={(e) => patch({ subColor: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
            />
            <div className="flex flex-1 items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Uppercase</span>
              <Switch
                checked={spec.subUppercase}
                onCheckedChange={(on) => patch({ subUppercase: on })}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Transparent background
          </span>
          <Switch
            checked={spec.transparent}
            onCheckedChange={(on) => patch({ transparent: on })}
          />
        </div>
        {!spec.transparent ? (
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Background colour"
              value={spec.background}
              onChange={(e) => patch({ background: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
            />
            <span className="text-xs text-muted-foreground">Background colour</span>
          </div>
        ) : null}

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
              handleExport().catch(() => {});
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

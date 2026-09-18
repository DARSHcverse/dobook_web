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
import { Download, Loader2, RotateCcw, Save, Send, Sparkles, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import MonogramPanel from '@/components/design/MonogramPanel';
import LayoutEditor from '@/components/design/LayoutEditor';
import { toLayoutSpec } from '@/lib/design/layout';
import { LAYOUT_TEMPLATES, getLayoutTemplate } from '@/lib/design/layoutTemplates';
import { loadSpecImages, renderLayout } from '@/lib/design/renderLayout';
import { formatPixelSize as layoutPixelSize } from '@/lib/design/specs';

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
  // A monogram is a different artifact from a strip (no photo slots, square,
  // transparent), so it gets its own panel rather than more controls here.
  const [mode, setMode] = useState('strip');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiName, setAiName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState([]);
  const [sending, setSending] = useState(false);
  // v2 free-layout editor: its own spec, separate from the v1 strip configurator
  // which is kept so existing saved designs still open.
  const [layoutSpec, setLayoutSpec] = useState(() =>
    toLayoutSpec(getLayoutTemplate('website_header').spec),
  );
  const [layoutTemplateId, setLayoutTemplateId] = useState('website_header');
  const [layoutExporting, setLayoutExporting] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState([]);
  const [layoutSaving, setLayoutSaving] = useState(false);
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

  const loadSaved = useCallback(async () => {
    try {
      const res = await axios.get('/api/design/templates');
      setSaved(Array.isArray(res.data) ? res.data.filter((t) => t.kind !== 'monogram') : []);
    } catch {
      // A missing migration or a load failure just means an empty library.
      setSaved([]);
    }
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const applyTemplate = useCallback((id) => {
    const t = STARTER_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setAiName('');
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

  // Claude returns a design *specification*, not an image; the renderer draws
  // it. See lib/design/aiDesign.js for why that is the right split here.
  const handleGenerate = useCallback(async () => {
    const description = prompt.trim();
    if (description.length < 6) {
      toast.error('Describe the design in a few more words.');
      return;
    }
    setGenerating(true);
    try {
      const res = await axios.post('/api/design/generate', {
        description,
        event_type: booking?.event_type || '',
      });
      const generated = res?.data?.spec;
      if (!generated) throw new Error('No design returned');
      setSpec(normalizeDesignSpec(generated));
      setAiName(String(res?.data?.name || '').trim());
      setTemplateId('');
      toast.success(`Generated “${res?.data?.name || 'design'}”`);
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || 'Could not generate a design. Please try again.',
      );
    } finally {
      setGenerating(false);
    }
  }, [prompt, booking?.event_type]);

  // Renders the current design at full print resolution. Used by download,
  // and by "send for approval" to produce the emailed preview image.
  const renderToCanvas = useCallback(() => {
    const { width, height } = pixelSize;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    renderDesign(ctx, resolved, { width, height, mode: 'export' });
    return canvas;
  }, [pixelSize, resolved]);

  const handleSave = useCallback(async () => {
    const name = window.prompt('Save this design as:', aiName || 'My design');
    if (!name || !name.trim()) return;
    setSaving(true);
    try {
      await axios.post('/api/design/templates', {
        name: name.trim(),
        kind: 'strip',
        spec,
        booking_id: booking?.id || null,
      });
      toast.success('Design saved to your library');
      loadSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not save this design.');
    } finally {
      setSaving(false);
    }
  }, [aiName, spec, booking?.id, loadSaved]);

  const handleSend = useCallback(async () => {
    if (!booking?.id) {
      toast.error('Open this from a booking to send it to the customer.');
      return;
    }
    setSending(true);
    try {
      // Email clients cannot run a canvas, so send a rendered PNG the server
      // stores and links to. Scaled down — this is a preview, not the print file.
      const full = renderToCanvas();
      const scale = Math.min(1, 900 / Math.max(full.width, full.height));
      const out = document.createElement('canvas');
      out.width = Math.round(full.width * scale);
      out.height = Math.round(full.height * scale);
      const octx = out.getContext('2d');
      // Flatten onto white: a transparent PNG reads as a black box in many
      // email clients, which would look broken to the customer.
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(full, 0, 0, out.width, out.height);

      await axios.post('/api/design/send', {
        booking_id: booking.id,
        kind: 'strip',
        spec,
        preview: out.toDataURL('image/png'),
      });
      toast.success('Sent to the customer for approval');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not send the design.');
    } finally {
      setSending(false);
    }
  }, [booking?.id, renderToCanvas, spec]);

  const loadSavedLayouts = useCallback(async () => {
    try {
      const res = await axios.get('/api/design/templates');
      setSavedLayouts(Array.isArray(res.data) ? res.data.filter((t) => t.kind === 'layout') : []);
    } catch {
      setSavedLayouts([]);
    }
  }, []);

  useEffect(() => {
    loadSavedLayouts();
  }, [loadSavedLayouts]);

  const handleLayoutSave = useCallback(async () => {
    const name = window.prompt('Save this layout as:', 'My layout');
    if (!name || !name.trim()) return;
    setLayoutSaving(true);
    try {
      await axios.post('/api/design/templates', {
        name: name.trim(),
        kind: 'layout',
        spec: layoutSpec,
        booking_id: booking?.id || null,
      });
      toast.success('Layout saved — reuse it on any booking');
      loadSavedLayouts();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not save this layout.');
    } finally {
      setLayoutSaving(false);
    }
  }, [layoutSpec, booking?.id, loadSavedLayouts]);

  const handleLayoutExport = useCallback(async () => {
    setLayoutExporting(true);
    try {
      const { width, height } = layoutPixelSize(layoutSpec.format);
      // Images must be decoded before drawing — canvas drawing is synchronous.
      const images = await loadSpecImages(layoutSpec);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      renderLayout(ctx, layoutSpec, { width, height, mode: 'export', images });

      const blob = await new Promise((res, rej) => {
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('Export failed'))), 'image/png');
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename({ booking, formatId: layoutSpec.format });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Could not export this design.');
      console.error('[DesignStudio] layout export failed:', err?.message);
    } finally {
      setLayoutExporting(false);
    }
  }, [layoutSpec, booking]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Render at full print resolution into an offscreen canvas. `mode: export`
      // punches real transparent holes where the photos go — the whole point of
      // the file, and the difference between a usable overlay and a flat image.
      const canvas = renderToCanvas();

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
  }, [renderToCanvas, resolved.format, booking]);

  const activeFormat = PRINT_FORMATS[resolved.format] || PRINT_FORMATS[DEFAULT_FORMAT_ID];

  const tabClass = (active) =>
    `h-8 rounded-full px-4 text-xs font-semibold transition-colors ${
      active
        ? 'bg-rose-600 text-white'
        : 'bg-muted text-muted-foreground hover:bg-muted/70'
    }`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist" aria-label="Design type">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'strip'}
          className={tabClass(mode === 'strip')}
          onClick={() => setMode('strip')}
        >
          Photo strip
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'layout'}
          className={tabClass(mode === 'layout')}
          onClick={() => setMode('layout')}
        >
          Free layout
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'monogram'}
          className={tabClass(mode === 'monogram')}
          onClick={() => setMode('monogram')}
        >
          Monogram
        </button>
      </div>

      {mode === 'monogram' ? (
        <MonogramPanel booking={booking} business={business} />
      ) : mode === 'layout' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Start from
            </Label>
            <Select
              value={layoutTemplateId}
              onValueChange={(id) => {
                // Saved layouts are prefixed so they cannot collide with the
                // built-in starter template ids.
                if (id.startsWith('saved:')) {
                  const saved = savedLayouts.find((x) => x.id === id.slice(6));
                  if (!saved) return;
                  setLayoutTemplateId(id);
                  setLayoutSpec(toLayoutSpec(saved.spec));
                  return;
                }
                const t = getLayoutTemplate(id);
                if (!t) return;
                setLayoutTemplateId(id);
                setLayoutSpec(toLayoutSpec(t.spec));
              }}
            >
              <SelectTrigger className="h-8 w-[260px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYOUT_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
                {savedLayouts.map((t) => (
                  <SelectItem key={t.id} value={`saved:${t.id}`}>
                    {t.name} (saved)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              disabled={layoutSaving}
              onClick={handleLayoutSave}
            >
              {layoutSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save layout
            </Button>
          </div>
          <LayoutEditor
            spec={layoutSpec}
            onSpecChange={setLayoutSpec}
            booking={booking}
            business={business}
            onExport={handleLayoutExport}
            exporting={layoutExporting}
          />
        </div>
      ) : (
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
        {/* AI brief — the primary way in. Claude returns a design spec that the
            same renderer draws, so generated designs are always print-correct. */}
        <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
          <Label
            htmlFor="design-prompt"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300"
          >
            <Sparkles className="h-3.5 w-3.5" /> Describe your design
          </Label>
          <Textarea
            id="design-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Romantic floral wedding, blush pink and gold, elegant script"
            rows={2}
            maxLength={500}
            className="resize-none bg-white text-sm dark:bg-zinc-900"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGenerate();
            }}
          />
          <Button
            type="button"
            size="sm"
            className="w-full gap-1.5 bg-rose-600 hover:bg-rose-700"
            disabled={generating}
            onClick={handleGenerate}
          >
            {generating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Designing…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Generate design
              </>
            )}
          </Button>
          {aiName ? (
            <p className="text-[11px] text-rose-700 dark:text-rose-300">
              Showing “{aiName}” — tweak anything below.
            </p>
          ) : null}
        </div>

        {saved.length ? (
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your saved designs
            </Label>
            <div className="mt-1.5 space-y-1">
              {saved.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5"
                >
                  <button
                    type="button"
                    className="flex-1 truncate text-left text-xs font-medium hover:text-rose-600"
                    onClick={() => {
                      setSpec(normalizeDesignSpec(t.spec));
                      setTemplateId('');
                      setAiName(t.name);
                    }}
                  >
                    {t.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${t.name}`}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-rose-600"
                    onClick={async () => {
                      try {
                        await axios.delete(`/api/design/templates?id=${encodeURIComponent(t.id)}`);
                        setSaved((prev) => prev.filter((x) => x.id !== t.id));
                      } catch {
                        toast.error('Could not delete that design.');
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Template
          </Label>
          <Select value={templateId} onValueChange={applyTemplate}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={aiName ? `${aiName} (AI)` : 'Choose a template'} />
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
            disabled={!templateId}
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

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5"
            disabled={saving}
            onClick={() => {
              handleSave().catch(() => {});
            }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5"
            disabled={sending}
            onClick={() => {
              handleSend().catch(() => {});
            }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to customer
          </Button>
        </div>
      </div>
    </div>
      )}
    </div>
  );
}

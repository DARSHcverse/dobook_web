'use client';

// Layout editor — the drag-and-drop replacement for the slider panel.
//
// Built after two working photo booth operators said the original was unusable:
// they need to place text above the photos, drop a client's logo anywhere, and
// move things directly rather than nudging X/Y sliders. Booking auto-fill is now
// opt-in (an "insert field" menu) because whoever books is often booking for
// someone else, so the customer's name is frequently the wrong name.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Image as ImageIcon,
  Loader2,
  Lock,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
  Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DESIGN_TOKENS, FONT_KEYS, PRINT_FORMATS, formatPixelSize } from '@/lib/design/specs';
import { buildTokenValues, applyTokens } from '@/lib/design/tokens';
import {
  addElement,
  makeElement,
  normalizeLayoutSpec,
  removeElement,
  reorderElement,
  updateElement,
} from '@/lib/design/layout';
import { loadSpecImages, renderLayout } from '@/lib/design/renderLayout';
import LayoutCanvas from '@/components/design/LayoutCanvas';

const FONT_LABELS = {
  elegant: 'Elegant serif',
  classic: 'Classic serif',
  modern: 'Modern sans',
  clean: 'Clean sans',
  script: 'Script',
  bold: 'Bold display',
};

const TYPE_ICON = { text: Type, image: ImageIcon, rect: Square, photo: Square };

function elementLabel(el, index) {
  if (el.type === 'text') return el.content ? el.content.slice(0, 22) : 'Empty text';
  if (el.type === 'image') return el.src ? 'Image' : 'Image (empty)';
  if (el.type === 'rect') return 'Shape';
  return `Photo ${index}`;
}

export default function LayoutEditor({ spec, onSpecChange, booking, business, onExport, exporting }) {
  const [selectedId, setSelectedId] = useState(null);
  const [images, setImages] = useState(new Map());
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Undo/redo. Kept in a ref so pushing history never re-renders on its own.
  const historyRef = useRef({ past: [], future: [] });
  const [historyTick, setHistoryTick] = useState(0);

  const pixelSize = useMemo(() => formatPixelSize(spec.format), [spec.format]);

  // Preview backing store: big enough to look sharp, small enough to redraw on
  // every pointermove without stutter.
  const previewSize = useMemo(() => {
    const scale = Math.min(1, 720 / pixelSize.height);
    return {
      width: Math.round(pixelSize.width * scale),
      height: Math.round(pixelSize.height * scale),
    };
  }, [pixelSize]);

  // Reload images whenever an image source changes.
  const imageKey = useMemo(
    () => spec.elements.filter((e) => e.type === 'image').map((e) => e.src).join('|'),
    [spec.elements],
  );
  useEffect(() => {
    let cancelled = false;
    loadSpecImages(spec).then((map) => {
      if (!cancelled) setImages(map);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageKey]);

  const pushHistory = useCallback(
    (previous) => {
      const h = historyRef.current;
      h.past.push(previous);
      if (h.past.length > 50) h.past.shift();
      h.future = [];
      setHistoryTick((t) => t + 1);
    },
    [],
  );

  // Live edits (dragging) update the spec without a history entry; the canvas
  // calls commit() on pointer-up so one drag is one undo step.
  const pendingRef = useRef(null);
  const applyLive = useCallback(
    (id, changes) => {
      onSpecChange((prev) => {
        if (!pendingRef.current) pendingRef.current = prev;
        return updateElement(prev, id, changes);
      });
    },
    [onSpecChange],
  );

  const commit = useCallback(() => {
    if (pendingRef.current) {
      pushHistory(pendingRef.current);
      pendingRef.current = null;
    }
  }, [pushHistory]);

  // Discrete edits (a colour change, adding an element) record history directly.
  const applyEdit = useCallback(
    (fn) => {
      onSpecChange((prev) => {
        pushHistory(prev);
        return fn(prev);
      });
    },
    [onSpecChange, pushHistory],
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (!h.past.length) return;
    onSpecChange((prev) => {
      h.future.push(prev);
      return h.past.pop();
    });
    setHistoryTick((t) => t + 1);
  }, [onSpecChange]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (!h.future.length) return;
    onSpecChange((prev) => {
      h.past.push(prev);
      return h.future.pop();
    });
    setHistoryTick((t) => t + 1);
  }, [onSpecChange]);

  const selected = spec.elements.find((el) => el.id === selectedId) || null;

  const patchSelected = useCallback(
    (changes) => {
      if (!selectedId) return;
      applyEdit((prev) => updateElement(prev, selectedId, changes));
    },
    [selectedId, applyEdit],
  );

  const handleUpload = useCallback(
    async (file) => {
      if (!file) return;
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/business/upload-image', { method: 'POST', body: form });
        if (!res.ok) throw new Error('upload failed');
        const json = await res.json();
        const url = String(json?.url || '');
        if (!url) throw new Error('no url');

        if (selected?.type === 'image') {
          patchSelected({ src: url });
        } else {
          applyEdit((prev) =>
            addElement(prev, makeElement('image', { x: 0.3, y: 0.82, src: url })),
          );
        }
      } catch {
        // Surfaced inline rather than as a toast so it sits next to the button.
        window.alert('Could not upload that image. Please try a JPG, PNG or WebP under 5MB.');
      } finally {
        setUploading(false);
      }
    },
    [selected, patchSelected, applyEdit],
  );

  // Resolved preview of a text element's tokens, shown under the input so the
  // operator can see what a booking field will actually print as.
  const tokenValues = useMemo(() => buildTokenValues({ booking, business }), [booking, business]);
  const resolvedPreview =
    selected?.type === 'text' && selected.content.includes('{{')
      ? applyTokens(selected.content, tokenValues)
      : '';

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      {/* Canvas */}
      <div className="order-2 lg:order-1">
        <div className="flex items-start justify-center rounded-2xl border border-border bg-[repeating-conic-gradient(#f4f4f5_0%_25%,#ffffff_0%_50%)] bg-[length:20px_20px] p-6">
          <div className="w-full" style={{ maxWidth: Math.min(360, previewSize.width) }}>
            <LayoutCanvas
              spec={spec}
              images={images}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={applyLive}
              onCommit={commit}
              width={previewSize.width}
              height={previewSize.height}
            />
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {PRINT_FORMATS[spec.format]?.label} · {pixelSize.width} × {pixelSize.height}px at 300 DPI
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Click any element to select it, drag to move, use the handles to resize. Arrow keys nudge.
        </p>
      </div>

      {/* Controls */}
      <div className="order-1 space-y-4 lg:order-2 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => applyEdit((prev) => addElement(prev, makeElement('text', { x: 0.1, y: 0.86 })))}
          >
            <Type className="h-3.5 w-3.5" /> Text
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2 text-xs"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
            Logo
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => applyEdit((prev) => addElement(prev, makeElement('photo', { x: 0.05, y: 0.35 })))}
          >
            <Square className="h-3.5 w-3.5" /> Photo
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => applyEdit((prev) => addElement(prev, makeElement('rect', { x: 0.1, y: 0.8 })))}
          >
            <Square className="h-3.5 w-3.5" /> Shape
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 flex-1 gap-1 text-xs"
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 flex-1 gap-1 text-xs"
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2 className="h-3.5 w-3.5" /> Redo
          </Button>
        </div>

        {/* Layer list — also the way to reach an element hidden behind another. */}
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Elements
          </Label>
          <div className="mt-1.5 space-y-1">
            {[...spec.elements].reverse().map((el) => {
              const photoIndex =
                el.type === 'photo'
                  ? spec.elements.filter((x) => x.type === 'photo').indexOf(el) + 1
                  : 0;
              const Icon = TYPE_ICON[el.type] || Square;
              return (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => setSelectedId(el.id)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs ${
                    el.id === selectedId
                      ? 'border-rose-300 bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="flex-1 truncate">{elementLabel(el, photoIndex)}</span>
                  {el.locked ? <Lock className="h-3 w-3 shrink-0 opacity-60" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Properties for the current selection */}
        {selected ? (
          <div className="space-y-3 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {selected.type}
              </span>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  aria-label="Bring forward"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => applyEdit((prev) => reorderElement(prev, selected.id, 'up'))}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Send backward"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => applyEdit((prev) => reorderElement(prev, selected.id, 'down'))}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={selected.locked ? 'Unlock' : 'Lock'}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => patchSelected({ locked: !selected.locked })}
                >
                  {selected.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  aria-label="Delete element"
                  className="rounded p-1 text-muted-foreground hover:text-rose-600"
                  onClick={() => {
                    applyEdit((prev) => removeElement(prev, selected.id));
                    setSelectedId(null);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {selected.type === 'text' ? (
              <>
                <Input
                  value={selected.content}
                  onChange={(e) => patchSelected({ content: e.target.value })}
                  className="h-9 text-sm"
                  aria-label="Text content"
                />
                {resolvedPreview ? (
                  <p className="truncate text-[11px] text-muted-foreground">→ {resolvedPreview}</p>
                ) : null}

                {/* Booking fields are opt-in: operators said auto-fill guesses
                    wrong because the booker is often not the guest of honour. */}
                <Select
                  value=""
                  onValueChange={(tok) =>
                    patchSelected({ content: `${selected.content}${tok}` })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Insert booking field…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DESIGN_TOKENS).map(([tok, lbl]) => (
                      <SelectItem key={tok} value={tok}>
                        {lbl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Text colour"
                    value={selected.color}
                    onChange={(e) => patchSelected({ color: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <Select value={selected.font} onValueChange={(v) => patchSelected({ font: v })}>
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

                <div className="flex items-center gap-2">
                  <Label className="w-12 shrink-0 text-[11px] text-muted-foreground">Size</Label>
                  <Input
                    type="number"
                    min="4"
                    max="200"
                    step="1"
                    value={Math.round(selected.size * 1000)}
                    onChange={(e) => patchSelected({ size: Number(e.target.value) / 1000 })}
                    className="h-8 text-xs"
                    aria-label="Font size"
                  />
                  <Select value={selected.align} onValueChange={(v) => patchSelected({ align: v })}>
                    <SelectTrigger className="h-8 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={selected.weight === 'bold' ? 'default' : 'outline'}
                    className="h-7 flex-1 px-2 text-xs"
                    onClick={() =>
                      patchSelected({ weight: selected.weight === 'bold' ? 'normal' : 'bold' })
                    }
                  >
                    Bold
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selected.uppercase ? 'default' : 'outline'}
                    className="h-7 flex-1 px-2 text-xs"
                    onClick={() => patchSelected({ uppercase: !selected.uppercase })}
                  >
                    CAPS
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selected.italic ? 'default' : 'outline'}
                    className="h-7 flex-1 px-2 text-xs"
                    onClick={() => patchSelected({ italic: !selected.italic })}
                  >
                    Italic
                  </Button>
                </div>
              </>
            ) : null}

            {selected.type === 'image' ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-full gap-1 text-xs"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  {selected.src ? 'Replace image' : 'Upload image'}
                </Button>
                <Select value={selected.fit} onValueChange={(v) => patchSelected({ fit: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contain">Fit inside (keep shape)</SelectItem>
                    <SelectItem value="cover">Fill box (crop)</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : null}

            {selected.type === 'rect' ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Shape colour"
                  value={selected.color}
                  onChange={(e) => patchSelected({ color: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                />
                <span className="text-xs text-muted-foreground">Shape colour</span>
              </div>
            ) : null}

            {selected.type === 'photo' ? (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-16 shrink-0">Corners</span>
                <input
                  type="range"
                  aria-label="Photo corner rounding"
                  min="0"
                  max="100"
                  value={Math.round(selected.radius * 100)}
                  onChange={(e) => patchSelected({ radius: Number(e.target.value) / 100 })}
                  className="flex-1 accent-rose-600"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Click an element on the canvas to edit it.
          </p>
        )}

        <div className="border-t border-border pt-3">
          <Button
            type="button"
            className="w-full gap-1.5 bg-rose-600 hover:bg-rose-700"
            disabled={exporting}
            onClick={onExport}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PNG
          </Button>
        </div>
      </div>
    </div>
  );
}

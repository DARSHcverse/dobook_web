'use client';

// Drag-and-drop canvas for the v2 layout model.
//
// One <canvas> draws the design (via the shared renderer, so preview == print)
// and an absolutely-positioned overlay draws the selection box and resize
// handles as DOM nodes. Handles as DOM rather than canvas hit-testing keeps them
// crisp, keyboard-focusable, and easy to give a cursor.
//
// All geometry is in canvas fractions (0-1). Pointer coordinates are converted
// once, on the way in, so the same drag maths works at any preview scale.

import { useCallback, useEffect, useRef, useState } from 'react';
import { hitTest } from '@/lib/design/layout';
import { renderLayout } from '@/lib/design/renderLayout';
import { snapRect } from '@/lib/design/snapping';

// Corner + edge handles, expressed as unit offsets within the element.
const HANDLES = [
  { id: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
  { id: 'n', x: 0.5, y: 0, cursor: 'ns-resize' },
  { id: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
  { id: 'e', x: 1, y: 0.5, cursor: 'ew-resize' },
  { id: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
  { id: 's', x: 0.5, y: 1, cursor: 'ns-resize' },
  { id: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
  { id: 'w', x: 0, y: 0.5, cursor: 'ew-resize' },
];

const MIN_SIZE = 0.02;

export default function LayoutCanvas({
  spec,
  images,
  selectedId,
  onSelect,
  onChange,
  onCommit,
  width,
  height,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  // Drag state lives in a ref: it changes on every pointermove and must not
  // trigger a React render per frame.
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  // Alignment guides currently showing, e.g. [{axis:'v', at:0.5}].
  const [guides, setGuides] = useState([]);

  // Redraw whenever the design or loaded images change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderLayout(ctx, spec, { width, height, mode: 'preview', images });
  }, [spec, images, width, height]);

  const toFraction = useCallback((clientX, clientY) => {
    const el = wrapRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: (clientX - r.left) / r.width,
      y: (clientY - r.top) / r.height,
    };
  }, []);

  const beginDrag = useCallback(
    (e, mode, handleId) => {
      const el = spec.elements.find((x) => x.id === selectedId);
      if (!el && mode !== 'select') return;
      e.preventDefault();
      e.stopPropagation();
      const p = toFraction(e.clientX, e.clientY);
      dragRef.current = {
        mode,
        handleId,
        id: el?.id,
        startPointer: p,
        startRect: el ? { ...el.rect } : null,
        moved: false,
      };
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [spec.elements, selectedId, toFraction],
  );

  const onPointerDownCanvas = useCallback(
    (e) => {
      const p = toFraction(e.clientX, e.clientY);
      const hit = hitTest(spec, p.x, p.y);
      onSelect(hit ? hit.id : null);
      if (!hit) return;
      e.preventDefault();
      const p2 = toFraction(e.clientX, e.clientY);
      dragRef.current = {
        mode: 'move',
        id: hit.id,
        startPointer: p2,
        startRect: { ...hit.rect },
        moved: false,
      };
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [spec, toFraction, onSelect],
  );

  const onPointerMove = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d || !d.startRect) return;
      const p = toFraction(e.clientX, e.clientY);
      const dx = p.x - d.startPointer.x;
      const dy = p.y - d.startPointer.y;
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) d.moved = true;

      const s = d.startRect;
      let rect;

      if (d.mode === 'move') {
        rect = { ...s, x: s.x + dx, y: s.y + dy };
      } else {
        // Resize: each handle moves the edges it touches. Anchoring to the
        // opposite edge keeps the element from jumping when it is dragged past
        // its own origin.
        let { x, y, w, h } = s;
        const id = d.handleId;
        if (id.includes('w')) {
          const right = s.x + s.w;
          x = Math.min(s.x + dx, right - MIN_SIZE);
          w = right - x;
        }
        if (id.includes('e')) {
          w = Math.max(MIN_SIZE, s.w + dx);
        }
        if (id.includes('n')) {
          const bottom = s.y + s.h;
          y = Math.min(s.y + dy, bottom - MIN_SIZE);
          h = bottom - y;
        }
        if (id.includes('s')) {
          h = Math.max(MIN_SIZE, s.h + dy);
        }
        rect = { x, y, w, h };
      }

      // Snap to the canvas and to sibling edges, and surface the guides that
      // fired so the operator can see why it locked on. Holding Alt bypasses it
      // for deliberate fine placement.
      if (!e.altKey) {
        const snapped = snapRect(rect, spec, {
          excludeId: d.id,
          resizing: d.mode === 'resize' ? d.handleId : null,
        });
        rect = snapped.rect;
        setGuides(snapped.guides);
      } else {
        setGuides([]);
      }

      onChange(d.id, { rect });
    },
    [toFraction, onChange, spec],
  );

  const endDrag = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    setGuides([]);
    // Only push an undo entry if something actually moved — a plain click to
    // select should not create a history step.
    if (d?.moved) onCommit?.();
  }, [onCommit]);

  // Arrow keys nudge the selection; shift moves further. Gives precise control
  // that dragging alone cannot.
  useEffect(() => {
    if (!selectedId) return undefined;
    const handler = (e) => {
      const tag = String(e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      const step = e.shiftKey ? 0.02 : 0.002;
      const map = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = map[e.key];
      if (!delta) return;
      const el = spec.elements.find((x) => x.id === selectedId);
      if (!el) return;
      e.preventDefault();
      onChange(selectedId, { rect: { ...el.rect, x: el.rect.x + delta[0], y: el.rect.y + delta[1] } });
      onCommit?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, spec.elements, onChange, onCommit]);

  const selected = spec.elements.find((el) => el.id === selectedId) || null;

  return (
    <div
      ref={wrapRef}
      className="relative select-none touch-none"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full rounded-lg shadow-lg"
        style={{ cursor: dragging ? 'grabbing' : 'default' }}
        onPointerDown={onPointerDownCanvas}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label="Design canvas"
      />

      {/* Outlines for every element, so the operator can see what is grabbable. */}
      {spec.elements.map((el) => (
        <div
          key={`outline-${el.id}`}
          aria-hidden="true"
          className={`pointer-events-none absolute border ${
            el.id === selectedId ? 'border-rose-500' : 'border-transparent'
          }`}
          style={{
            left: `${el.rect.x * 100}%`,
            top: `${el.rect.y * 100}%`,
            width: `${el.rect.w * 100}%`,
            height: `${el.rect.h * 100}%`,
          }}
        />
      ))}

      {/* Alignment guides, shown only while dragging. */}
      {guides.map((g, i) => (
        <div
          key={`guide-${g.axis}-${g.at}-${i}`}
          aria-hidden="true"
          className="pointer-events-none absolute bg-rose-500/80"
          style={
            g.axis === 'v'
              ? { left: `${g.at * 100}%`, top: 0, bottom: 0, width: 1 }
              : { top: `${g.at * 100}%`, left: 0, right: 0, height: 1 }
          }
        />
      ))}

      {/* Resize handles for the current selection. */}
      {selected
        ? HANDLES.map((hnd) => (
            <button
              key={hnd.id}
              type="button"
              aria-label={`Resize ${hnd.id}`}
              className="absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-rose-500 bg-white shadow"
              style={{
                left: `${(selected.rect.x + selected.rect.w * hnd.x) * 100}%`,
                top: `${(selected.rect.y + selected.rect.h * hnd.y) * 100}%`,
                cursor: hnd.cursor,
              }}
              onPointerDown={(e) => beginDrag(e, 'resize', hnd.id)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
          ))
        : null}
    </div>
  );
}

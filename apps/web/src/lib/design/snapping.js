// Alignment snapping for the layout editor.
//
// Operators line elements up by eye otherwise, which is slow and never quite
// centred. This snaps a dragged element to the canvas centre/edges and to the
// edges and centres of its siblings, and reports which guides fired so the
// editor can draw them.
//
// Works in canvas fractions (0-1) like everything else in the design model.

// Snap distance as a fraction of the canvas. Roughly 5px on a 600px-wide strip —
// close enough to feel magnetic, loose enough not to fight deliberate placement.
export const SNAP_THRESHOLD = 0.008;

function edgesOf(rect) {
  return {
    left: rect.x,
    centerX: rect.x + rect.w / 2,
    right: rect.x + rect.w,
    top: rect.y,
    centerY: rect.y + rect.h / 2,
    bottom: rect.y + rect.h,
  };
}

// Candidate lines to snap against: the canvas itself, then every other element.
function collectTargets(spec, excludeId) {
  const vertical = [0, 0.5, 1];
  const horizontal = [0, 0.5, 1];

  for (const el of spec.elements) {
    if (el.id === excludeId) continue;
    const e = edgesOf(el.rect);
    vertical.push(e.left, e.centerX, e.right);
    horizontal.push(e.top, e.centerY, e.bottom);
  }
  return { vertical, horizontal };
}

/**
 * Snap a moving rect to nearby alignment lines.
 *
 * Returns the adjusted rect plus the guides that fired, so the editor can draw
 * them. `resizing` limits snapping to the edges actually being dragged — a
 * resize must not shift the anchored edge.
 */
export function snapRect(rect, spec, { excludeId, threshold = SNAP_THRESHOLD, resizing = null } = {}) {
  const targets = collectTargets(spec, excludeId);
  const guides = [];

  let x = rect.x;
  let y = rect.y;
  let w = rect.w;
  let h = rect.h;

  // --- horizontal position (vertical guide lines) ---
  if (!resizing) {
    const e = edgesOf(rect);
    let best = null;
    for (const t of targets.vertical) {
      for (const [name, value] of [["left", e.left], ["centerX", e.centerX], ["right", e.right]]) {
        const dist = Math.abs(value - t);
        if (dist <= threshold && (!best || dist < best.dist)) {
          best = { dist, delta: t - value, at: t, name };
        }
      }
    }
    if (best) {
      x = rect.x + best.delta;
      guides.push({ axis: "v", at: best.at });
    }
  } else {
    // Only the dragged edges may move while resizing.
    if (resizing.includes("w")) {
      const right = rect.x + rect.w;
      let best = null;
      for (const t of targets.vertical) {
        const dist = Math.abs(rect.x - t);
        if (dist <= threshold && t < right && (!best || dist < best.dist)) best = { dist, at: t };
      }
      if (best) {
        x = best.at;
        w = right - x;
        guides.push({ axis: "v", at: best.at });
      }
    }
    if (resizing.includes("e")) {
      let best = null;
      for (const t of targets.vertical) {
        const dist = Math.abs(rect.x + rect.w - t);
        if (dist <= threshold && t > rect.x && (!best || dist < best.dist)) best = { dist, at: t };
      }
      if (best) {
        w = best.at - rect.x;
        guides.push({ axis: "v", at: best.at });
      }
    }
  }

  // --- vertical position (horizontal guide lines) ---
  if (!resizing) {
    const e = edgesOf(rect);
    let best = null;
    for (const t of targets.horizontal) {
      for (const [name, value] of [["top", e.top], ["centerY", e.centerY], ["bottom", e.bottom]]) {
        const dist = Math.abs(value - t);
        if (dist <= threshold && (!best || dist < best.dist)) {
          best = { dist, delta: t - value, at: t, name };
        }
      }
    }
    if (best) {
      y = rect.y + best.delta;
      guides.push({ axis: "h", at: best.at });
    }
  } else {
    if (resizing.includes("n")) {
      const bottom = rect.y + rect.h;
      let best = null;
      for (const t of targets.horizontal) {
        const dist = Math.abs(rect.y - t);
        if (dist <= threshold && t < bottom && (!best || dist < best.dist)) best = { dist, at: t };
      }
      if (best) {
        y = best.at;
        h = bottom - y;
        guides.push({ axis: "h", at: best.at });
      }
    }
    if (resizing.includes("s")) {
      let best = null;
      for (const t of targets.horizontal) {
        const dist = Math.abs(rect.y + rect.h - t);
        if (dist <= threshold && t > rect.y && (!best || dist < best.dist)) best = { dist, at: t };
      }
      if (best) {
        h = best.at - rect.y;
        guides.push({ axis: "h", at: best.at });
      }
    }
  }

  return { rect: { x, y, w, h }, guides };
}

// Distribution helpers for the alignment toolbar.
export function alignRect(rect, edge) {
  switch (edge) {
    case "left":
      return { ...rect, x: 0 };
    case "centerX":
      return { ...rect, x: 0.5 - rect.w / 2 };
    case "right":
      return { ...rect, x: 1 - rect.w };
    case "top":
      return { ...rect, y: 0 };
    case "centerY":
      return { ...rect, y: 0.5 - rect.h / 2 };
    case "bottom":
      return { ...rect, y: 1 - rect.h };
    default:
      return rect;
  }
}

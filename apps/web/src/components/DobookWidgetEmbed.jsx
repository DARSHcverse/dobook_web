"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function DobookWidgetEmbed({
  src,
  title = "DoBook booking widget",
  minHeight = 720,
  height = 720,
  extraPadding = 24,
  style,
  ...props
}) {
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useState(height);

  const mergedStyle = useMemo(
    () => ({
      width: "100%",
      border: 0,
      display: "block",
      borderRadius: 16,
      boxShadow: "0 10px 30px rgba(0,0,0,.12)",
      minHeight,
      height: iframeHeight,
      ...style,
    }),
    [iframeHeight, minHeight, style],
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let origin = null;
    try {
      origin = new URL(src, window.location.href).origin;
    } catch {
      origin = null;
    }

    function onMessage(event) {
      if (origin && event.origin !== origin) return;
      const data = event.data || {};
      if (!data || data.type !== "dobook:resize") return;

      const parsed = Number.parseInt(data.height, 10);
      if (!Number.isFinite(parsed) || parsed < 300) return;

      setIframeHeight(parsed + extraPadding);
    }

    window.addEventListener("message", onMessage, false);
    return () => window.removeEventListener("message", onMessage, false);
  }, [extraPadding, src]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title={title}
      loading="lazy"
      style={mergedStyle}
      height={iframeHeight}
      {...props}
    />
  );
}


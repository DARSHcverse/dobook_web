"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

function formatSuggestion(item) {
  const formatted = String(item?.formatted || item?.properties?.formatted || "").trim();
  if (formatted) return formatted;

  const name = String(item?.name || item?.label || item?.display_name || "").trim();
  if (name) return name;

  const parts = [
    item?.street,
    item?.city,
    item?.state,
    item?.postcode || item?.zip,
    item?.country,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  inputProps,
}) {
  const inputId = useId();
  const listboxId = useMemo(() => `${inputId}-listbox`, [inputId]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [highlight, setHighlight] = useState(-1);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  const query = String(value || "");

  const fetchSuggestions = async (q) => {
    const trimmed = String(q || "").trim();
    if (trimmed.length < 3) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const url = new URL("/api/public/geoapify/autocomplete", window.location.origin);
      url.searchParams.set("q", trimmed);
      url.searchParams.set("limit", "6");

      const res = await fetch(url.toString(), { signal: controller.signal, cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load suggestions");
      const json = await res.json();
      const results = Array.isArray(json?.results) ? json.results : [];
      setItems(results);
      setOpen(results.length > 0);
      setHighlight(-1);
    } catch (e) {
      if (String(e?.name || "") === "AbortError") return;
      setItems([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(query), 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => () => abortRef.current?.abort?.(), []);

  const selectItem = (item) => {
    const next = String(item?.formatted || "").trim() || formatSuggestion(item);
    onChange?.(next, item);
    setOpen(false);
    setItems([]);
    setHighlight(-1);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(items.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      if (highlight >= 0 && items[highlight]) {
        e.preventDefault();
        selectItem(items[highlight]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange?.(e.target.value, null)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="street-address"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        {...(inputProps || {})}
      />

      {loading ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">Searching…</div>
      ) : null}

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-2 w-full rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-lg overflow-hidden max-h-72 overflow-y-auto"
        >
          {items.map((item, idx) => {
            const label = formatSuggestion(item);
            const active = idx === highlight;
            return (
              <button
                key={`${label}-${idx}`}
                type="button"
                role="option"
                aria-selected={active}
                className="w-full text-left px-4 py-3 text-sm"
                style={{
                  backgroundColor: active ? "#fff1f2" : "#ffffff",
                  color: active ? "#be123c" : "#111827",
                }}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectItem(item)}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const publicTableColumnsCache = new Map();

export async function getPublicTableColumns(sb, tableName) {
  const key = String(tableName || "").trim().toLowerCase();
  if (!key) return null;
  if (publicTableColumnsCache.has(key)) return publicTableColumnsCache.get(key);

  const { data, error } = await sb
    .schema("information_schema")
    .from("columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", key);

  if (error || !Array.isArray(data)) {
    console.warn(`[dbSchema] Failed to load columns for public.${key}: ${error?.message || "unknown error"}`);
    return null;
  }

  const columns = new Set(
    data
      .map((row) => String(row?.column_name || "").trim())
      .filter(Boolean),
  );
  publicTableColumnsCache.set(key, columns);
  return columns;
}

export async function pickExistingPublicColumns(sb, tableName, record, { logPrefix = "[dbSchema]" } = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return record;

  const columns = await getPublicTableColumns(sb, tableName);
  if (!columns?.size) return record;

  const next = {};
  const missing = [];
  for (const [key, value] of Object.entries(record)) {
    if (columns.has(key)) next[key] = value;
    else missing.push(key);
  }

  if (missing.length) {
    console.warn(`${logPrefix} Skipping missing columns on public.${tableName}: ${missing.join(", ")}`);
  }

  return next;
}

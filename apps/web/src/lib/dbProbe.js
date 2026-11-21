// Does a column exist? information_schema is not exposed through PostgREST on
// this project (dbSchema.getPublicTableColumns always returns null), so probe
// the column directly. A positive answer is cached for the process; a negative
// one is re-checked every minute, so a migration takes effect without a deploy.
const cache = new Map();

export async function columnExists(sb, table, column) {
  const key = `${table}.${column}`;
  const hit = cache.get(key);
  if (hit?.exists) return true;
  if (hit && Date.now() - hit.checkedAt < 60_000) return false;
  const { error } = await sb.from(table).select(column).limit(1);
  cache.set(key, { exists: !error, checkedAt: Date.now() });
  return !error;
}

export const ADMIN_COOKIE_NAME = "dobook_admin";
export const ADMIN_ACCESS_COOKIE_NAME = "admin_access";
// How long an admin stays logged in. This is the credential that actually
// protects every business's data, so it stays short enough that a forgotten
// session on a shared machine expires the same day.
export const ADMIN_TOKEN_TTL_SECONDS = 24 * 60 * 60;

// How long the URL-key/entry-path gate is remembered. This only controls
// whether the admin LOGIN page is reachable, not access to any data, so a long
// life here costs little and removes the daily "find the long URL" friction.
export const ADMIN_ACCESS_TTL_SECONDS = 30 * 24 * 60 * 60;

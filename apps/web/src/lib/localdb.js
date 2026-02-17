import fs from "node:fs";
import path from "node:path";

const DB_FILENAME = "localdb.json";

function dbPath() {
  if (process.env.LOCALDB_PATH) return process.env.LOCALDB_PATH;
  // Vercel serverless runtime has a read-only filesystem except for `/tmp`.
  // Using `/tmp` avoids 500s from attempts to write into the deployment bundle.
  if (process.env.VERCEL) return path.join("/tmp", DB_FILENAME);
  return path.join(process.cwd(), DB_FILENAME);
}

function defaultDb() {
  return {
    businesses: [],
    sessions: [],
    bookings: [],
    invoiceTemplates: [],
    passwordResetTokens: [],
    extractions: [],
    invoices: [],
    counters: {},
  };
}

export function readDb() {
  const filePath = dbPath();
  if (!fs.existsSync(filePath)) {
    const db = defaultDb();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
    return db;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) return defaultDb();

  try {
    const parsed = JSON.parse(raw);
    return { ...defaultDb(), ...parsed };
  } catch {
    return defaultDb();
  }
}

export function writeDb(db) {
  const filePath = dbPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
}

export function sanitizeBusiness(business) {
  // Never return password hashes to the client.
  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...safe } = business || {};
  return safe;
}

import fs from "node:fs";
import path from "node:path";

const DB_FILENAME = "localdb.json";

function dbPath() {
  return path.join(process.cwd(), DB_FILENAME);
}

function defaultDb() {
  return {
    businesses: [],
    sessions: [],
    bookings: [],
    invoiceTemplates: [],
    extractions: [],
    invoices: [],
    counters: {},
  };
}

export function readDb() {
  const filePath = dbPath();
  if (!fs.existsSync(filePath)) {
    const db = defaultDb();
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
    return db;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) return defaultDb();

  const parsed = JSON.parse(raw);
  return { ...defaultDb(), ...parsed };
}

export function writeDb(db) {
  fs.writeFileSync(dbPath(), JSON.stringify(db, null, 2));
}

export function sanitizeBusiness(business) {
  // Never return password hashes to the client.
  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...safe } = business || {};
  return safe;
}

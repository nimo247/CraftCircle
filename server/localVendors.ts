import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "server", "data");
const DATA_FILE = path.join(DATA_DIR, "vendors.json");

function ensureDataFile() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

async function readAll() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    console.error("Failed to read local vendors file:", err);
    return [];
  }
}

async function writeAll(data: any[]) {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Failed to write local vendors file:", err);
    return false;
  }
}

export async function getVendors(email?: string) {
  const all = await readAll();
  if (email) return all.filter((v) => String(v.contact_email) === String(email));
  return all.sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 200);
}

export async function getVendorByEmail(email: string) {
  const all = await readAll();
  return all.find((v) => String(v.contact_email) === String(email)) || null;
}

export async function addVendor(vendor: any) {
  const all = await readAll();
  const id = Date.now();
  const v = { id, ...vendor };
  all.push(v);
  await writeAll(all);
  return v;
}

export async function updateVendorById(id: string | number, changes: any) {
  const all = await readAll();
  const idx = all.findIndex((v) => String(v.id) === String(id));
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...changes };
  await writeAll(all);
  return all[idx];
}

export default { getVendors, getVendorByEmail, addVendor, updateVendorById };

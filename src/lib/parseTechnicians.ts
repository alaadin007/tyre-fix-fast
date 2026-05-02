import * as XLSX from "xlsx";
import Papa from "papaparse";
import mammoth from "mammoth";

export type ParsedTechnician = {
  name: string;
  phone: string;
  email?: string;
  service_postcodes: string[];
  vehicle?: string;
  notes?: string;
};

const HEADER_MAP: Record<string, keyof ParsedTechnician> = {
  name: "name",
  "full name": "name",
  technician: "name",
  phone: "phone",
  mobile: "phone",
  "phone number": "phone",
  tel: "phone",
  email: "email",
  "e-mail": "email",
  postcodes: "service_postcodes",
  postcode: "service_postcodes",
  "service area": "service_postcodes",
  "service areas": "service_postcodes",
  area: "service_postcodes",
  areas: "service_postcodes",
  vehicle: "vehicle",
  van: "vehicle",
  car: "vehicle",
  notes: "notes",
  note: "notes",
  comments: "notes",
};

function normalizeKey(k: string): string {
  return String(k ?? "").trim().toLowerCase();
}

function rowToTech(row: Record<string, unknown>): ParsedTechnician | null {
  const out: Partial<ParsedTechnician> = {};
  for (const [k, v] of Object.entries(row)) {
    const mapped = HEADER_MAP[normalizeKey(k)];
    if (!mapped || v === null || v === undefined || v === "") continue;
    if (mapped === "service_postcodes") {
      out.service_postcodes = String(v)
        .split(/[,;|/]/)
        .map((p) => p.trim().toUpperCase())
        .filter(Boolean);
    } else {
      (out as any)[mapped] = String(v).trim();
    }
  }
  if (!out.name || !out.phone) return null;
  return {
    name: out.name,
    phone: out.phone,
    email: out.email,
    service_postcodes: out.service_postcodes ?? [],
    vehicle: out.vehicle,
    notes: out.notes,
  };
}

// Parse free-form text: each line "Name | Phone | Postcodes | Email"
function parseFreeText(text: string): ParsedTechnician[] {
  const out: ParsedTechnician[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    // skip headings
    if (/^(name|technician|phone)/i.test(line) && line.split(/[|,\t]/).length > 1) continue;
    const parts = line.split(/\s*[|,\t]\s*/);
    if (parts.length < 2) continue;
    const [name, phone, postcodes, email, vehicle, notes] = parts;
    if (!name || !phone) continue;
    out.push({
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || undefined,
      service_postcodes: postcodes
        ? postcodes.split(/[\s;/]+/).map((p) => p.trim().toUpperCase()).filter(Boolean)
        : [],
      vehicle: vehicle?.trim() || undefined,
      notes: notes?.trim() || undefined,
    });
  }
  return out;
}

export async function parseTechniciansFile(file: File): Promise<ParsedTechnician[]> {
  const name = file.name.toLowerCase();
  const ext = name.split(".").pop() ?? "";

  // CSV
  if (ext === "csv" || file.type === "text/csv") {
    const text = await file.text();
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    return result.data.map(rowToTech).filter(Boolean) as ParsedTechnician[];
  }

  // Excel
  if (["xlsx", "xls", "xlsm", "ods"].includes(ext)) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    return rows.map(rowToTech).filter(Boolean) as ParsedTechnician[];
  }

  // Word
  if (["docx"].includes(ext)) {
    const buf = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return parseFreeText(value);
  }

  // .doc (legacy) — best-effort: read as text
  // Plain text / markdown / anything else
  const text = await file.text();
  // Try CSV-style first if it has commas or tabs in header
  if (/^[^\n]+(,|\t)/.test(text.split("\n")[0] ?? "")) {
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    const rows = result.data.map(rowToTech).filter(Boolean) as ParsedTechnician[];
    if (rows.length > 0) return rows;
  }
  return parseFreeText(text);
}

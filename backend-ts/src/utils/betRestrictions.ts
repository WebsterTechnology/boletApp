import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(__dirname, "..", "..", "data");
const numbersPath = path.join(dataDir, "disabledNumbers.json");
const locationsPath = path.join(dataDir, "disabledLocations.json");

function readList(file: string): string[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed.map((value) => String(value).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeLocation(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isNumberDisabled(number: unknown): boolean {
  const candidate = String(number ?? "").trim();
  return readList(numbersPath).some((disabled) => disabled === candidate);
}

export function isLocationDisabled(location: unknown): boolean {
  const candidate = normalizeLocation(location);
  return readList(locationsPath).some((disabled) => normalizeLocation(disabled) === candidate);
}

export function disabledBetMessage(number: unknown, location: unknown): string | null {
  if (isNumberDisabled(number)) return `Nimewo ${String(number).trim()} dezaktive pou kounye a.`;
  if (isLocationDisabled(location)) return `Lokal ${String(location).trim()} dezaktive pou kounye a.`;
  return null;
}

export function disabledMaryajMessage(part1: unknown, part2: unknown, location: unknown): string | null {
  if (isNumberDisabled(part1) || isNumberDisabled(part2)) {
    return "Youn nan nimewo Maryaj sa yo dezaktive pou kounye a.";
  }
  if (isLocationDisabled(location)) return `Lokal ${String(location).trim()} dezaktive pou kounye a.`;
  return null;
}

import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  disabledBetMessage,
  disabledMaryajMessage,
  isLocationDisabled,
  isNumberDisabled,
} from "../src/utils/betRestrictions";

const dataDir = path.resolve(__dirname, "..", "data");
const numbersPath = path.join(dataDir, "disabledNumbers.json");
const locationsPath = path.join(dataDir, "disabledLocations.json");
const originalNumbers = fs.existsSync(numbersPath) ? fs.readFileSync(numbersPath, "utf8") : null;
const originalLocations = fs.existsSync(locationsPath) ? fs.readFileSync(locationsPath, "utf8") : null;

function write(file: string, values: string[]) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(values));
}
function restore(file: string, original: string | null) {
  if (original === null) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } else fs.writeFileSync(file, original);
}

afterEach(() => {
  restore(numbersPath, originalNumbers);
  restore(locationsPath, originalLocations);
});

describe("Bet restrictions", () => {
  it("blocks a disabled number", () => {
    write(numbersPath, ["25"]);
    expect(isNumberDisabled("25")).toBe(true);
    expect(disabledBetMessage("25", "New York")).toContain("dezaktive");
  });

  it("blocks a disabled location case-insensitively", () => {
    write(locationsPath, ["New York"]);
    expect(isLocationDisabled("new york")).toBe(true);
    expect(disabledBetMessage("26", "NEW YORK")).toContain("dezaktive");
  });

  it("allows enabled number and location", () => {
    write(numbersPath, ["25"]);
    write(locationsPath, ["Florida"]);
    expect(disabledBetMessage("26", "New York")).toBeNull();
  });

  it("blocks Maryaj when either number is disabled", () => {
    write(numbersPath, ["46"]);
    expect(disabledMaryajMessage("25", "46", "New York")).toContain("dezaktive");
  });

  it("blocks Maryaj at a disabled location", () => {
    write(locationsPath, ["Georgia"]);
    expect(disabledMaryajMessage("25", "46", "Georgia")).toContain("dezaktive");
  });
});

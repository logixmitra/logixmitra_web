import { getuserid } from "../../../services/getbasicdata";

export type PackageShipmentType = "SMALL" | "HEAVY";
export type RovType = "Rov Owner" | "Rov Carrier";

export type BoxRow = {
  noOfBox: number;
  weightPerBox: number;
  length: number | "";
  width: number | "";
  height: number | "";
};

export type SavedPackage = {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  deadWeight?: number;
};

const SAVED_KEY = () => `lm_saved_packages_${getuserid() || "guest"}`;

export function loadSavedPackages(): SavedPackage[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function persistSavedPackages(list: SavedPackage[]) {
  localStorage.setItem(SAVED_KEY(), JSON.stringify(list));
}

export function emptyBoxRow(): BoxRow {
  return { noOfBox: 1, weightPerBox: 0, length: "", width: "", height: "" };
}

export const MAX_PACKAGE_DIM_CM = 306;

export function sanePackageDim(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0.1 || n > MAX_PACKAGE_DIM_CM) return fallback;
  return Number(n.toFixed(2));
}

export function volumetricFromSaneDims(length?: unknown, width?: unknown, height?: unknown): number {
  const l = sanePackageDim(length);
  const w = sanePackageDim(width);
  const h = sanePackageDim(height);
  if (!l || !w || !h) return 0;
  return Number(((l * w * h) / 5000).toFixed(3));
}

export function getApproxDimensions(volumetricWeight?: unknown, divisor = 5000) {
  const n = Number(volumetricWeight);
  if (!Number.isFinite(n) || n <= 0) return { length: 0, width: 0, height: 0 };
  const side = Number(Math.cbrt(n * divisor).toFixed(2));
  const dim = sanePackageDim(side);
  return { length: dim, width: dim, height: dim };
}

export function resolveDisplayDims(
  length?: unknown,
  width?: unknown,
  height?: unknown,
  _deadWeight?: unknown
) {
  const l = sanePackageDim(length);
  const w = sanePackageDim(width);
  const h = sanePackageDim(height);
  return {
    length: l || 10,
    width: w || 10,
    height: h || 10,
  };
}

/** Use calculated volumetric from L×W×H when present (including default 10×10×10); otherwise dead/total weight. */
export function volumetricOrDeadWeight(
  length?: unknown,
  width?: unknown,
  height?: unknown,
  deadWeight?: unknown,
  storedVol?: unknown
): number {
  const l = sanePackageDim(length);
  const w = sanePackageDim(width);
  const h = sanePackageDim(height);
  const vol = volumetricFromSaneDims(l, w, h);
  const dead = Number(deadWeight);
  const deadKg = Number.isFinite(dead) && dead > 0 ? Number(dead.toFixed(3)) : 0;
  const stored = Number(storedVol);
  const storedKg = Number.isFinite(stored) && stored > 0 && stored < 500 ? Number(stored.toFixed(3)) : 0;
  if (vol > 0) return vol;
  if (storedKg > 0) return storedKg;
  return deadKg;
}

/** Expand multi-box rows into individual package units for API */
export function expandPackages(rows: BoxRow[]) {
  const packages: {
    boxNo: number;
    length: number;
    width: number;
    height: number;
    deadWeight: number;
    volumetricWeight: number;
  }[] = [];
  let boxNo = 1;
  let totalDead = 0;
  let totalVol = 0;

  for (const row of rows) {
    const count = Math.max(1, Number(row.noOfBox) || 1);
    const w = Number(row.weightPerBox) || 0;
    const l = Number(row.length) || 0;
    const wi = Number(row.width) || 0;
    const h = Number(row.height) || 0;
    const vol = volumetricFromSaneDims(l, wi, h);
    for (let i = 0; i < count; i++) {
      packages.push({
        boxNo: boxNo++,
        length: l,
        width: wi,
        height: h,
        deadWeight: w,
        volumetricWeight: vol,
      });
      totalDead += w;
      totalVol += vol;
    }
  }

  return {
    packages,
    totalDead: Number(totalDead.toFixed(2)),
    totalVol: Number(totalVol.toFixed(3)),
    chargeable: Number(Math.max(totalDead, totalVol).toFixed(2)),
  };
}

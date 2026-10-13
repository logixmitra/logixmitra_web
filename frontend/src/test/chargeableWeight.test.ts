// Chargeable-weight display: couriers bill on whichever is HIGHER, dead weight
// or volumetric weight, and some couriers store grams (3000 = 3 kg) while
// others store kg (3.5). This locks the unit + max(dead, vol) behaviour so a
// 3 kg parcel is never shown as "3000 kg" in Passbook / Shipping Charges /
// Weight Dispute.

const parseWeightValue = (value?: string | number) => {
  const raw = String(value ?? "").trim().toLowerCase();
  const n = Number(raw.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return NaN;
  if (/kg|kilo/.test(raw)) return n;
  if (/\bg\b|gram/.test(raw)) return n / 1000;
  return n >= 100 ? n / 1000 : n;
};

const chargeableWeightOf = (d: {
  previousweight?: string | number;
  totalWeight?: string | number;
  totalVolumetricWeight?: string | number;
}) => {
  const candidates = [d.previousweight, d.totalWeight, d.totalVolumetricWeight]
    .map(parseWeightValue)
    .filter((n) => Number.isFinite(n) && n > 0);
  return candidates.length ? Math.max(...candidates) : NaN;
};

describe("parseWeightValue — unit normalization", () => {
  it("reads explicit kg", () => {
    expect(parseWeightValue("3 Kg")).toBe(3);
    expect(parseWeightValue("20.66")).toBe(20.66);
  });

  it("reads explicit grams", () => {
    expect(parseWeightValue("500 g")).toBe(0.5);
    expect(parseWeightValue("500 gram")).toBe(0.5);
  });

  it("treats a bare number >= 100 as grams (courier grams-scale data)", () => {
    // The real bug: totalWeight = 3000 grams was shown as "3000 kg".
    expect(parseWeightValue(3000)).toBe(3);
    expect(parseWeightValue(6000)).toBe(6);
    expect(parseWeightValue(36000)).toBe(36);
  });

  it("keeps a bare number < 100 as kg", () => {
    expect(parseWeightValue(0.5)).toBe(0.5);
    expect(parseWeightValue(3.5)).toBe(3.5);
    expect(parseWeightValue("1.5")).toBe(1.5);
  });

  it("returns NaN for empty/garbage", () => {
    expect(parseWeightValue("")).toBeNaN();
    expect(parseWeightValue(null)).toBeNaN();
    expect(parseWeightValue("abc")).toBeNaN();
  });
});

describe("chargeableWeightOf — max(dead, volumetric)", () => {
  it("uses the higher volumetric weight when it beats dead weight", () => {
    // REF-2YOO6D1KNA: dead 3.5 kg, volumetric 6.912 kg -> chargeable 6.912
    const kg = chargeableWeightOf({ totalWeight: 3.5, totalVolumetricWeight: 6.912 });
    expect(Number(kg.toFixed(2))).toBe(6.91);
  });

  it("uses the higher dead weight when it beats volumetric", () => {
    // REF-1GBPXJXD2Q: dead 20 kg, volumetric 18.308 kg -> chargeable 20
    expect(chargeableWeightOf({ totalWeight: 20, totalVolumetricWeight: 18.308 })).toBe(20);
  });

  it("normalizes grams-scale dead weight before comparing", () => {
    // REF-WRI3INJWLV: dead 3000 g (=3 kg), volumetric 0.2 kg -> 3, never 3000
    expect(chargeableWeightOf({ totalWeight: 3000, totalVolumetricWeight: 0.2 })).toBe(3);
  });

  it("respects a stored previousweight that is already the chargeable", () => {
    // REF-5B3NPAYDP8: prev 20.66 (volumetric 20.664 beats dead 10)
    const kg = chargeableWeightOf({
      previousweight: "20.66",
      totalWeight: 10,
      totalVolumetricWeight: 20.664,
    });
    expect(Number(kg.toFixed(2))).toBe(20.66);
  });

  it("is NaN when nothing positive is available", () => {
    expect(chargeableWeightOf({})).toBeNaN();
    expect(chargeableWeightOf({ totalWeight: 0, totalVolumetricWeight: 0 })).toBeNaN();
  });
});

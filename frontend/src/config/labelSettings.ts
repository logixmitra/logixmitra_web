export type LabelTemplate = "default" | "compact" | "detailed" | "with_tax";

export interface LabelSettings {
  template: LabelTemplate;
  companyName: string;
  logoUrl: string;
  supportPhone: string;
  gstOnLabel: string;
  footerText: string;
  showWarehouseAddress: boolean;
  showCompanyName: boolean;
  showLogo: boolean;
  showSupportPhone: boolean;
  showGst: boolean;
  showTotal: boolean;
  showOrderBarcode: boolean;
  showAwbBarcode: boolean;
  showAwbQr: boolean;
  showHsnTax: boolean;
  showSku: boolean;
  showDisclaimer: boolean;
  showWeight: boolean;
  showDimensions: boolean;
  showOrderReferenceId: boolean;
  showOrderNo: boolean;
}

export const DEFAULT_LABEL_SETTINGS: LabelSettings = {
  template: "default",
  companyName: "",
  logoUrl: "",
  supportPhone: "",
  gstOnLabel: "",
  footerText: "",
  showWarehouseAddress: true,
  showCompanyName: true,
  showLogo: true,
  showSupportPhone: true,
  showGst: false,
  showTotal: true,
  showOrderBarcode: true,
  showAwbBarcode: true,
  showAwbQr: true,
  showHsnTax: false,
  showSku: true,
  showDisclaimer: true,
  showWeight: false,
  showDimensions: false,
  showOrderReferenceId: false,
  showOrderNo: false,
};

const BOOLEAN_KEYS: (keyof LabelSettings)[] = [
  "showWarehouseAddress",
  "showCompanyName",
  "showLogo",
  "showSupportPhone",
  "showGst",
  "showTotal",
  "showOrderBarcode",
  "showAwbBarcode",
  "showAwbQr",
  "showHsnTax",
  "showSku",
  "showDisclaimer",
  "showWeight",
  "showDimensions",
  "showOrderReferenceId",
  "showOrderNo",
];

export function asLabelBool(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

export function mergeLabelSettings(partial?: Partial<LabelSettings> | null): LabelSettings {
  const src = (partial || {}) as Partial<LabelSettings>;
  const merged: LabelSettings = { ...DEFAULT_LABEL_SETTINGS, ...src };
  for (const key of BOOLEAN_KEYS) {
    (merged as Record<string, unknown>)[key] = asLabelBool(src[key], DEFAULT_LABEL_SETTINGS[key] as boolean);
  }
  return merged;
}

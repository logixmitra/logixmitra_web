import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ChevronDown, ChevronUp, Info, Lightbulb, Plus, Trash2 } from "lucide-react";
import {
  type BoxRow,
  type PackageShipmentType,
  type RovType,
  type SavedPackage,
  emptyBoxRow,
  expandPackages,
  loadSavedPackages,
  persistSavedPackages,
} from "./packageDims";

export type { BoxRow, PackageShipmentType, RovType, SavedPackage };
export { emptyBoxRow, expandPackages, loadSavedPackages, persistSavedPackages };

type Props = {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  errors?: any;
  setErrors?: any;
};

const WeightDimensionsPanel = ({ formData, setFormData, errors = {}, setErrors }: Props) => {
  const [open, setOpen] = useState(true);
  const [saveDims, setSaveDims] = useState(false);
  const [savedPackages, setSavedPackages] = useState<SavedPackage[]>([]);
  const [selectedSaved, setSelectedSaved] = useState<string>("");

  const packageType: PackageShipmentType = formData.packageShipmentType || "SMALL";
  const isHeavy = packageType === "HEAVY";
  const boxRows: BoxRow[] = Array.isArray(formData.boxRows) && formData.boxRows.length
    ? formData.boxRows
    : [emptyBoxRow()];

  useEffect(() => {
    setSavedPackages(loadSavedPackages());
  }, []);

  const smallVol = useMemo(() => {
    const l = Number(formData.pkgLength) || 0;
    const w = Number(formData.pkgWidth) || 0;
    const h = Number(formData.pkgHeight) || 0;
    if (!l || !w || !h) return 0;
    return Number(((l * w * h) / 5000).toFixed(3));
  }, [formData.pkgLength, formData.pkgWidth, formData.pkgHeight]);

  const heavySummary = useMemo(() => expandPackages(boxRows), [boxRows]);

  const totalWeightDisplay = isHeavy
    ? heavySummary.totalDead
    : Number(formData.shipmentWeight) || 0;

  const syncItemDims = (patch: Record<string, any>) => {
    setFormData((f: any) => {
      const items = Array.isArray(f.items) ? [...f.items] : [];
      const merged = { ...f, ...patch };
      const l = Number(patch.pkgLength ?? merged.pkgLength) || 0;
      const w = Number(patch.pkgWidth ?? merged.pkgWidth) || 0;
      const h = Number(patch.pkgHeight ?? merged.pkgHeight) || 0;
      const dead = Number(patch.shipmentWeight ?? merged.shipmentWeight) || 0;
      const vol = l && w && h ? Number(((l * w * h) / 5000).toFixed(3)) : 0;
      if (items.length > 0) {
        const first = { ...items[0] };
        if (patch.pkgLength != null || patch.pkgWidth != null || patch.pkgHeight != null || patch.shipmentWeight != null) {
          if (patch.pkgLength != null) first.length = Number(patch.pkgLength) || undefined;
          if (patch.pkgWidth != null) first.width = Number(patch.pkgWidth) || undefined;
          if (patch.pkgHeight != null) first.height = Number(patch.pkgHeight) || undefined;
          if (patch.shipmentWeight != null) first.deadWeight = Number(patch.shipmentWeight) || undefined;
          // Keep first item dims in sync for API payloads that still read item weight
          if (patch.pkgLength == null && l) first.length = l || first.length;
          if (patch.pkgWidth == null && w) first.width = w || first.width;
          if (patch.pkgHeight == null && h) first.height = h || first.height;
          if (patch.shipmentWeight == null && dead) first.deadWeight = dead || first.deadWeight;
        }
        items[0] = first;
      }
      return {
        ...merged,
        items,
        totalWeight: dead,
        totalVolumetricWeight: vol,
        packages: [
          {
            boxNo: 1,
            length: l,
            width: w,
            height: h,
            deadWeight: dead,
            volumetricWeight: vol,
          },
        ],
      };
    });
  };

  const setPackageType = (v: PackageShipmentType) => {
    setFormData((f: any) => ({
      ...f,
      packageShipmentType: v,
      orderType: v === "HEAVY" ? "B2B_MPS" : "B2C",
      boxRows: v === "HEAVY" ? (f.boxRows?.length ? f.boxRows : [emptyBoxRow()]) : f.boxRows,
    }));
    if (setErrors && errors?.packageShipmentType) {
      setErrors((prev: any) => ({ ...prev, packageShipmentType: null }));
    }
  };

  const updateBoxRow = (index: number, field: keyof BoxRow, value: any) => {
    setFormData((f: any) => {
      const rows = [...(Array.isArray(f.boxRows) && f.boxRows.length ? f.boxRows : [emptyBoxRow()])];
      rows[index] = { ...rows[index], [field]: value };
      const summary = expandPackages(rows);
      const items = Array.isArray(f.items) ? [...f.items] : [];
      if (items[0]) {
        items[0] = {
          ...items[0],
          deadWeight: summary.totalDead || undefined,
          length: Number(rows[0].length) || undefined,
          width: Number(rows[0].width) || undefined,
          height: Number(rows[0].height) || undefined,
        };
      }
      return {
        ...f,
        boxRows: rows,
        shipmentWeight: summary.totalDead,
        packages: summary.packages,
        totalWeight: summary.totalDead,
        totalVolumetricWeight: summary.totalVol,
        orderType: "B2B_MPS",
        items,
      };
    });
  };

  const addBoxRow = () => {
    setFormData((f: any) => ({
      ...f,
      boxRows: [...(f.boxRows || [emptyBoxRow()]), emptyBoxRow()],
    }));
  };

  const removeBoxRow = (index: number) => {
    setFormData((f: any) => {
      const rows = (f.boxRows || [emptyBoxRow()]).filter((_: any, i: number) => i !== index);
      const next = rows.length ? rows : [emptyBoxRow()];
      const summary = expandPackages(next);
      return {
        ...f,
        boxRows: next,
        shipmentWeight: summary.totalDead,
        packages: summary.packages,
        totalWeight: summary.totalDead,
        totalVolumetricWeight: summary.totalVol,
      };
    });
  };

  const applySaved = (id: string) => {
    setSelectedSaved(id);
    const pkg = savedPackages.find((p) => p.id === id);
    if (!pkg) return;
    syncItemDims({
      pkgLength: pkg.length,
      pkgWidth: pkg.width,
      pkgHeight: pkg.height,
      shipmentWeight: pkg.deadWeight ?? formData.shipmentWeight,
    });
  };

  const handleSaveDimsToggle = (checked: boolean) => {
    setSaveDims(checked);
    if (!checked) return;
    const l = Number(formData.pkgLength);
    const w = Number(formData.pkgWidth);
    const h = Number(formData.pkgHeight);
    if (!l || !w || !h) return;
    const entry: SavedPackage = {
      id: `pkg_${Date.now()}`,
      name: `${l}×${w}×${h} cm`,
      length: l,
      width: w,
      height: h,
      deadWeight: Number(formData.shipmentWeight) || undefined,
    };
    const next = [entry, ...savedPackages.filter((p) => !(p.length === l && p.width === w && p.height === h))];
    setSavedPackages(next);
    persistSavedPackages(next);
  };

  const dimError = (side: number | "") => {
    const n = Number(side);
    return n > 306 ? "Max 306 cm" : null;
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-teal-800 text-white text-sm font-semibold"
      >
        <span className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Weight &amp; Dimensions
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
            <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-teal-700" />
            <span>Tip: Add correct values to avoid weight discrepancy</span>
          </div>

          <div className={`grid gap-4 ${isHeavy ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <div className="space-y-2">
              <Label>
                Package Type <span className="text-red-500">*</span>
              </Label>
              <Select value={packageType} onValueChange={(v) => setPackageType(v as PackageShipmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMALL">Small Shipment (Below 10 kg) Single box</SelectItem>
                  <SelectItem value="HEAVY">Heavy Shipment (10 kg or above) Single or Multiple boxes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isHeavy && (
              <div className="space-y-2">
                <Label>Rov Type (Only for Delhivery B2B LTL)</Label>
                <Select
                  value={formData.rovType || "Rov Owner"}
                  onValueChange={(v) => setFormData((f: any) => ({ ...f, rovType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rov Owner">Rov Owner</SelectItem>
                    <SelectItem value="Rov Carrier">Rov Carrier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                Total weight of order {isHeavy && <span className="text-red-500">*</span>}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0.5"
                  step="0.01"
                  placeholder={isHeavy ? "0.00" : "Enter your weight"}
                  value={isHeavy ? totalWeightDisplay || "" : formData.shipmentWeight ?? ""}
                  disabled={isHeavy}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    syncItemDims({ shipmentWeight: isNaN(val) ? "" : val });
                    if (setErrors && errors?.shipmentWeight) {
                      setErrors((prev: any) => ({ ...prev, shipmentWeight: null }));
                    }
                  }}
                  className={`pr-10 ${errors?.shipmentWeight ? "border-red-500" : ""}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Kg</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isHeavy
                  ? "Note : The minimum chargeable weight is 0.50 kg"
                  : "Optional for Small shipments. If entered, minimum is 0.50 kg"}
              </p>
              {errors?.shipmentWeight && <p className="text-xs text-red-500">{errors.shipmentWeight}</p>}
            </div>
          </div>

          {!isHeavy && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>
                    Length <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Enter length"
                      value={formData.pkgLength ?? ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        syncItemDims({ pkgLength: isNaN(val) ? "" : val });
                      }}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CM</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    Width <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Enter width"
                      value={formData.pkgWidth ?? ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        syncItemDims({ pkgWidth: isNaN(val) ? "" : val });
                      }}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CM</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    Height <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Enter height"
                      value={formData.pkgHeight ?? ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        syncItemDims({ pkgHeight: isNaN(val) ? "" : val });
                      }}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CM</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="savePkgDims" checked={saveDims} onCheckedChange={(c) => handleSaveDimsToggle(!!c)} />
                <Label htmlFor="savePkgDims" className="font-normal cursor-pointer">
                  Save package dimensions for future use?
                </Label>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span className="font-medium">OR</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-2 max-w-md">
                <Label>Select package to autofill dimensions</Label>
                <Select value={selectedSaved || undefined} onValueChange={applySaved}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedPackages.length === 0 && (
                      <SelectItem value="__none" disabled>
                        No saved packages
                      </SelectItem>
                    )}
                    {savedPackages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                <Info className="h-4 w-4" />
                Total Volumetric Weight: {smallVol.toFixed(3)}Kg
              </div>
            </>
          )}

          {isHeavy && (
            <div className="space-y-3">
              {boxRows.map((row, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">Box group #{idx + 1}</p>
                    {boxRows.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeBoxRow(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="space-y-2">
                      <Label>
                        No. of box <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={row.noOfBox}
                        onChange={(e) => updateBoxRow(idx, "noOfBox", Math.max(1, parseInt(e.target.value, 10) || 1))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Weight Per Box <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.weightPerBox || ""}
                          onChange={(e) => updateBoxRow(idx, "weightPerBox", parseFloat(e.target.value) || 0)}
                          className="pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Kg</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Length</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Enter length"
                          value={row.length}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updateBoxRow(idx, "length", isNaN(val) ? "" : val);
                          }}
                          className={`pr-10 ${dimError(row.length) ? "border-red-500" : ""}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CM</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Width</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Enter width"
                          value={row.width}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updateBoxRow(idx, "width", isNaN(val) ? "" : val);
                          }}
                          className={`pr-10 ${dimError(row.width) ? "border-red-500" : ""}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CM</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Height <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="Enter height"
                          value={row.height}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updateBoxRow(idx, "height", isNaN(val) ? "" : val);
                          }}
                          className={`pr-10 ${dimError(row.height) ? "border-red-500" : ""}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CM</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Length, width or height can&apos;t be greater than 306cm for each multi-box package
                  </p>
                </div>
              ))}

              <div className="flex justify-center">
                <Button
                  type="button"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-sky-600 hover:bg-sky-700"
                  onClick={addBoxRow}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <div className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                <Info className="h-4 w-4" />
                Total Volumetric Weight: {heavySummary.totalVol.toFixed(3)}Kg · Chargeable: {heavySummary.chargeable.toFixed(2)}Kg · Boxes: {heavySummary.packages.length}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeightDimensionsPanel;

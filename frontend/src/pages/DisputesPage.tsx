import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Scale, CheckCircle, XCircle, Clock, Loader2, Upload, Download, AlertCircle, X } from "lucide-react";
import { UPLOAD_BASE_URL } from "../../services/config";
import { useToast } from "@/hooks/use-toast";
import { orderApi } from "../../services/orderApi";
import { sellerApi } from "../../services/sellerApi";
import { getuser, getuserid, isAdminUser } from "../../services/getbasicdata";
import { apiRequest } from "../../src/apiglobal/apiconfig";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "@/components/ui/alert";

type DisputeOrder = {
  id: string;
  referenceId?: string;
  orderNumber?: string;
  seller?: string | number;
  courier?: string;
  amount?: string | number;
  dispute_status?: string;
  dispute_file?: string;
  dispute_file_?: string;
  previousweight?: string;
  claimweight?: string;
  awb?: string;
  dispute_reason?: string;
  createdAt?: string;
  dispute_created_at?: string;
  orderDate?: string;
  zone?: string;
  warehouse?: string | number;
  financialStatus?: string;
  totalWeight?: string | number;
  totalVolumetricWeight?: string | number;
};

type WeightUploadResult = {
  awb?: string;
  referenceId?: string;
  bookedWeight?: number;
  claimWeight?: number;
  chargedWeight?: number;
  extraKg?: number;
  differenceWeight?: number;
  extraCharge?: number;
  success?: boolean;
  skipped?: boolean;
  reason?: string;
};

type ExcelDisputeRow = {
  awb: string;
  bookedWeight: string;
  claimWeight: string;
  chargedWeight: string;
  differenceWeight: string;
  imageLink: string;
};

const WEIGHT_HEADER = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Weights arrive from two sources with different units: some couriers store
// grams (3000 = 3 kg), others store kg (3.5). An explicit "kg"/"g" unit always
// wins; a bare number >= 100 is grams (kg-scale values stay well below 100),
// so a 3 kg parcel is never displayed as "3000 kg".
const parseWeightValue = (value?: string | number) => {
  const raw = String(value ?? "").trim().toLowerCase();
  const n = Number(raw.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return NaN;
  if (/kg|kilo/.test(raw)) return n;
  if (/\bg\b|gram/.test(raw)) return n / 1000;
  return n >= 100 ? n / 1000 : n;
};

// Booked / "Previous Weight" is always the chargeable weight — couriers bill on
// whichever is higher, dead weight or volumetric weight.
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

const formatCreatedDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const PROOF_SLOTS = 4;

const parseProofFiles = (value?: string) =>
  String(value || "")
    .split(/[,|]/)
    .map((item) => item.trim())
    .filter(Boolean);

const emptyProofs = () => Array.from({ length: PROOF_SLOTS }, () => "");

const toPositiveNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const pickExcelValue = (row: Record<string, unknown>, names: string[]) => {
  const entries = Object.entries(row || {});
  for (const name of names) {
    const exact = entries.find(([key]) => WEIGHT_HEADER(key) === name);
    if (exact && exact[1] != null && String(exact[1]).trim() !== "") return exact[1];
  }
  for (const name of names) {
    const partial = entries.find(([key]) => WEIGHT_HEADER(key).includes(name));
    if (partial && partial[1] != null && String(partial[1]).trim() !== "") return partial[1];
  }
  return "";
};

const DisputesPage = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<DisputeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<DisputeOrder | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<"Rejected" | "In Process">("Rejected");
  const [proofs, setProofs] = useState<string[]>(emptyProofs());
  const [uploadingProof, setUploadingProof] = useState<number | null>(null);
  const [pkgWeightKg, setPkgWeightKg] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [breadthCm, setBreadthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [sellerMap, setSellerMap] = useState<Record<string, { id?: string | number; name?: string }>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{
    processed?: number;
    deductedCount?: number;
    createdCount?: number;
    skippedCount?: number;
    failedCount?: number;
    deductedAmount?: number;
    pendingAmount?: number;
  } | null>(null);
  const [uploadResults, setUploadResults] = useState<WeightUploadResult[]>([]);
  const [selectedWeightFile, setSelectedWeightFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<ExcelDisputeRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canUploadWeights = isAdminUser();

  const resetRejectForm = () => {
    setProofs(emptyProofs());
    setPkgWeightKg("");
    setLengthCm("");
    setBreadthCm("");
    setHeightCm("");
  };

  const claimDims = useMemo(() => {
    const pkgKg = toPositiveNumber(pkgWeightKg);
    const length = toPositiveNumber(lengthCm);
    const breadth = toPositiveNumber(breadthCm);
    const height = toPositiveNumber(heightCm);
    const volumetricKg = length && breadth && height ? Number(((length * breadth * height) / 5000).toFixed(3)) : 0;
    const chargeableKg = Number(Math.max(pkgKg, volumetricKg).toFixed(3));
    return { pkgKg, volumetricKg, chargeableKg };
  }, [pkgWeightKg, lengthCm, breadthCm, heightCm]);

  const resolveSellerName = (sellerId?: string | number) => {
    if (sellerId === undefined || sellerId === null || sellerId === "") return "-";
    const key = String(sellerId);
    return sellerMap[key]?.name || key;
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const result = await orderApi.getAll({ paginate: "false" });
      const list = Array.isArray(result?.orders)
        ? result.orders
        : Array.isArray(result)
          ? result
          : [];

      const disputed = list.filter(
        (x: DisputeOrder) =>
          x?.dispute_status != null &&
          String(x.dispute_status).trim() !== ""
      );
      setOrders(disputed);

      try {
        if (getuser()?.role === "admin") {
          const sellers = await sellerApi.getAll();
          const map: Record<string, { id?: string | number; name?: string }> = {};
          if (Array.isArray(sellers)) {
            for (const s of sellers) {
              if (s?.id != null) map[String(s.id)] = s;
            }
          }
          setSellerMap(map);
        } else {
          const me = await sellerApi.getById(getuserid());
          setSellerMap(me?.id != null ? { [String(me.id)]: me } : {});
        }
      } catch (sellerErr) {
        console.warn("Failed to load sellers for disputes:", sellerErr);
      }
    } catch (error) {
      console.error("Failed to fetch disputes:", error);
      setOrders([]);
      toast({
        title: "Error",
        description: "Failed to fetch disputes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((d) => {
      const ref = String(d.referenceId || "").toLowerCase();
      const orderNo = String(d.orderNumber || "").toLowerCase();
      const awb = String(d.awb || "").toLowerCase();
      const courier = String(d.courier || "").toLowerCase();
      const seller = resolveSellerName(d.seller).toLowerCase();
      const status = String(d.dispute_status || "").toLowerCase();
      return (
        ref.includes(q) ||
        orderNo.includes(q) ||
        awb.includes(q) ||
        courier.includes(q) ||
        seller.includes(q) ||
        status.includes(q)
      );
    });
  }, [orders, search, sellerMap]);

  const stats = useMemo(() => {
    const statusOf = (d: DisputeOrder) => String(d.dispute_status || "").toLowerCase();
    const open = orders.filter((d) => statusOf(d) === "disputed").length;
    const inProcess = orders.filter((d) => statusOf(d) === "in process").length;
    const approved = orders.filter(
      (d) =>
        statusOf(d) === "approved" ||
        statusOf(d) === "accepted" ||
        statusOf(d) === "rejection accepted"
    ).length;
    const rejected = orders.filter(
      (d) => statusOf(d) === "rejected" || statusOf(d) === "rejection rejected"
    ).length;
    const charged = orders.filter((d) => statusOf(d) === "charged").length;
    return {
      open,
      total: orders.length,
      inProcess,
      approved,
      rejected,
      charged,
    };
  }, [orders]);

  const displayStatus = (d: DisputeOrder) => {
    const status = String(d.dispute_status || "");
    if (status === "Disputed") return "Pending";
    if (status === "Charged") return "Settled (Auto Charged)";
    if (status === "Approved" || status === "Accepted") return "Settled (Accepted)";
    if (status === "In Process") return "In Process";
    if (status === "Rejection Accepted") return "Rejection Accepted";
    if (status === "Rejection Rejected") return "Rejection Rejected";
    if (status === "Resolved") return "Resolved";
    return status || "-";
  };

  const formatDisputeCharge = (reason?: string) => {
    const match = String(reason || "").match(/extraCharge\s*=\s*([\d.]+)/i);
    const value = match ? Number(match[1]) : NaN;
    return Number.isFinite(value) && value > 0 ? `₹${value.toFixed(2)}` : "-";
  };

  const downloadWeightTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "AWB*": "1234567890",
        "Booked Weight (kg)": 0.5,
        "Claim Weight (kg)*": 1.5,
        "Difference Weight(kg)": 1,
        "Image Link/Image": "",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weight Dispute");
    XLSX.writeFile(wb, "weight_dispute_template.xlsx");
  };

  const parseWeightExcelRows = async (file: File): Promise<ExcelDisputeRow[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    if (!rawRows.length) return [];
    return rawRows
      .map((row) => ({
        awb: String(pickExcelValue(row, ["awb", "waybill", "tracking number", "tracking", "lr number", "lr no", "docket"])).trim(),
        bookedWeight: String(pickExcelValue(row, ["booked weight", "previous weight", "dead weight", "declared weight", "booked wt"])),
        claimWeight: String(pickExcelValue(row, ["claim weight", "claim wt", "claimed weight"])),
        chargedWeight: String(pickExcelValue(row, [
          "charged weight",
          "applied weight",
          "actual weight",
          "billed weight",
          "charged wt",
        ])),
        differenceWeight: String(pickExcelValue(row, [
          "difference weight",
          "deference weight",
          "weight difference",
          "extra weight",
          "extra kg",
          "diff weight",
          "diff wt",
        ])),
        imageLink: String(pickExcelValue(row, [
          "image link image",
          "image link",
          "image url",
          "photo",
          "image",
        ])),
      }))
      .filter(
        (row) => row.awb || row.claimWeight || row.chargedWeight || row.differenceWeight || row.imageLink
      );
  };

  // Closes the upload dialog and clears every field so the next upload starts fresh.
  const resetUploadDialog = () => {
    setUploadOpen(false);
    setUploadSummary(null);
    setUploadResults([]);
    setSelectedWeightFile(null);
    setPreviewRows([]);
    setPreviewLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Runs as soon as a file is chosen so the overview appears before submitting.
  const handleFileSelected = async (file: File | null) => {
    setSelectedWeightFile(file);
    setUploadSummary(null);
    setUploadResults([]);
    setPreviewRows([]);
    if (!file) return;
    setPreviewLoading(true);
    try {
      const rows = await parseWeightExcelRows(file);
      setPreviewRows(rows);
      if (!rows.length) {
        toast({
          title: "No valid rows",
          description: "Excel needs an AWB column and Claim Weight.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Could not read file",
        description: error?.message || "Failed to read the selected Excel.",
        variant: "destructive",
      });
      setSelectedWeightFile(null);
      setPreviewRows([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setPreviewLoading(false);
    }
  };

  const submitWeightExcel = (event?: FormEvent) => {
    event?.preventDefault();
    const file = fileInputRef.current?.files?.[0] || selectedWeightFile;
    if (!file) {
      toast({
        title: "Select Excel",
        description: "Choose a weight dispute Excel file, then click Submit.",
        variant: "destructive",
      });
      return;
    }
    handleWeightExcel(file);
  };

  const handleWeightExcel = async (file: File) => {
    setUploadProcessing(true);
    setUploadSummary(null);
    setUploadResults([]);
    try {
      const rows = await parseWeightExcelRows(file);
      if (!rows.length) {
        toast({
          title: "No valid rows",
          description: "Excel needs an AWB column and Claim Weight.",
          variant: "destructive",
        });
        return;
      }

      const result = await orderApi.uploadWeightDisputes(rows);
      const createdCount = result?.createdCount || 0;
      const failedCount = result?.failedCount || 0;
      setUploadSummary({
        processed: result?.processed,
        deductedCount: result?.deductedCount,
        createdCount: result?.createdCount,
        skippedCount: result?.skippedCount,
        failedCount: result?.failedCount,
        deductedAmount: result?.deductedAmount,
        pendingAmount: result?.pendingAmount,
      });
      setUploadResults(Array.isArray(result?.results) ? result.results : []);
      toast({
        title: "Weight file processed",
        description: `${createdCount} dispute(s) created${failedCount ? `, ${failedCount} failed` : ""}. Wallet will deduct only after charge approval.`,
      });
      await fetchOrders();
      setUploadProcessing(false);
      // Clean run → close the dialog so no stale file/results remain.
      // Rows with failures stay visible so they can be corrected and re-uploaded.
      if (failedCount === 0) {
        resetUploadDialog();
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.response?.data?.error || error?.message || "Could not process Excel",
        variant: "destructive",
      });
    } finally {
      setUploadProcessing(false);
    }
  };

  const openPreview = async (filename?: string) => {
    if (!filename) {
      toast({ title: "No file", description: "Proof file not available", variant: "destructive" });
      return;
    }
    // Image links open directly in a new tab for the seller.
    if (/^https?:\/\//i.test(filename.trim())) {
      window.open(filename.trim(), "_blank", "noopener,noreferrer");
      return;
    }
    setPreviewOpen(true);
    try {
      const previewRes = await fetch(`${UPLOAD_BASE_URL}/preview/${filename}`);
      const previewHtml = await previewRes.text();
      const el = document.getElementById("fileopen");
      if (el) el.innerHTML = previewHtml;
    } catch (err) {
      console.error(err);
      toast({ title: "Preview failed", description: "Could not load proof file", variant: "destructive" });
    }
  };

  const uploadDocument = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProof(index);
    try {
      const formdata = new FormData();
      formdata.append("file", file);
      // UPLOAD_BASE_URL already ends with "/upload" — posting to
      // `${UPLOAD_BASE_URL}/upload` ("/upload/upload") hits no route server-side.
      const uploadRes = await fetch(`${UPLOAD_BASE_URL}`, {
        method: "POST",
        body: formdata,
      });
      const uploadData = (await uploadRes.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        filename?: string;
        fileInfo?: { filename?: string };
      };
      const name = uploadData?.filename || uploadData?.fileInfo?.filename || "";
      if (!uploadRes.ok || !name) {
        toast({
          title: "Upload failed",
          description: uploadData?.message || uploadData?.error || "No filename returned",
          variant: "destructive",
        });
        return;
      }
      setProofs((prev) => {
        const next = [...prev];
        next[index] = name;
        return next;
      });
      toast({ title: `Proof ${index + 1} uploaded`, description: name });
    } catch (err) {
      console.error(err);
      toast({ title: "Upload failed", description: "Could not upload proof", variant: "destructive" });
    } finally {
      setUploadingProof(null);
      e.target.value = "";
    }
  };

  const approveReject = async (tmpod: DisputeOrder | null, statuss: string) => {
    if (!tmpod?.referenceId) {
      toast({ title: "Invalid order", variant: "destructive" });
      return;
    }
    const proofFiles = proofs.filter(Boolean);
    const needsProof = statuss === "Rejected" || statuss === "In Process";
    if (needsProof && proofFiles.length === 0) {
      toast({ title: "Please upload at least one proof", variant: "destructive" });
      return;
    }
    if (statuss === "Rejected") {
      if (!toPositiveNumber(pkgWeightKg) || !toPositiveNumber(lengthCm) || !toPositiveNumber(breadthCm) || !toPositiveNumber(heightCm)) {
        toast({
          title: "Claim details required",
          description: "Enter package weight, length, breadth and height.",
          variant: "destructive",
        });
        return;
      }
    }

    setActionLoading(true);
    try {
      const payload: Record<string, unknown> = {
        dispute_status: statuss,
        referenceId: tmpod.referenceId,
        dispute_file_: tmpod?.dispute_file_ || "",
        previousweight: tmpod?.previousweight || "",
        // Keep the dispute's claim weight intact — the proof's chargeable
        // weight is only evidence (recorded in dispute_reason). Overwriting
        // claimweight made the difference weight collapse to 0 / "-".
        claimweight: tmpod?.claimweight || "",
        dispute_reason: needsProof
          ? `${tmpod?.dispute_reason || "Weight Dispute"} | pkgWeightKg=${pkgWeightKg} | L=${lengthCm} | B=${breadthCm} | H=${heightCm} | volKg=${claimDims.volumetricKg} | chargeableKg=${claimDims.chargeableKg}`
          : tmpod?.dispute_reason || "",
      };
      // Only dialog-based rejections touch the proof list, so other actions
      // never wipe the proofs already on the dispute.
      if (needsProof) {
        const existingProofFiles = parseProofFiles(tmpod.dispute_file);
        payload.dispute_file = [...new Set([...existingProofFiles, ...proofFiles])].join(",");
      }

      if (statuss === "Approved") {
        const claim = parseWeightValue(tmpod.claimweight);
        const zone = String(tmpod.zone || "").trim();
        const warehouseId = tmpod.warehouse;
        if (!(claim > 0)) {
          toast({
            title: "Claim weight missing",
            description: "Claim weight is required to calculate the charge.",
            variant: "destructive",
          });
          return;
        }
        if (!zone || warehouseId == null || String(warehouseId).trim() === "") {
          toast({
            title: "Zone or warehouse missing",
            description: "This order has no saved zone or warehouse, so freight cannot be calculated.",
            variant: "destructive",
          });
          return;
        }
        payload.zone = zone;
        payload.warehouse = warehouseId;
        payload.claimweight = String(claim);
      }

      const response = await apiRequest("POST", "orders/dispute_order", payload, {});
      const ok =
        response?.data?.status === 200 ||
        response?.data?.message === "success" ||
        response?.status === 200;

      if (!ok && (response?.data?.status === 400 || response?.status === 400)) {
        throw new Error(response?.data?.message || response?.message || "Update failed");
      }

      const deducted = Number(response?.data?.data?.deduct?.amount);
      const titles: Record<string, string> = {
        Approved: isAdminUser() ? "Dispute approved" : "Charge accepted",
        "Rejection Rejected": "Rejection rejected — charge deducted",
        "Rejection Accepted": "Rejection accepted — no charge",
        "In Process": "Proof submitted to admin",
        Resolved: "Dispute resolved",
        Rejected: "Dispute rejected",
        delete: "Dispute deleted",
      };
      toast({
        title: titles[statuss] || "Dispute updated",
        description:
          statuss === "Approved" || statuss === "Rejection Rejected"
            ? deducted > 0
              ? `₹${deducted.toFixed(2)} extra freight deducted for ${tmpod.referenceId}`
              : `No extra freight for ${tmpod.referenceId}`
            : statuss === "delete"
              ? `Dispute removed for ${tmpod.referenceId}`
              : `Order ${tmpod.referenceId} marked as ${statuss}`,
        variant: statuss === "Rejected" || statuss === "Rejection Rejected" ? "destructive" : "default",
      });
      setRejectOpen(false);
      setSelectedDispute(null);
      resetRejectForm();
      await fetchOrders();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Action failed",
        description: err?.message || "Could not update dispute",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout title="Weight Dispute" subtitle="Pending disputes auto-approve and deduct extra freight 7 days after created date">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard title="Total Weight Disputes" value={String(stats.total)} icon={<Scale className="h-5 w-5" />} />
          <StatCard title="Pending" value={String(stats.open)} icon={<Clock className="h-5 w-5" />} variant="warning" />
          <StatCard title="In Process" value={String(stats.inProcess)} icon={<AlertCircle className="h-5 w-5" />} />
          <StatCard title="Approved" value={String(stats.approved)} icon={<CheckCircle className="h-5 w-5" />} variant="success" />
          <StatCard title="Auto Charged" value={String(stats.charged)} icon={<Scale className="h-5 w-5" />} />
          <StatCard title="Rejected" value={String(stats.rejected)} icon={<XCircle className="h-5 w-5" />} variant="destructive" />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search weight disputes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            {canUploadWeights ? (
              <>
                <Button variant="outline" size="sm" onClick={downloadWeightTemplate} className="gap-2">
                  <Download className="h-4 w-4" /> Template
                </Button>
                <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-2">
                  <Upload className="h-4 w-4" /> Upload Weight Excel
                </Button>
              </>
            ) : null}
            <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "AWB Number",
                      "Created Date",
                      "Seller",
                      "Courier",
                      "Amount",
                      "Status",
                      "Proof",
                      "Previous Weight",
                      "Claim Weight",
                      "Difference Weight",
                      "Charge (₹)",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading disputes...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={12}>
                        <EmptyState title="No weight disputes found" description="Weight disputed orders will appear here." />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d) => (
                      <tr key={d.id || d.referenceId} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4 text-sm font-medium text-foreground">
                          {d.awb || d.referenceId || d.orderNumber || "-"}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                          {formatCreatedDate(d.dispute_created_at || d.createdAt || d.orderDate)}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {resolveSellerName(d.seller)}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{d.courier || "-"}</td>
                        <td className="py-3 px-4 text-sm font-medium text-foreground">{d.amount ?? "-"}</td>
                        <td className="py-3 px-4 text-sm">{displayStatus(d)}</td>
                        <td className="py-3 px-4 text-sm font-medium text-foreground">
                          {(() => {
                            const proofsForView = [
                              ...(d.dispute_file_ ? [d.dispute_file_] : []),
                              ...parseProofFiles(d.dispute_file),
                            ];
                            if (!proofsForView.length) {
                              return <span className="text-muted-foreground">-</span>;
                            }
                            return (
                              <div className="flex flex-wrap gap-1">
                                {proofsForView.map((file, i) => (
                                  <button
                                    key={`${file}-${i}`}
                                    type="button"
                                    className="text-blue-600 hover:underline"
                                    onClick={() => openPreview(file)}
                                  >
                                    View{i > 0 ? ` ${i + 1}` : ""}
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-foreground">
                          {(() => {
                            const booked = chargeableWeightOf(d);
                            return Number.isFinite(booked) ? `${booked.toFixed(2)} kg` : d.previousweight || "-";
                          })()}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-foreground">
                          {d.claimweight || "-"}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-foreground">
                          {(() => {
                            const prev = chargeableWeightOf(d);
                            const claim = parseWeightValue(d.claimweight);
                            if (!Number.isFinite(prev) || !Number.isFinite(claim)) return "-";
                            const diff = claim - prev;
                            return diff > 0 ? (
                              <span className="text-red-600 font-semibold">+{diff.toFixed(2)} kg</span>
                            ) : (
                              "-"
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-foreground">
                          {formatDisputeCharge(d.dispute_reason)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {d.dispute_status === "Disputed" && (
                              <>
                                {canUploadWeights ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-success"
                                    disabled={actionLoading}
                                    onClick={() => {
                                      if (confirm("Approve and deduct extra freight from seller wallet?")) {
                                        approveReject(d, "Approved");
                                      }
                                    }}
                                  >
                                    Approve
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-success"
                                    disabled={actionLoading}
                                    onClick={() => {
                                      if (confirm("Accept this weight dispute? Extra freight will be deducted from your wallet.")) {
                                        approveReject(d, "Approved");
                                      }
                                    }}
                                  >
                                    Accept
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    setSelectedDispute(d);
                                    resetRejectForm();
                                    setRejectTarget(canUploadWeights ? "Rejected" : "In Process");
                                    setRejectOpen(true);
                                  }}
                                >
                                  Reject
                                </Button>
                                {canUploadWeights ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={actionLoading}
                                      onClick={() => {
                                        if (confirm("Resolve this dispute without any wallet deduction?")) {
                                          approveReject(d, "Resolved");
                                        }
                                      }}
                                    >
                                      Resolve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive"
                                      disabled={actionLoading}
                                      onClick={() => {
                                        if (confirm("Delete this weight dispute permanently?")) {
                                          approveReject(d, "delete");
                                        }
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                ) : null}
                              </>
                            )}
                            {d.dispute_status === "In Process" && canUploadWeights ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-success"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    if (confirm("Accept the seller's proof? No charges will be deducted from the seller.")) {
                                      approveReject(d, "Rejection Accepted");
                                    }
                                  }}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    if (confirm("Reject the seller's proof? The dispute charge will be deducted from the seller wallet.")) {
                                      approveReject(d, "Rejection Rejected");
                                    }
                                  }}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    if (confirm("Resolve this dispute without any wallet deduction?")) {
                                      approveReject(d, "Resolved");
                                    }
                                  }}
                                >
                                  Resolve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    if (confirm("Delete this weight dispute permanently?")) {
                                      approveReject(d, "delete");
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Proof Preview</DialogTitle>
          </DialogHeader>
          <div id="fileopen" style={{ maxHeight: "70vh", overflowY: "auto" }} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) {
            setSelectedDispute(null);
            resetRejectForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {rejectTarget === "In Process" ? "Reject Dispute (send proof to admin)" : "Reject Dispute"} — {selectedDispute?.referenceId}
            </DialogTitle>
            <DialogDescription>
              {rejectTarget === "In Process"
                ? "Upload proof — it goes directly to the admin for review."
                : "Enter claim weight details and upload proof."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pkgWeightKg">Package Weight</Label>
              <div className="relative">
                <Input
                  id="pkgWeightKg"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Enter weight in kg"
                  value={pkgWeightKg}
                  onChange={(e) => setPkgWeightKg(e.target.value)}
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lengthCm">Length</Label>
                <Input
                  id="lengthCm"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="L"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breadthCm">Breadth</Label>
                <Input
                  id="breadthCm"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="B"
                  value={breadthCm}
                  onChange={(e) => setBreadthCm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heightCm">Height</Label>
                <div className="relative">
                  <Input
                    id="heightCm"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="H"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">cm</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Volumetric weight will be calculated based on these weights
            </p>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm space-y-1">
              <p>Volumetric weight: <strong>{claimDims.volumetricKg || 0} kg</strong></p>
              <p>Chargeable weight: <strong>{claimDims.chargeableKg || 0} kg</strong> (higher of package vs volumetric)</p>
            </div>

            <p className="text-sm text-muted-foreground">Upload up to 4 proofs. At least 1 is required.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {proofs.map((file, index) => (
                <div key={index} className="rounded-md border border-border p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Proof {index + 1}</p>
                  {file ? (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:underline truncate"
                        onClick={() => openPreview(file)}
                      >
                        {file}
                      </button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() =>
                          setProofs((prev) => {
                            const next = [...prev];
                            next[index] = "";
                            return next;
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={uploadingProof !== null}
                      onClick={() => document.getElementById(`fileupload-${index}`)?.click()}
                    >
                      {uploadingProof === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "↑ Upload Proof"
                      )}
                    </Button>
                  )}
                  <input
                    type="file"
                    id={`fileupload-${index}`}
                    hidden
                    onChange={(e) => uploadDocument(e, index)}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectOpen(false);
                resetRejectForm();
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={() => approveReject(selectedDispute, rejectTarget)}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : rejectTarget === "In Process" ? (
                "Submit Proof"
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (open) {
            setUploadOpen(true);
          } else {
            resetUploadDialog();
          }
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onFocusOutside={(event) => event.preventDefault()}
        >
          <form onSubmit={submitWeightExcel} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Upload Weight Dispute Excel</DialogTitle>
            <DialogDescription>
              Upload courier weight Excel with claim weight. Extra weight is claim weight minus booked weight. Freight is calculated from the rate card. Wallet is deducted only after the charge is approved — not on Excel upload.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Columns: <strong>AWB*</strong> and <strong>Claim Weight (kg)*</strong> are mandatory. Optional:{" "}
              <strong>Booked Weight (kg)</strong>, <strong>Difference Weight(kg)</strong>, <strong>Image Link/Image</strong>.
              If booked weight is blank, the order&apos;s booked weight is used. Difference = claim − booked, and the extra
              charge is calculated from the seller rate card (zone + weight slab). Wallet is deducted only after approval,
              not on Excel upload.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={uploadProcessing}
                onChange={(e) => {
                  handleFileSelected(e.target.files?.[0] || null);
                }}
              />
              <Button type="button" variant="outline" onClick={downloadWeightTemplate} className="gap-2">
                <Download className="h-4 w-4" /> Template
              </Button>
            </div>
            {selectedWeightFile ? (
              <p className="text-sm text-foreground">Selected: {selectedWeightFile.name}</p>
            ) : null}
            {previewLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading file overview...
              </div>
            ) : null}
            {previewRows.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-foreground">
                  Overview — {previewRows.length} row(s) found
                </p>
                <div className="overflow-x-auto max-h-60 border rounded-md">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        {["#", "AWB", "Booked Weight (kg)", "Claim Weight (kg)", "Difference Weight(kg)", "Image Link/Image"].map((h) => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={`${row.awb || "row"}-${index}`} className="border-b border-border/50">
                          <td className="py-2 px-3 text-muted-foreground">{index + 1}</td>
                          <td className="py-2 px-3">{row.awb || "-"}</td>
                          <td className="py-2 px-3">{row.bookedWeight || "-"}</td>
                          <td className="py-2 px-3">{row.claimWeight || row.chargedWeight || "-"}</td>
                          <td className="py-2 px-3">{row.differenceWeight || "-"}</td>
                          <td className="py-2 px-3 max-w-[180px] truncate" title={row.imageLink}>
                            {row.imageLink || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {uploadProcessing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Comparing weights and creating disputes...
              </div>
            ) : null}
            {uploadSummary ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Processed {uploadSummary.processed || 0}: {uploadSummary.createdCount || 0} dispute(s) created, {uploadSummary.skippedCount || 0} skipped, {uploadSummary.failedCount || 0} failed. No wallet deduction on upload.
                </AlertDescription>
              </Alert>
            ) : null}
            {uploadResults.length > 0 ? (
              <div className="overflow-x-auto max-h-72 border rounded-md">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {["AWB", "Booked", "Claim Weight", "Diff Weight", "Result"].map((h) => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResults.map((row, index) => (
                      <tr key={`${row.awb || row.referenceId || index}`} className="border-b border-border/50">
                        <td className="py-2 px-3">{row.awb || row.referenceId || "-"}</td>
                        <td className="py-2 px-3">{row.bookedWeight ?? "-"}</td>
                        <td className="py-2 px-3">{row.claimWeight ?? row.chargedWeight ?? "-"}</td>
                        <td className="py-2 px-3">{row.differenceWeight ?? row.extraKg ?? "-"}</td>
                        <td className={`py-2 px-3 ${row.success ? "text-green-700" : "text-red-600"}`}>
                          {row.reason || (row.success ? "OK" : "Failed")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetUploadDialog} disabled={uploadProcessing}>
              Close
            </Button>
            <Button type="submit" disabled={uploadProcessing}>
              {uploadProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DisputesPage;

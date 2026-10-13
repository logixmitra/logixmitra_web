import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import {
  INVOICE_LOGO_DATA_URL,
  INVOICE_SIGNATURE_DATA_URL,
  INVOICE_STAMP_DATA_URL,
} from "./invoiceAssets";

pdfMake.vfs = (pdfFonts as any).vfs || (pdfFonts as any).pdfMake?.vfs;

export type BillingDocType = "invoice" | "credit" | "debit";

export interface BillingParty {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst?: string;
  phone?: string;
  email?: string;
}

export interface BillingLineItem {
  itemNo?: string;
  description: string;
  qty?: number | string;
  hsn?: string;
  unitPrice?: number | string;
  total?: number | string;
}

export interface BillingDocumentInput {
  docType: BillingDocType;
  billNo?: string;
  date?: string;
  billTo?: BillingParty;
  shipTo?: BillingParty;
  requisitioner?: string;
  shipVia?: string;
  fob?: string;
  terms?: string;
  items: BillingLineItem[];
  /** GST-inclusive grand total (₹). Subtotal/IGST derived at 18% when not provided. */
  totalAmount: number;
  subtotal?: number;
  igst?: number;
  discount?: number | string;
  roundOff?: number | string;
  referenceId?: string;
}

const COMPANY = {
  name: "LogixMitra",
  tagline: "YOUR TRUSTED LOGISTICS PARTNER.",
  address:
    "First Floor, Enkay Tower, Plot no B&B1, Vanijya Nikunj, Udyog Vihar Phase 5, Gurugram, Haryana, 122016",
  addressHtml:
    "First Floor, Enkay Tower, Plot no B&amp;B1, Vanijya Nikunj,<br/>Udyog Vihar Phase 5, Gurugram, Haryana, 122016",
  gst: "06EAYPK2060J1ZA",
  phone: "+91 96256 82005",
  email: "logixmitra@gmail.com",
  contactName: "Mayank Kumar",
  bank: {
    holder: "LogixMitra",
    account: "002661900008688",
    ifsc: "YESB0000026",
    branch: "Yes Bank, IMT Manesar",
  },
};

const DOC_META: Record<
  BillingDocType,
  { title: string; prefix: string; defaultDesc: string }
> = {
  invoice: {
    title: "Tax Invoice",
    prefix: "LOGIX",
    defaultDesc: "E-Commerce Courier Charge",
  },
  credit: {
    title: "Credit Note",
    prefix: "LOGIX/CN",
    defaultDesc: "E-Commerce Courier Charge",
  },
  debit: {
    title: "Debit Note",
    prefix: "LOGIX/DN",
    defaultDesc: "E-Commerce Courier Charge",
  },
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseMoney(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = parseFloat(String(value ?? "").replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function formatMoney(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPartyBlock(party?: BillingParty): string {
  const cityState = [party?.city, party?.state].filter(Boolean).join(", ");
  const lines = [
    party?.name || "Customer",
    party?.address || "",
    cityState,
    party?.pincode ? `Pin ${party.pincode}` : "",
    party?.gst ? `GSTIN: ${party.gst}` : "",
  ].filter(Boolean);
  return lines.map((l) => escapeHtml(l)).join("<br/>");
}

function paddedItems(items: BillingLineItem[], minRows = 6): BillingLineItem[] {
  const next = [...items];
  while (next.length < minRows) {
    next.push({
      itemNo: "",
      description: "",
      qty: "",
      hsn: "",
      unitPrice: "",
      total: "-",
    });
  }
  return next;
}

function deriveTotals(input: BillingDocumentInput) {
  const total = parseMoney(input.totalAmount);
  const subtotal =
    input.subtotal != null ? parseMoney(input.subtotal) : +(total / 1.18).toFixed(2);
  const igst =
    input.igst != null ? parseMoney(input.igst) : +(total - subtotal).toFixed(2);
  const discountRaw = input.discount;
  const discount =
    discountRaw === "" || discountRaw == null
      ? null
      : parseMoney(discountRaw);
  const computed = +(subtotal + igst - (discount || 0)).toFixed(2);
  const roundOff =
    input.roundOff === "" || input.roundOff == null
      ? +(total - computed).toFixed(2)
      : parseMoney(input.roundOff);
  return { total, subtotal, igst, discount, roundOff };
}

export function firstOfNextMonthLabel(year: number, month: number): string {
  const d = new Date(year, month, 1);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function monthPeriodLabel(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  return `01-${mm}-${year} to ${String(last).padStart(2, "0")}-${mm}-${year}`;
}

export function monthlyBillNo(year: number, month: number, sellerKey?: string): string {
  const base = `LOGIX${String(year).slice(-2)}${String(month).padStart(2, "0")}`;
  if (!sellerKey) return base;
  const tail = String(sellerKey).replace(/\D/g, "").slice(-3);
  return tail ? `${base}${tail}` : base;
}

export function buildBillingDocumentHtml(input: BillingDocumentInput): string {
  const meta = DOC_META[input.docType] || DOC_META.invoice;
  const { total, subtotal, igst, discount, roundOff } = deriveTotals(input);
  const billNo =
    input.billNo ||
    `${meta.prefix}${String(input.referenceId || Date.now()).replace(/\D/g, "").slice(-4).padStart(4, "0") || "0001"}`;
  const dateStr = input.date || new Date().toLocaleDateString("en-GB");
  const shipTo = input.shipTo || input.billTo;
  const navy = "#1f4e79";

  const items = paddedItems(
    input.items?.length
      ? input.items
      : [
          {
            itemNo: "01",
            description: meta.defaultDesc,
            qty: "",
            hsn: "996812",
            unitPrice: "",
            total: formatMoney(subtotal),
          },
        ]
  );

  const rowsHtml = items
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.itemNo || "")}</td>
        <td class="left">${escapeHtml(item.description || "")}</td>
        <td>${escapeHtml(item.qty ?? "")}</td>
        <td>${escapeHtml(item.hsn || "")}</td>
        <td>${escapeHtml(item.unitPrice ?? "")}</td>
        <td>${escapeHtml(item.total ?? "-")}</td>
      </tr>`
    )
    .join("");

  const discountText = discount && discount !== 0 ? formatMoney(discount) : "-";
  const roundOffText = roundOff && roundOff !== 0 ? formatMoney(roundOff) : "-";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(meta.title)} - ${escapeHtml(billNo)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Calibri, Arial, Helvetica, sans-serif;
      color: #111;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      border: 1.6px solid #111;
      padding: 10px 12px 8px;
    }
    .doc-title {
      text-align: center;
      margin: 0 0 6px;
      font-size: 26px;
      font-weight: 700;
      color: #5b9bd5;
      letter-spacing: 0.3px;
    }
    .header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: start;
      margin-bottom: 10px;
    }
    .logo { width: 220px; height: auto; display: block; margin-bottom: 6px; }
    .company-meta {
      font-size: 11px;
      line-height: 1.45;
      color: #111;
      max-width: 360px;
    }
    table.id-meta { border-collapse: collapse; margin-top: 28px; }
    table.id-meta td {
      font-size: 12px;
      padding: 3px 6px;
      white-space: nowrap;
    }
    table.id-meta td.lbl { font-weight: 700; text-align: right; padding-right: 8px; }
    table.id-meta td.box {
      border: 1px solid #111;
      min-width: 110px;
      text-align: center;
      font-weight: 600;
    }
    .party-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid ${navy};
    }
    .party + .party { border-left: 1px solid ${navy}; }
    .party-h {
      background: ${navy};
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      padding: 5px 8px;
      letter-spacing: 0.4px;
    }
    .party-b {
      padding: 8px;
      font-size: 11.5px;
      line-height: 1.4;
      min-height: 78px;
    }
    table.meta, table.lines, table.totals {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    table.meta th, table.lines th {
      background: ${navy};
      color: #fff;
      font-size: 11px;
      padding: 6px;
      border: 1px solid ${navy};
      text-align: center;
      font-weight: 700;
    }
    table.meta td {
      height: 22px;
      border: 1px solid #111;
      font-size: 11px;
      text-align: center;
    }
    table.lines td {
      border: 1px solid #111;
      font-size: 11.5px;
      padding: 5px 6px;
      text-align: center;
      height: 22px;
      vertical-align: middle;
    }
    table.lines td.left { text-align: left; }
    .bottom {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 18px;
      margin-top: 10px;
      align-items: start;
    }
    .bank { border: 1px solid #94a3b8; }
    .bank-h, .sign-h {
      background: #d9d9d9;
      padding: 5px 8px;
      font-size: 12px;
      font-weight: 700;
      border-bottom: 1px solid #94a3b8;
    }
    .bank-b { padding: 8px; font-size: 11.5px; line-height: 1.55; }
    .sign { margin-top: 10px; border: 1px solid #94a3b8; }
    .sign-body { padding: 6px 8px 8px; }
    .sign-row { display: flex; align-items: center; gap: 10px; min-height: 78px; }
    .sig { height: 68px; width: auto; }
    .stamp { height: 82px; width: auto; }
    .who { font-size: 12px; margin-top: 2px; }
    table.totals { margin-top: 0; }
    table.totals td {
      font-size: 12px;
      padding: 5px 8px;
      border: 1px solid #111;
    }
    table.totals td.label { width: 58%; font-weight: 700; }
    table.totals td.amt { text-align: right; }
    table.totals tr.grand td {
      background: #b4c7e7;
      font-weight: 800;
      font-size: 13px;
    }
    .footer {
      margin-top: 16px;
      text-align: center;
      font-size: 11px;
      color: #111;
    }
    @media print {
      body { margin: 0; }
      .sheet { border-width: 1.4px; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="doc-title">${escapeHtml(meta.title)}</div>
    <div class="header">
      <div>
        <img class="logo" src="${INVOICE_LOGO_DATA_URL}" alt="LogixMitra" />
        <div class="company-meta">
          ${COMPANY.addressHtml}<br/>
          GST No: ${escapeHtml(COMPANY.gst)}<br/>
          Phone:${escapeHtml(COMPANY.phone)}<br/>
          Email Id- ${escapeHtml(COMPANY.email)}
        </div>
      </div>
      <table class="id-meta">
        <tr>
          <td class="lbl">DATE</td>
          <td class="box">${escapeHtml(dateStr)}</td>
        </tr>
        <tr>
          <td class="lbl">Bill no #</td>
          <td class="box">${escapeHtml(billNo)}</td>
        </tr>
      </table>
    </div>

    <div class="party-row">
      <div class="party">
        <div class="party-h">BILL TO</div>
        <div class="party-b">${formatPartyBlock(input.billTo)}</div>
      </div>
      <div class="party">
        <div class="party-h">SHIP TO</div>
        <div class="party-b">${formatPartyBlock(shipTo)}</div>
      </div>
    </div>

    <table class="meta">
      <thead>
        <tr>
          <th>REQUISITIONER</th>
          <th>SHIP VIA</th>
          <th>F.O.B.</th>
          <th>TERMS</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(input.requisitioner || "")}</td>
          <td>${escapeHtml(input.shipVia || "")}</td>
          <td>${escapeHtml(input.fob || "")}</td>
          <td>${escapeHtml(input.terms || "")}</td>
        </tr>
      </tbody>
    </table>

    <table class="lines">
      <thead>
        <tr>
          <th style="width:9%">ITEM #</th>
          <th>DESCRIPTION</th>
          <th style="width:8%">QTY</th>
          <th style="width:12%">HSN</th>
          <th style="width:14%">UNIT PRICE</th>
          <th style="width:14%">TOTAL</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="bottom">
      <div>
        <div class="bank">
          <div class="bank-h">Bank Details</div>
          <div class="bank-b">
            <div>Account Holder Name : ${escapeHtml(COMPANY.bank.holder)}</div>
            <div>A/c No - ${escapeHtml(COMPANY.bank.account)}</div>
            <div>IFSC Code - ${escapeHtml(COMPANY.bank.ifsc)}</div>
            <div>Bank Name &amp; Branch : ${escapeHtml(COMPANY.bank.branch)}</div>
          </div>
        </div>
        <div class="sign">
          <div class="sign-h">For ${escapeHtml(COMPANY.name)}</div>
          <div class="sign-body">
            <div class="sign-row">
              <img class="sig" src="${INVOICE_SIGNATURE_DATA_URL}" alt="Signature" />
              <img class="stamp" src="${INVOICE_STAMP_DATA_URL}" alt="Stamp" />
            </div>
            <div class="who">Authorized Signatory</div>
          </div>
        </div>
      </div>
      <div>
        <table class="totals">
          <tr><td class="label">SUBTOTAL</td><td class="amt">${formatMoney(subtotal)}</td></tr>
          <tr><td class="label">IGST</td><td class="amt">${formatMoney(igst)}</td></tr>
          <tr><td class="label">Discount</td><td class="amt">${discountText}</td></tr>
          <tr><td class="label">Round Off</td><td class="amt">${roundOffText}</td></tr>
          <tr class="grand"><td class="label">TOTAL</td><td class="amt">₹ ${formatMoney(total)}</td></tr>
        </table>
      </div>
    </div>

    <div class="footer">
      If you have any questions about this ${escapeHtml(meta.title)}, please contact<br/>
      ${escapeHtml(COMPANY.contactName)}, +91-${escapeHtml(COMPANY.phone.replace(/\D/g, ""))}, ${escapeHtml(COMPANY.email)}
    </div>
  </div>
</body>
</html>`;
}

function printHtmlViaIframe(html: string): void {
  const existing = document.getElementById("lm-billing-print-frame");
  if (existing) existing.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "lm-billing-print-frame";
  iframe.title = "Print document";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;
  if (!frameWindow || !frameDoc) {
    iframe.remove();
    throw new Error("Unable to prepare print view.");
  }

  const cleanup = () => {
    setTimeout(() => {
      try {
        iframe.remove();
      } catch (_) {
        /* ignore */
      }
    }, 1000);
  };

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const triggerPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      cleanup();
    }
  };

  // Wait for layout/fonts before printing
  if (frameDoc.readyState === "complete") {
    setTimeout(triggerPrint, 150);
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 150);
  }
}

export function printBillingDocument(input: BillingDocumentInput): void {
  printHtmlViaIframe(buildBillingDocumentHtml(input));
}

export function printBillingDocuments(inputs: BillingDocumentInput[]): void {
  if (!inputs.length) {
    throw new Error("Nothing to print.");
  }
  if (inputs.length === 1) {
    printBillingDocument(inputs[0]);
    return;
  }

  const sample = buildBillingDocumentHtml(inputs[0]);
  const styleMatch = sample.match(/<style>([\s\S]*?)<\/style>/i);
  const sharedStyles = styleMatch?.[1] || "";

  const sheets = inputs
    .map((input) => {
      const full = buildBillingDocumentHtml(input);
      const bodyMatch = full.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const inner = (bodyMatch?.[1] || "").trim();
      return `<div class="print-doc">${inner}</div>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Print documents</title>
  <style>
${sharedStyles}
    .print-doc { page-break-after: always; break-after: page; }
    .print-doc:last-child { page-break-after: auto; break-after: auto; }
  </style>
</head>
<body>
${sheets}
</body>
</html>`;

  printHtmlViaIframe(html);
}

export function resolveDocTypeFromTab(tab: string): BillingDocType | null {
  if (tab === "invoices") return "invoice";
  if (tab === "credit") return "credit";
  if (tab === "debit") return "debit";
  return null;
}

export function filterWalletItemsByMonth<T extends { dateISO?: string; date?: string }>(
  items: T[],
  year: number,
  month: number
): T[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return (items || []).filter((item) => {
    const iso = String(item.dateISO || "").slice(0, 10);
    if (iso) return iso.startsWith(prefix);
    const dmy = String(item.date || "");
    const m = dmy.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return false;
    return Number(m[3]) === year && Number(m[2]) === month;
  });
}

export function lastDayOfMonthLabel(year: number, month: number): string {
  const d = new Date(year, month, 0);
  return d.toLocaleDateString("en-GB");
}

export function monthYearLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function buildMonthlyInvoiceInput(
  items: Parameters<typeof walletItemToBillingDoc>[0][],
  opts: { year: number; month: number; sellerKey?: string }
): BillingDocumentInput {
  const sorted = [...items].sort((a, b) =>
    String(a.dateISO || a.date || "").localeCompare(String(b.dateISO || b.date || ""))
  );
  const first = sorted[0] || ({} as (typeof sorted)[0]);
  const total = sorted.reduce((sum, item) => sum + parseMoney(item.amount), 0);
  const subtotal = +(total / 1.18).toFixed(2);
  const igst = +(total - subtotal).toFixed(2);
  const seq = `${opts.year}${String(opts.month).padStart(2, "0")}`;
  const party: BillingParty = {
    name: first.sellerName || "Customer",
    address: first.sellerAddress,
    city: first.sellerCity,
    state: first.sellerState,
    pincode: first.sellerPincode,
    gst: first.sellerGst,
    phone: first.sellerPhone,
  };

  return {
    docType: "invoice",
    billNo: monthlyBillNo(opts.year, opts.month, opts.sellerKey),
    date: firstOfNextMonthLabel(opts.year, opts.month),
    billTo: party,
    shipTo: party,
    items: [
      {
        itemNo: "01",
        description: DOC_META.invoice.defaultDesc,
        qty: "",
        hsn: "996812",
        unitPrice: "",
        total: formatMoney(subtotal),
      },
      {
        itemNo: "",
        description: `Billing for the period of ${monthPeriodLabel(opts.year, opts.month)}`,
        qty: "",
        hsn: "",
        unitPrice: "",
        total: "-",
      },
    ],
    totalAmount: total,
    subtotal,
    igst,
    referenceId: seq,
  };
}

export function buildMonthlyInvoiceInputs(
  items: Parameters<typeof walletItemToBillingDoc>[0][],
  year: number,
  month: number
): BillingDocumentInput[] {
  const monthItems = filterWalletItemsByMonth(items, year, month);
  const groups = new Map<string, typeof monthItems>();
  for (const item of monthItems) {
    const key = String(
      (item as { sellerId?: string | number; sellerName?: string }).sellerId ||
        item.sellerName ||
        "seller"
    );
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }
  const multi = groups.size > 1;
  return Array.from(groups.entries()).map(([key, list]) =>
    buildMonthlyInvoiceInput(list, { year, month, sellerKey: multi ? key : undefined })
  );
}

function partyLines(party?: BillingParty): string {
  const cityState = [party?.city, party?.state].filter(Boolean).join(", ");
  return [
    party?.name || "Customer",
    party?.address || "",
    cityState,
    party?.pincode ? `Pin ${party.pincode}` : "",
    party?.gst ? `GSTIN: ${party.gst}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function billingDocToPdfContent(input: BillingDocumentInput): any[] {
  const meta = DOC_META[input.docType] || DOC_META.invoice;
  const { total, subtotal, igst, discount, roundOff } = deriveTotals(input);
  const billNo =
    input.billNo ||
    `${meta.prefix}${String(input.referenceId || Date.now()).replace(/\D/g, "").slice(-4).padStart(4, "0") || "0001"}`;
  const dateStr = input.date || new Date().toLocaleDateString("en-GB");
  const shipTo = input.shipTo || input.billTo;
  const items = paddedItems(
    input.items?.length
      ? input.items
      : [
          {
            itemNo: "01",
            description: meta.defaultDesc,
            qty: "",
            hsn: "996812",
            unitPrice: "",
            total: formatMoney(subtotal),
          },
        ]
  );
  const discountText = discount && discount !== 0 ? formatMoney(discount) : "-";
  const roundOffText = roundOff && roundOff !== 0 ? formatMoney(roundOff) : "-";

  const navy = "#1f4e79";
  const boxLine = {
    hLineColor: () => "#111",
    vLineColor: () => "#111",
    hLineWidth: () => 0.8,
    vLineWidth: () => 0.8,
  };
  const headerCell = (text: string, extra: Record<string, unknown> = {}) => ({
    text,
    color: "#fff",
    fillColor: navy,
    bold: true,
    fontSize: 9,
    alignment: "center",
    margin: [2, 4, 2, 4],
    ...extra,
  });

  return [
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                { text: meta.title, fontSize: 20, bold: true, color: "#5b9bd5", alignment: "center", margin: [0, 0, 0, 8] },
                {
                  columns: [
                    {
                      width: "*",
                      stack: [
                        { image: INVOICE_LOGO_DATA_URL, width: 168, margin: [0, 0, 0, 6] },
                        {
                          text: "First Floor, Enkay Tower, Plot no B&B1, Vanijya Nikunj,\nUdyog Vihar Phase 5, Gurugram, Haryana, 122016",
                          fontSize: 8,
                          color: "#111",
                        },
                        { text: `GST No: ${COMPANY.gst}`, fontSize: 8 },
                        { text: `Phone:${COMPANY.phone}`, fontSize: 8 },
                        { text: `Email Id- ${COMPANY.email}`, fontSize: 8 },
                      ],
                    },
                    {
                      width: 160,
                      margin: [0, 22, 0, 0],
                      table: {
                        widths: [52, 90],
                        body: [
                          [
                            { text: "DATE", bold: true, fontSize: 9, alignment: "right", margin: [0, 3, 6, 3], border: [false, false, false, false] },
                            { text: dateStr, fontSize: 9, alignment: "center", margin: [4, 3, 4, 3] },
                          ],
                          [
                            { text: "Bill no #", bold: true, fontSize: 9, alignment: "right", margin: [0, 3, 6, 3], border: [false, false, false, false] },
                            { text: billNo, fontSize: 9, alignment: "center", margin: [4, 3, 4, 3] },
                          ],
                        ],
                      },
                      layout: {
                        hLineColor: (i: number) => (i === 0 || i === 2 ? "#111" : "#fff"),
                        vLineColor: (i: number) => (i === 0 ? "#fff" : "#111"),
                        hLineWidth: (i: number) => (i === 0 || i === 2 ? 0.8 : 0),
                        vLineWidth: (i: number) => (i === 0 ? 0 : 0.8),
                      },
                    },
                  ],
                  columnGap: 12,
                  margin: [0, 0, 0, 10],
                },
                {
                  table: {
                    widths: ["*", "*"],
                    body: [
                      [
                        { text: "BILL TO", color: "#fff", fillColor: navy, bold: true, fontSize: 9, margin: [6, 4, 6, 4] },
                        { text: "SHIP TO", color: "#fff", fillColor: navy, bold: true, fontSize: 9, margin: [6, 4, 6, 4] },
                      ],
                      [
                        { text: partyLines(input.billTo), fontSize: 9, margin: [6, 6, 6, 8] },
                        { text: partyLines(shipTo), fontSize: 9, margin: [6, 6, 6, 8] },
                      ],
                    ],
                  },
                  layout: {
                    hLineColor: () => navy,
                    vLineColor: () => navy,
                  },
                  margin: [0, 0, 0, 8],
                },
                {
                  table: {
                    widths: ["*", "*", "*", "*"],
                    body: [
                      [headerCell("REQUISITIONER"), headerCell("SHIP VIA"), headerCell("F.O.B."), headerCell("TERMS")],
                      [
                        { text: input.requisitioner || "", fontSize: 8, alignment: "center", margin: [2, 4, 2, 4] },
                        { text: input.shipVia || "", fontSize: 8, alignment: "center", margin: [2, 4, 2, 4] },
                        { text: input.fob || "", fontSize: 8, alignment: "center", margin: [2, 4, 2, 4] },
                        { text: input.terms || "", fontSize: 8, alignment: "center", margin: [2, 4, 2, 4] },
                      ],
                    ],
                  },
                  layout: boxLine,
                  margin: [0, 0, 0, 8],
                },
                {
                  table: {
                    headerRows: 1,
                    widths: [40, "*", 36, 50, 64, 58],
                    body: [
                      [
                        headerCell("ITEM #"),
                        headerCell("DESCRIPTION"),
                        headerCell("QTY"),
                        headerCell("HSN"),
                        headerCell("UNIT PRICE"),
                        headerCell("TOTAL"),
                      ],
                      ...items.map((item) => {
                        const cell = (text: string, align: "left" | "center" = "center") => ({
                          text: text || "",
                          fontSize: 8,
                          alignment: align,
                          margin: [3, 3, 3, 3],
                        });
                        return [
                          cell(String(item.itemNo || "")),
                          cell(String(item.description || ""), "left"),
                          cell(String(item.qty ?? "")),
                          cell(String(item.hsn || "")),
                          cell(String(item.unitPrice ?? "")),
                          cell(String(item.total ?? "-")),
                        ];
                      }),
                    ],
                  },
                  layout: boxLine,
                  margin: [0, 0, 0, 10],
                },
                {
                  columns: [
                    {
                      width: "*",
                      stack: [
                        {
                          table: {
                            widths: ["*"],
                            body: [
                              [{ text: "Bank Details", bold: true, fontSize: 9, fillColor: "#d9d9d9", margin: [6, 4, 6, 4] }],
                              [
                                {
                                  text: [
                                    `Account Holder Name : ${COMPANY.bank.holder}\n`,
                                    `A/c No - ${COMPANY.bank.account}\n`,
                                    `IFSC Code - ${COMPANY.bank.ifsc}\n`,
                                    `Bank Name & Branch : ${COMPANY.bank.branch}`,
                                  ],
                                  fontSize: 8,
                                  margin: [6, 6, 6, 6],
                                },
                              ],
                            ],
                          },
                          layout: {
                            hLineColor: () => "#94a3b8",
                            vLineColor: () => "#94a3b8",
                          },
                        },
                        {
                          table: {
                            widths: ["*"],
                            body: [
                              [{ text: `For ${COMPANY.name}`, bold: true, fontSize: 9, fillColor: "#d9d9d9", margin: [6, 4, 6, 4] }],
                              [
                                {
                                  columns: [
                                    { image: INVOICE_SIGNATURE_DATA_URL, width: 120, margin: [4, 4, 0, 2] },
                                    { image: INVOICE_STAMP_DATA_URL, width: 70, margin: [4, 2, 4, 2] },
                                  ],
                                },
                              ],
                              [{ text: "Authorized Signatory", fontSize: 9, margin: [6, 0, 6, 6] }],
                            ],
                          },
                          layout: {
                            hLineColor: () => "#94a3b8",
                            vLineColor: () => "#94a3b8",
                          },
                          margin: [0, 8, 0, 0],
                        },
                      ],
                    },
                    {
                      width: 190,
                      table: {
                        widths: ["*", 70],
                        body: [
                          [
                            { text: "SUBTOTAL", bold: true, fontSize: 9, margin: [4, 3, 4, 3] },
                            { text: formatMoney(subtotal), fontSize: 9, alignment: "right", margin: [4, 3, 4, 3] },
                          ],
                          [
                            { text: "IGST", bold: true, fontSize: 9, margin: [4, 3, 4, 3] },
                            { text: formatMoney(igst), fontSize: 9, alignment: "right", margin: [4, 3, 4, 3] },
                          ],
                          [
                            { text: "Discount", bold: true, fontSize: 9, margin: [4, 3, 4, 3] },
                            { text: discountText, fontSize: 9, alignment: "right", margin: [4, 3, 4, 3] },
                          ],
                          [
                            { text: "Round Off", bold: true, fontSize: 9, margin: [4, 3, 4, 3] },
                            { text: roundOffText, fontSize: 9, alignment: "right", margin: [4, 3, 4, 3] },
                          ],
                          [
                            { text: "TOTAL", bold: true, fontSize: 10, fillColor: "#b4c7e7", margin: [4, 4, 4, 4] },
                            {
                              text: `₹ ${formatMoney(total)}`,
                              bold: true,
                              fontSize: 10,
                              fillColor: "#b4c7e7",
                              alignment: "right",
                              margin: [4, 4, 4, 4],
                            },
                          ],
                        ],
                      },
                      layout: boxLine,
                    },
                  ],
                  columnGap: 16,
                },
                {
                  text: `If you have any questions about this ${meta.title}, please contact\n${COMPANY.contactName}, +91-${COMPANY.phone.replace(/\D/g, "")}, ${COMPANY.email}`,
                  fontSize: 8,
                  alignment: "center",
                  margin: [0, 14, 0, 2],
                },
              ],
              margin: [8, 8, 8, 8],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 1.4,
        vLineWidth: () => 1.4,
        hLineColor: () => "#111",
        vLineColor: () => "#111",
      },
    },
  ];
}

function ensurePdfMake() {
  return pdfMake;
}

export function downloadBillingDocumentsPdf(
  inputs: BillingDocumentInput[],
  filename: string
): Promise<void> {
  if (!inputs.length) {
    return Promise.reject(new Error("Nothing to download."));
  }
  const pdfMake = ensurePdfMake();
  const content: any[] = [];
  inputs.forEach((input, index) => {
    if (index > 0) content.push({ text: "", pageBreak: "before" });
    content.push(...billingDocToPdfContent(input));
  });
  const docDefinition = {
    pageSize: "A4",
    pageMargins: [28, 28, 28, 36],
    content,
    defaultStyle: { font: "Roboto" },
  };
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).download(filename);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export const MONTHLY_INVOICE_SHEET_HEADERS = [
  "Transaction ID",
  "RefenceID",
  "Type",
  "Amount",
  "Zone",
  "Weight",
  "Payment Mode",
  "Description",
  "Date",
  "Status",
] as const;

export type InvoiceSheetItem = {
  transactionId?: string;
  referenceId?: string;
  type?: string;
  amount?: string | number;
  zone?: string;
  weight?: string;
  paymentMode?: string;
  description?: string;
  date?: string;
  dateISO?: string;
  status?: string;
  sellerName?: string;
};

export function signedInvoiceAmount(item: { amount?: string | number; type?: string }): number {
  const abs = parseMoney(item.amount);
  return String(item.type || "").toLowerCase() === "credit" ? -abs : abs;
}

export function walletItemToInvoiceSheetRow(item: InvoiceSheetItem): string[] {
  const amount = item.amount;
  const amountText =
    typeof amount === "number" ? `₹${formatMoney(amount)}` : String(amount || "");
  return [
    String(item.transactionId || ""),
    String(item.referenceId || "-"),
    String(item.type || "").toUpperCase(),
    amountText,
    String(item.zone || "-"),
    String(item.weight || "-"),
    String(item.paymentMode || "-"),
    String(item.description || ""),
    String(item.date || ""),
    String(item.status || ""),
  ];
}

function monthlyInvoiceSheetHtml(items: InvoiceSheetItem[], year: number, month: number): string {
  const monthLabel = monthYearLabel(year, month);
  const rows = items.map(walletItemToInvoiceSheetRow);
  const total = items.reduce((sum, item) => sum + signedInvoiceAmount(item), 0);
  const body = rows
    .map((cols) => `<tr>${cols.map((c, i) => `<td class="${i === 3 || i === 7 ? "left" : ""}">${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${escapeHtml(monthLabel)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; }
    h1 { margin: 0 0 4px; font-size: 18px; color: #1e3a8a; }
    .meta { margin: 0 0 10px; color: #334155; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; }
    th { background: #1e3a8a; color: #fff; font-size: 10px; text-transform: uppercase; }
    td.left { text-align: left; }
    tfoot td { font-weight: 700; background: #f1f5f9; }
  </style>
</head>
<body>
  <h1>LogixMitra Invoice</h1>
  <p class="meta">${escapeHtml(monthLabel)} · ${items.length} rows · Total bill: ₹${escapeHtml(formatMoney(total))}</p>
  <table>
    <thead><tr>${MONTHLY_INVOICE_SHEET_HEADERS.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
    <tbody>${body}</tbody>
    <tfoot>
      <tr>
        <td colspan="3">Total Bill</td>
        <td>₹${escapeHtml(formatMoney(total))}</td>
        <td colspan="6"></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
}

export function printMonthlyInvoiceSheet(
  items: InvoiceSheetItem[],
  year: number,
  month: number
): void {
  const inputs = buildMonthlyInvoiceInputs(
    items as Parameters<typeof walletItemToBillingDoc>[0][],
    year,
    month
  );
  if (!inputs.length) throw new Error("No invoices found for the selected month.");
  printBillingDocuments(inputs);
}

export function downloadMonthlyInvoicePdf(
  items: InvoiceSheetItem[],
  year: number,
  month: number
): Promise<void> {
  const inputs = buildMonthlyInvoiceInputs(
    items as Parameters<typeof walletItemToBillingDoc>[0][],
    year,
    month
  );
  if (!inputs.length) {
    return Promise.reject(new Error("No invoices found for the selected month."));
  }
  const label = monthYearLabel(year, month).replace(/\s+/g, "-");
  return downloadBillingDocumentsPdf(inputs, `Tax_Invoice_${label}.pdf`);
}

export function walletItemToBillingDoc(
  item: {
    transactionId: string;
    referenceId?: string;
    amount: string | number;
    description?: string;
    date?: string;
    sellerName?: string;
    sellerAddress?: string;
    sellerCity?: string;
    sellerState?: string;
    sellerPincode?: string;
    sellerGst?: string;
    sellerPhone?: string;
  },
  docType: BillingDocType
): BillingDocumentInput {
  const total = parseMoney(item.amount);
  const subtotal = +(total / 1.18).toFixed(2);
  const meta = DOC_META[docType];
  const seq = String(item.transactionId || item.referenceId || "")
    .replace(/\D/g, "")
    .slice(-4)
    .padStart(4, "0");

  const billTo: BillingParty = {
    name: item.sellerName || "Customer",
    address: item.sellerAddress,
    city: item.sellerCity,
    state: item.sellerState,
    pincode: item.sellerPincode,
    gst: item.sellerGst,
    phone: item.sellerPhone,
  };

  return {
    docType,
    billNo: `${meta.prefix}${seq || "0001"}`,
    date: item.date,
    billTo,
    shipTo: billTo,
    items: [
      {
        itemNo: "01",
        description: item.description || meta.defaultDesc,
        qty: "",
        hsn: "996812",
        unitPrice: "",
        total: formatMoney(subtotal),
      },
    ],
    totalAmount: total,
    subtotal,
    referenceId: item.referenceId || item.transactionId,
  };
}

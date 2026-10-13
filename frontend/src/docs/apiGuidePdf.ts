import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
// Standard (AFM) Courier font container — required because the guide uses
// font: "Courier" for code blocks and only Roboto ships as a default font.
import courierFontContainer from "pdfmake/build/standard-fonts/Courier";
import {
  API_GUIDE_META,
  BASE_URL,
  API_OVERVIEW,
  API_PREREQUISITES,
  API_QUICK_START,
  ORDER_STATUSES,
  ERROR_CODES,
  API_BEST_PRACTICES,
  groupedEndpoints,
  buildCurl,
  type ApiEndpoint,
} from "./apiSetupGuide";

const pdfMakeAny = pdfMake as any;

// pdfmake 0.3.x no longer reads a `vfs` property — fonts must be registered
// through addVirtualFileSystem()/addFontContainer(). The old
// `pdfMake.vfs = ...` assignment was a silent no-op, so do it properly here.
const rawFonts = pdfFonts as any;
const vfsDict = rawFonts?.vfs || rawFonts?.pdfMake?.vfs || rawFonts?.default || rawFonts;
if (vfsDict) {
  if (typeof pdfMakeAny.addVirtualFileSystem === "function") {
    pdfMakeAny.addVirtualFileSystem(vfsDict);
  } else {
    // Fallback for older pdfmake builds that read the `vfs` property.
    pdfMakeAny.vfs = vfsDict;
  }
}

const courierContainer = (courierFontContainer as any)?.default || courierFontContainer;
if (courierContainer && typeof pdfMakeAny.addFontContainer === "function") {
  pdfMakeAny.addFontContainer(courierContainer);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = any;

const TEAL = "#0f766e";
const SLATE = "#334155";
const LIGHT = "#f1f5f9";

const h1 = (text: string): Block => ({
  text,
  fontSize: 16,
  bold: true,
  color: TEAL,
  margin: [0, 16, 0, 6],
});

const h2 = (text: string): Block => ({ text, fontSize: 12, bold: true, color: SLATE, margin: [0, 10, 0, 4] });

const para = (text: string): Block => ({ text, fontSize: 9.5, color: "#1e293b", margin: [0, 2, 0, 4], lineHeight: 1.35 });

const mono = (text: string, fill = LIGHT): Block => ({
  text,
  fontSize: 7.6,
  font: "Courier",
  color: "#0f172a",
  fillColor: fill,
  margin: [4, 4, 4, 6],
  lineHeight: 1.25,
});

const codeBlock = (label: string, code: string): Block => ({
  stack: [{ text: label, fontSize: 8, bold: true, color: "#64748b", margin: [0, 4, 0, 1] }, mono(code)],
});

const bulletList = (items: string[]): Block => ({
  ul: items.map((item) => ({ text: item, fontSize: 9.5, color: "#1e293b", margin: [0, 1, 0, 1] })),
  margin: [0, 2, 0, 6],
});

const table = (widths: string[], header: string[], body: Block[][]): Block => ({
  table: { headerRows: 1, widths, body: [header.map((cell) => ({ text: cell, bold: true, fontSize: 8.5, color: "#ffffff" })), ...body] },
  layout: {
    fillColor: (rowIndex: number) => (rowIndex === 0 ? TEAL : rowIndex % 2 === 0 ? "#f8fafc" : "#ffffff"),
    hLineColor: () => "#cbd5e1",
    vLineColor: () => "#cbd5e1",
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    paddingLeft: () => 5,
    paddingRight: () => 5,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  },
  margin: [0, 2, 0, 8],
});

const methodBadge = (method: string) => method;

function paramTable(title: string, params: ApiEndpoint["body"]): Block | null {
  if (!params?.length) return null;
  return {
    stack: [
      { text: title, fontSize: 8.5, bold: true, color: "#475569", margin: [0, 4, 0, 2] },
      table(
        ["22%", "14%", "10%", "54%"],
        ["Field", "Type", "Required", "Description"],
        params.map((param) => [
          { text: param.name, fontSize: 8, font: "Courier" },
          { text: param.type, fontSize: 8 },
          { text: param.required ? "Yes" : "No", fontSize: 8, bold: param.required, color: param.required ? "#b91c1c" : "#64748b" },
          { text: param.description, fontSize: 8 },
        ]),
      ),
    ],
  };
}

export function buildApiGuideDoc(): Block {
  const content: Block[] = [];

  content.push({
    stack: [
      { text: API_GUIDE_META.title, fontSize: 24, bold: true, color: TEAL },
      { text: API_GUIDE_META.product, fontSize: 12, color: SLATE, margin: [0, 4, 0, 0] },
      {
        text: `${API_GUIDE_META.version}  •  Updated ${API_GUIDE_META.updated}  •  Support: ${API_GUIDE_META.supportEmail}`,
        fontSize: 9,
        color: "#64748b",
        margin: [0, 6, 0, 2],
      },
      { text: "Base URL: " + BASE_URL, fontSize: 9, bold: true, color: "#0f172a", margin: [0, 2, 0, 10] },
      { canvas: [{ type: "line", lineWidth: 2, lineColor: TEAL, x1: 0, y1: 0, x2: 515, y2: 0 }] },
    ],
    margin: [0, 0, 0, 6],
  });

  content.push(h1("1. Overview"));
  content.push(bulletList(API_OVERVIEW));

  content.push(h1("2. Prerequisites"));
  content.push(bulletList(API_PREREQUISITES));

  content.push(h1("3. Quick start"));
  content.push(
    table(
      ["6%", "24%", "70%"],
      ["#", "Step", "What to do"],
      API_QUICK_START.map((step) => [
        { text: step.step, fontSize: 8.5, bold: true, color: TEAL },
        { text: step.title, fontSize: 8.5, bold: true },
        { text: step.detail, fontSize: 8.5 },
      ]),
    ),
  );

  content.push(h1("4. Authentication"));
  content.push(
    para(
      "Protected endpoints require a Bearer token obtained from POST /auth/login. Store the token on your server and send it as: Authorization: Bearer <token>. The token is valid for " +
        API_GUIDE_META.tokenValidity +
        " — refresh it when a call returns 401.",
    ),
  );
  content.push(codeBlock("Example", 'curl -X POST "' + BASE_URL + '/auth/login" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"email":"seller@logixmitra.com","password":"YourPassword@123"}\''));

  content.push({ text: "5. API Endpoints", fontSize: 16, bold: true, color: TEAL, margin: [0, 16, 0, 2] });
  content.push(para("All paths below are appended to the Base URL. Auth = Token means the Authorization: Bearer header is required."));

  for (const group of groupedEndpoints()) {
    content.push(h2(group.group));
    content.push(
      table(
        ["10%", "40%", "36%", "14%"],
        ["Method", "Endpoint", "Purpose", "Auth"],
        group.endpoints.map((endpoint) => [
          { text: methodBadge(endpoint.method), fontSize: 8, bold: true, color: endpoint.method === "GET" ? "#0369a1" : "#7c3aed" },
          { text: endpoint.path, fontSize: 8, font: "Courier" },
          { text: endpoint.name, fontSize: 8 },
          { text: endpoint.auth === "token" ? "Token" : "Public", fontSize: 8 },
        ]),
      ),
    );

    for (const endpoint of group.endpoints) {
      content.push({
        text: `${endpoint.method}  ${endpoint.path}`,
        fontSize: 10,
        bold: true,
        color: "#0f172a",
        fillColor: "#e2e8f0",
        margin: [6, 8, 6, 3],
      });
      content.push(para(endpoint.description));
      const queryTable = paramTable("Query parameters", endpoint.query as any);
      const bodyTable = paramTable("Request body", endpoint.body);
      if (queryTable) content.push(queryTable);
      if (bodyTable) content.push(bodyTable);
      if (endpoint.requestExample) content.push(codeBlock("Request example", endpoint.requestExample));
      if (endpoint.responseExample) content.push(codeBlock("Response example", endpoint.responseExample));
      content.push(codeBlock("cURL", buildCurl(endpoint)));
      if (endpoint.notes?.length) content.push({ text: "Notes", fontSize: 8.5, bold: true, color: "#475569", margin: [0, 2, 0, 1] }, bulletList(endpoint.notes));
    }
  }

  content.push({ text: "6. Order statuses", fontSize: 16, bold: true, color: TEAL, margin: [0, 16, 0, 4], pageBreak: "before" });
  content.push(para("These are the exact status values used by the Orders screen and returned by order/tracking endpoints."));
  const statusColumns: Block[][] = [];
  for (let i = 0; i < ORDER_STATUSES.length; i += 5) {
    const row: Block[] = ORDER_STATUSES.slice(i, i + 5).map((status) => ({
      text: status,
      fontSize: 8.5,
      bold: true,
      color: "#0f172a",
      fillColor: (i / 5) % 2 === 0 ? "#f8fafc" : "#ffffff",
      margin: [4, 3, 4, 3],
    }));
    // Pad the final row so every row has a cell per column — pdfmake throws
    // "Malformed table row, a cell is undefined" otherwise.
    while (row.length < 5) row.push({ text: "", fontSize: 8.5 });
    statusColumns.push(row);
  }
  content.push({
    table: { widths: ["20%", "20%", "20%", "20%", "20%"], body: statusColumns },
    layout: "noBorders",
    margin: [0, 2, 0, 8],
  });

  content.push(h1("7. HTTP status codes & fixes"));
  content.push(
    table(
      ["12%", "44%", "44%"],
      ["Code", "Meaning", "How to fix"],
      ERROR_CODES.map((item) => [
        { text: item.code, fontSize: 8.5, bold: true, color: item.code.startsWith("2") ? "#15803d" : "#b91c1c" },
        { text: item.meaning, fontSize: 8.5 },
        { text: item.fix, fontSize: 8.5 },
      ]),
    ),
  );

  content.push(h1("8. Best practices"));
  content.push(bulletList(API_BEST_PRACTICES));

  content.push({ canvas: [{ type: "line", lineWidth: 1, lineColor: "#cbd5e1", x1: 0, y1: 0, x2: 515, y2: 0 }], margin: [0, 8, 0, 4] });
  content.push({
    text: `Questions? Write to ${API_GUIDE_META.supportEmail} or call ${API_GUIDE_META.supportPhone}. — ${API_GUIDE_META.title}, ${API_GUIDE_META.version}`,
    fontSize: 8.5,
    color: "#64748b",
    alignment: "center",
  });

  // pdfmake requires a doc-definition *object* with a `content` array.
  // Returning the bare array made createPdf() throw synchronously
  // ("Parameter 'docDefinition' has an invalid type. Object expected."),
  // which surfaced as the "Could not build the PDF" toast.
  return {
    info: {
      title: API_GUIDE_META.title,
      author: "LogixMitra",
      subject: API_GUIDE_META.product,
    },
    pageSize: "A4",
    pageMargins: [40, 48, 40, 48],
    defaultStyle: { font: "Roboto", fontSize: 9.5, color: "#1e293b" },
    content,
  };
}

export function downloadApiGuidePdf(): Promise<void> {
  // Return the promise so callers can surface async rendering/font errors.
  return pdfMake.createPdf(buildApiGuideDoc()).download("LogixMitra-API-Setup-Guide.pdf");
}

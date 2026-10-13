import type { LabelSettings } from "@/config/labelSettings";

const SAMPLE = {
  courier: "Delhivery",
  awb: "1234567890123",
  customerName: "Rahul Sharma",
  address: "12 MG Road, Andheri East\nMumbai, Maharashtra, India\n400069\nContact : 9876543210",
  payment: "COD",
  booked: "24 Aug 2026, 10:30",
  orderDate: "24 Aug 2026",
  referenceId: "REF-10021",
  orderNumber: "ORD-7821",
  sku: "TSHIRT-BLK",
  itemName: "Classic Cotton Tee",
  qty: "1",
  hsn: "6109",
  tax: "5.00%",
  total: "899.00",
  weight: "0.45 kg",
  dimensions: "20 × 15 × 8 cm",
  warehouse: "Warehouse 12, Industrial Area, Gurugram, HR 122001",
};

function BarcodeMock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      <div
        className="h-8 w-full max-w-[140px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg,#111 0 1px,transparent 1px 2px,#111 2px 3px,transparent 3px 5px,#111 5px 6px,transparent 6px 7px)",
        }}
      />
      <p className="text-[9px] font-mono font-semibold tracking-wide">{label}</p>
    </div>
  );
}

function QrMock() {
  return (
    <div className="grid h-10 w-10 grid-cols-5 grid-rows-5 gap-px border border-black p-0.5">
      {Array.from({ length: 25 }).map((_, i) => (
        <span
          key={i}
          className={
            [0, 1, 2, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 21, 22, 24].includes(i)
              ? "bg-black"
              : "bg-white"
          }
        />
      ))}
    </div>
  );
}

export default function ShippingLabelPreview({
  settings,
  logoUrl,
}: {
  settings: LabelSettings;
  logoUrl?: string;
}) {
  const shipperLines: string[] = [];
  if (settings.showCompanyName && settings.companyName) shipperLines.push(settings.companyName);
  if (settings.showWarehouseAddress) shipperLines.push(SAMPLE.warehouse);
  if (settings.showSupportPhone && settings.supportPhone) shipperLines.push(`Support: ${settings.supportPhone}`);
  if (settings.showGst && settings.gstOnLabel) shipperLines.push(`GST: ${settings.gstOnLabel}`);

  const showOrderIds = settings.showOrderReferenceId || settings.showOrderNo || settings.showOrderBarcode;

  return (
    <div className="mx-auto w-full max-w-[320px] select-none rounded-sm border-2 border-black bg-white text-black shadow-sm">
      <div className="flex border-b border-black">
        <div className="min-w-0 flex-1 p-2">
          <p className="text-[10px] font-bold uppercase">Ship To</p>
          <p className="text-[11px] font-semibold">{SAMPLE.customerName}</p>
          <p className="whitespace-pre-line text-[11px] leading-snug">{SAMPLE.address}</p>
        </div>
        <div className="flex w-[118px] items-start justify-center border-l border-black p-2">
          <p className="text-center text-sm font-bold leading-tight">{SAMPLE.courier}</p>
        </div>
      </div>

      <div className="flex border-b border-black">
        <div className="min-w-0 flex-1 space-y-0.5 p-2 text-[11px]">
          <p>
            <span className="font-bold">Payment : </span>
            {SAMPLE.payment}
          </p>
          <p>
            <span className="font-bold">AWB No. : </span>
            {SAMPLE.awb}
          </p>
          {settings.showWeight ? (
            <p>
              <span className="font-bold">Weight : </span>
              {SAMPLE.weight}
            </p>
          ) : null}
          {settings.showDimensions ? (
            <p>
              <span className="font-bold">Dimensions : </span>
              {SAMPLE.dimensions}
            </p>
          ) : null}
        </div>
        <div className="w-[140px] border-l border-black p-1.5">
          <p className="mb-0.5 text-center text-[10px] font-bold">{SAMPLE.courier}</p>
          <div className="flex items-center gap-1">
            {settings.showAwbBarcode ? (
              <div className="min-w-0 flex-1">
                <BarcodeMock label={SAMPLE.awb} />
              </div>
            ) : (
              <p className="flex-1 text-center text-[9px] font-mono">{SAMPLE.awb}</p>
            )}
            {settings.showAwbQr ? <QrMock /> : null}
          </div>
        </div>
      </div>

      <div className="flex border-b border-black">
        <div className="min-w-0 flex-1 p-2">
          <p className="text-[10px] font-bold">Shipped By</p>
          {settings.showLogo && logoUrl ? (
            <img src={logoUrl} alt="Logo" className="mb-1 ml-auto h-8 max-w-[110px] object-contain" />
          ) : null}
          {shipperLines.length ? (
            <p className="whitespace-pre-line text-[10px] leading-snug">{shipperLines.join("\n")}</p>
          ) : (
            <p className="text-[10px] text-neutral-500">No ship-from branding enabled</p>
          )}
          <p className="mt-1 text-[9px] text-neutral-600">Booked: {SAMPLE.booked}</p>
        </div>
        {showOrderIds ? (
          <div className="w-[130px] border-l border-black p-2 text-center">
            {settings.showOrderReferenceId ? (
              <p className="text-[10px]">Order Ref. ID: {SAMPLE.referenceId}</p>
            ) : null}
            {settings.showOrderNo ? (
              <p className="text-[10px]">Order No: {SAMPLE.orderNumber}</p>
            ) : null}
            {settings.showOrderBarcode ? <BarcodeMock label={SAMPLE.referenceId} /> : null}
            <p className="text-[9px] text-neutral-600">Order Date: {SAMPLE.orderDate}</p>
          </div>
        ) : null}
      </div>

      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="border-b border-black">
            {settings.showSku !== false ? (
              <th className="border-r border-black px-1.5 py-1 text-left font-bold">SKU</th>
            ) : null}
            <th className="border-r border-black px-1.5 py-1 text-left font-bold">Name</th>
            <th className="px-1.5 py-1 text-center font-bold">QTY</th>
            {settings.showHsnTax ? (
              <>
                <th className="border-l border-black px-1.5 py-1 text-center font-bold">HSN</th>
                <th className="border-l border-black px-1.5 py-1 text-center font-bold">Tax</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black">
            {settings.showSku !== false ? (
              <td className="border-r border-black px-1.5 py-1">{SAMPLE.sku}</td>
            ) : null}
            <td className="border-r border-black px-1.5 py-1">{SAMPLE.itemName}</td>
            <td className="px-1.5 py-1 text-center">{SAMPLE.qty}</td>
            {settings.showHsnTax ? (
              <>
                <td className="border-l border-black px-1.5 py-1 text-center">{SAMPLE.hsn}</td>
                <td className="border-l border-black px-1.5 py-1 text-center">{SAMPLE.tax}</td>
              </>
            ) : null}
          </tr>
          {settings.showTotal ? (
            <tr>
              <td
                className="px-1.5 py-1 text-right font-bold"
                colSpan={
                  (settings.showSku !== false ? 3 : 2) + (settings.showHsnTax ? 2 : 0)
                }
              >
                TOTAL Amount : Rs. {SAMPLE.total}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {settings.showDisclaimer || settings.footerText ? (
        <p className="border-t border-black px-2 py-1.5 text-[8px] leading-snug text-neutral-600">
          {settings.footerText ||
            "This is a system generated shipping label. Please verify package contents before accepting delivery."}
        </p>
      ) : null}

      <p className="border-t border-black px-2 py-1 text-center text-[8px] uppercase tracking-wide text-neutral-500">
        Sample preview · {settings.template.replace("_", " ")} template
      </p>
    </div>
  );
}

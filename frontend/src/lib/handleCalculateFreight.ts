import { API_BASE_URL } from "../../services/config";
import { apiRequest } from "../apiglobal/apiconfig";

export type FreightRateResult = {
  type: string[];
  rate: string[];
  data: unknown[];
  codcharge: string[];
  charge: number | null;
};

type HandleCalculateOptions = {
  zone?: string;
  weightKg?: number;
  ratechart?: unknown[];
};

const slabKg = (label: unknown) =>
  Number(
    String(label ?? "")
      .toLowerCase()
      .replaceAll(" ", "")
      .replace("per", "")
      .replace("kg", "")
      .replace("additional", "") || 0
  );

const zoneColumnIndex = (header: unknown[], zone: string) => {
  const list = Array.isArray(header) ? header : [];
  const exact = list.indexOf(zone);
  if (exact >= 0) return exact;
  const key = String(zone || "").toUpperCase().replace(/\s+/g, "");
  return list.findIndex(
    (col) => String(col ?? "").toUpperCase().replace(/\s+/g, "") === key
  );
};

const moneyAmount = (amount: unknown) =>
  parseFloat(String(amount ?? "").replace(/[^0-9.-]/g, ""));

/** Rate-card slab math from Orders page handleCalculate. Freight + COD (if pending), then 18% GST. */
export function handleCalculateRates(
  orderdata: {
    amount?: string | number;
    financialStatus?: string;
    courier?: string;
  },
  options: { zone: string; weightKg: number; ratechart: unknown[]; header?: unknown[] }
): FreightRateResult {
  const ratechart = Array.isArray(options.ratechart) ? options.ratechart : [];
  const rows = ratechart.slice(2) as unknown[][];
  const header = (options.header?.length ? options.header : (ratechart[0] as unknown[])) || [];
  const zone = options.zone;
  const weight = Number(options.weightKg);
  const zoneIdx = zoneColumnIndex(header as unknown[], zone);
  const alldata: FreightRateResult = {
    type: [],
    rate: [],
    data: [],
    codcharge: [],
    charge: null,
  };

  if (zoneIdx < 0) {
    throw new Error(`Zone ${zone || "-"} was not found on the warehouse rate card`);
  }

  const alltype: unknown[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]?.[0] != null && !alltype.includes(rows[i][0])) {
      alltype.push(rows[i][0]);
    }
  }

  for (let i = 0; i < alltype.length; i++) {
    let max = 0;
    let ind = -1;
    let max2 = 0;
    let ind2 = -1;

    for (let j = 0; j < rows.length; j++) {
      const slabCell = rows[j]?.[1];
      if (slabCell == null || slabCell === "") continue;
      const tmax = slabKg(slabCell);
      if (rows[j][0] == alltype[i] && weight <= tmax && ind2 === -1) {
        ind2 = j;
        max2 = tmax;
      }
      if (tmax > max && rows[j][0] == alltype[i] && weight >= tmax) {
        ind = j;
        max = tmax;
      }
    }

    if (ind === -1) {
      ind = ind2;
      max = max2;
    }
    if (ind < 0) continue;

    if (max >= weight) {
      const amountNum = moneyAmount(orderdata.amount);
      let charge = 0;
      let coudcharge = 0;
      charge += Number(rows[ind][zoneIdx]);

      if (orderdata.financialStatus == "pending") {
        try {
          const x11 = String(rows[ind].at(-1))
            .toLowerCase()
            .replaceAll(" ", "")
            .replaceAll("%", "")
            .split("|");
          const tmpcharg1 = (amountNum / 100) * parseFloat(x11[1]);
          const tmpcharg2 = parseFloat(x11[0]);
          const cod = tmpcharg1 > tmpcharg2 ? tmpcharg1 : tmpcharg2;
          charge += cod;
          coudcharge = cod;
        } catch (e) {
          console.log(e);
        }
      }

      charge = charge * 1.18;
      alldata.type.push(String(alltype[i]));
      alldata.rate.push(charge.toFixed(2));
      alldata.data.push(rows[ind]);
      alldata.codcharge.push(coudcharge.toFixed(2));
    } else {
      const amount1 = Number(rows[ind][zoneIdx]);
      const next = rows[ind + 1];
      const amount2 = Number(next?.[zoneIdx]);
      if (amount2 == 0) continue;
      let totalrate = amount1 + amount2;
      let totalcount = 0;
      max = max + slabKg(next?.[1]);

      do {
        totalcount++;
        if (totalcount > 299) break;
        if (max >= weight) {
          const amountNum = moneyAmount(orderdata.amount);
          let charge = 0;
          let coudcharge = 0;
          charge += totalrate;

          if (orderdata.financialStatus == "pending") {
            try {
              const x11 = String(rows[ind].at(-1))
                .replaceAll(" ", "")
                .replaceAll("%", "")
                .split("|");
              const tmpcharg1 = (amountNum / 100) * parseFloat(x11[1]);
              const tmpcharg2 = parseFloat(x11[0]);
              const cod = tmpcharg1 > tmpcharg2 ? tmpcharg1 : tmpcharg2;
              charge += cod;
              coudcharge = cod;
            } catch (e) {
              console.log(e);
            }
          }

          charge = charge * 1.18;
          alldata.type.push(String(alltype[i]));
          alldata.rate.push(charge.toFixed(2));
          alldata.data.push(rows[ind]);
          alldata.codcharge.push(coudcharge.toFixed(2));
          break;
        }
        if (slabKg(next?.[1]) == 0) break;
        max += slabKg(next?.[1]);
        totalrate += amount2;
      } while (true);
    }
  }

  const courier = String(orderdata?.courier || "");
  let idx = alldata.type.findIndex((name) => name == courier);
  if (idx < 0) {
    idx = alldata.type.findIndex((name) => name.toLowerCase() === courier.toLowerCase());
  }
  const picked = idx >= 0 ? Number(alldata.rate[idx]) : NaN;
  alldata.charge = Number.isFinite(picked) ? picked : null;
  return alldata;
}

export async function fetchRatechartForWarehouse(
  warehouseId: string | number,
  sellerId?: string | number
) {
  let userId: string | number | undefined = sellerId;
  if (warehouseId != null && String(warehouseId).trim() !== "") {
    const res = await apiRequest("GET", `auth/getWarehouseById/${warehouseId}`, {}, {});
    const warehouse = res?.data?.data;
    if (warehouse?.user_id) userId = warehouse.user_id;
  }
  if (userId == null || String(userId).trim() === "") {
    throw new Error("Warehouse is not saved on the order");
  }

  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  const data = await response.json();
  const ratechart = data?.data?.ratechart;
  if (!Array.isArray(ratechart) || ratechart.length < 3) {
    throw new Error("Rate card not found for this warehouse");
  }
  return ratechart as unknown[];
}

/** Same charge function as Orders page handleCalculate, with zone, warehouse, and weight passed in. */
export async function handleCalculate(
  orderdata: {
    amount?: string | number;
    financialStatus?: string;
    courier?: string;
    seller?: string | number;
    zone?: string;
    warehouse?: string | number;
  },
  warehouseId: string | number = "",
  options: HandleCalculateOptions = {}
) {
  const zone = String(options.zone || orderdata?.zone || "").trim();
  const weightKg = Number(options.weightKg);
  const resolvedWarehouse = warehouseId || orderdata?.warehouse || "";
  if (!zone) throw new Error("Zone is not saved on the order");
  if (resolvedWarehouse === "" || resolvedWarehouse == null) {
    throw new Error("Warehouse is not saved on the order");
  }
  if (!(weightKg > 0)) throw new Error("Weight is required to calculate freight");

  const ratechart =
    options.ratechart ||
    (await fetchRatechartForWarehouse(resolvedWarehouse, orderdata?.seller));

  return handleCalculateRates(orderdata, { zone, weightKg, ratechart });
}

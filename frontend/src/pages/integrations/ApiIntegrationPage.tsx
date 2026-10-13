import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, FileText, ExternalLink, Check, ChevronDown, ChevronRight } from "lucide-react";
import { API_BASE_URL } from "../../../services/config";
import { getuserid } from "../../../services/getbasicdata";
import {
  API_GUIDE_META,
  BASE_URL,
  endpointUrl,
  API_OVERVIEW,
  API_PREREQUISITES,
  API_QUICK_START,
  ORDER_STATUSES,
  ERROR_CODES,
  API_BEST_PRACTICES,
  API_ENDPOINTS,
  groupedEndpoints,
  buildCurl,
  buildNode,
  buildPhp,
  type ApiEndpoint,
} from "@/docs/apiSetupGuide";
import { downloadApiGuidePdf } from "@/docs/apiGuidePdf";

const KEY_STORAGE = "lm-api-keys";

function loadOrCreateKeys() {
  try {
    const saved = localStorage.getItem(KEY_STORAGE);
    if (saved) return JSON.parse(saved) as { publicKey: string; privateKey: string };
  } catch { /* ignore */ }
  const uid = getuserid() || "demo";
  const keys = {
    publicKey: `LM_PUB_${String(uid).slice(0, 6).toUpperCase()}${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    privateKey: `LM_PRIV_${Math.random().toString(36).slice(2, 18)}${Math.random().toString(36).slice(2, 18)}`,
  };
  try {
    localStorage.setItem(KEY_STORAGE, JSON.stringify(keys));
  } catch { /* ignore */ }
  return keys;
}

const TABS = [
  { id: "guide", label: "Setup Guide" },
  { id: "endpoints", label: "Endpoints" },
  { id: "errors", label: "Errors & Statuses" },
  { id: "keys", label: "API Keys" },
] as const;

type TabId = (typeof TABS)[number]["id"];
type Lang = "cURL" | "Node" | "PHP";

const methodStyles: Record<string, string> = {
  GET: "bg-sky-100 text-sky-700 border-sky-200",
  POST: "bg-violet-100 text-violet-700 border-violet-200",
  PUT: "bg-amber-100 text-amber-700 border-amber-200",
  PATCH: "bg-orange-100 text-orange-700 border-orange-200",
};

const MethodBadge = ({ method }: { method: string }) => (
  <span
    className={`inline-flex min-w-[52px] justify-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
      methodStyles[method] || "border-slate-200 bg-slate-100 text-slate-700"
    }`}
  >
    {method}
  </span>
);

const CodeBlock = ({ label, code }: { label: string; code: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[11px]" onClick={copy}>
          {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="mt-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-100">{code}</pre>
    </div>
  );
};

const ParamTable = ({ title, params }: { title: string; params?: ApiEndpoint["body"] }) => {
  if (!params?.length) return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-1 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Field</th>
              <th className="px-3 py-2 font-semibold">Type</th>
              <th className="px-3 py-2 font-semibold">Required</th>
              <th className="px-3 py-2 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {params.map((param) => (
              <tr key={param.name} className="bg-white">
                <td className="px-3 py-2 font-mono text-[11px] text-teal-700">{param.name}</td>
                <td className="px-3 py-2 text-slate-600">{param.type}</td>
                <td className="px-3 py-2">
                  {param.required ? (
                    <span className="font-semibold text-rose-600">Yes</span>
                  ) : (
                    <span className="text-slate-400">No</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">{param.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


const ApiIntegrationPage = () => {
  const { toast } = useToast();
  const [keys] = useState(loadOrCreateKeys);
  const [tab, setTab] = useState<TabId>("guide");
  const [lang, setLang] = useState<Lang>("cURL");
  const [openId, setOpenId] = useState<string | null>("pushOrder");

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const snippetFor = (endpoint: ApiEndpoint) =>
    lang === "cURL" ? buildCurl(endpoint) : lang === "Node" ? buildNode(endpoint) : buildPhp(endpoint);

  const downloadPdf = async () => {
    try {
      await downloadApiGuidePdf();
      toast({ title: "PDF download started" });
    } catch {
      toast({ title: "Could not build the PDF", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout hidePageHeader>
      <div className="mx-auto max-w-5xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{API_GUIDE_META.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {API_GUIDE_META.product} · {API_GUIDE_META.version} · Updated {API_GUIDE_META.updated}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Read the guide, copy ready-made snippets, then push orders and track shipments from your own system.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2" onClick={downloadPdf}>
              <FileText className="h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Swagger
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === item.id ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "guide" && (
            <div className="space-y-5">
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-bold text-slate-900">1. Overview</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
                  {API_OVERVIEW.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-bold text-slate-900">2. Prerequisites</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
                  {API_PREREQUISITES.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-bold text-slate-900">3. Quick start</h2>
                <ol className="mt-3 space-y-3">
                  {API_QUICK_START.map((step) => (
                    <li key={step.step} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                        {step.step}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                        <p className="text-sm text-slate-600">{step.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-bold text-slate-900">4. Authentication</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Protected endpoints need a Bearer token from POST {endpointUrl("auth/login")} — send it as
                  <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs">Authorization: Bearer &lt;token&gt;</code>
                  on every call. The token lives for {API_GUIDE_META.tokenValidity}; refresh it whenever a call returns 401.
                </p>
                <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/80 p-3 text-sm text-amber-900">
                  Base URL: <code className="font-mono text-xs">{BASE_URL}</code>
                </div>
                <CodeBlock
                  label="Get your token"
                  code={`curl -X POST "${endpointUrl("auth/login")}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"email":"seller@logixmitra.com","password":"YourPassword@123"}'`}
                />
              </section>
            </div>
          )}
          {tab === "endpoints" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  {API_ENDPOINTS.length} endpoints · all paths are appended to{" "}
                  <code className="rounded bg-slate-100 px-1 font-mono text-xs">{BASE_URL}</code>
                </p>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                  {(["cURL", "Node", "PHP"] as Lang[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setLang(item)}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        lang === item ? "bg-white text-teal-700 shadow-sm" : "text-slate-600"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {groupedEndpoints().map((group) => (
                <section key={group.group}>
                  <h2 className="text-sm font-bold text-slate-900">{group.group}</h2>
                  <div className="mt-2 space-y-2">
                    {group.endpoints.map((endpoint) => {
                      const open = openId === endpoint.id;
                      return (
                        <div key={endpoint.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => setOpenId(open ? null : endpoint.id)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                          >
                            <MethodBadge method={endpoint.method} />
                            <code className="min-w-0 flex-1 truncate text-xs font-mono text-slate-800">{endpoint.path}</code>
                            <span className="hidden text-sm text-slate-500 md:block">{endpoint.name}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                endpoint.auth === "token" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {endpoint.auth === "token" ? "Token" : "Public"}
                            </span>
                            {open ? (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                          {open && (
                            <div className="border-t border-slate-100 px-4 py-4">
                              <p className="text-sm text-slate-600">{endpoint.description}</p>
                              <ParamTable title="Query parameters" params={endpoint.query} />
                              <ParamTable title="Request body" params={endpoint.body} />
                              {endpoint.requestExample && <CodeBlock label="Request example" code={endpoint.requestExample} />}
                              {endpoint.responseExample && <CodeBlock label="Response example" code={endpoint.responseExample} />}
                              <CodeBlock label={`${lang} snippet`} code={snippetFor(endpoint)} />
                              {endpoint.notes && endpoint.notes.length > 0 && (
                                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                                  {endpoint.notes.map((note) => (
                                    <li key={note}>{note}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
          {tab === "errors" && (
            <div className="space-y-5">
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-bold text-slate-900">HTTP status codes &amp; fixes</h2>
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Code</th>
                        <th className="px-3 py-2 font-semibold">Meaning</th>
                        <th className="px-3 py-2 font-semibold">How to fix</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ERROR_CODES.map((item) => (
                        <tr key={item.code} className="bg-white">
                          <td className="px-3 py-2 font-mono text-[11px] font-bold">
                            <span className={item.code.startsWith("2") ? "text-emerald-600" : "text-rose-600"}>{item.code}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{item.meaning}</td>
                          <td className="px-3 py-2 text-slate-600">{item.fix}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-bold text-slate-900">Order statuses</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Exact status values used by the Orders screen and returned by order / tracking endpoints.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ORDER_STATUSES.map((status) => (
                    <span key={status} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                      {status}
                    </span>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-bold text-slate-900">Best practices</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
                  {API_BEST_PRACTICES.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            </div>
          )}
          {tab === "keys" && (
            <div className="max-w-2xl space-y-5">
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Public Key</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-800">
                    {keys.publicKey}
                  </code>
                  <Button size="icon" variant="outline" onClick={() => copy(keys.publicKey, "Public key")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Private Key</p>
                <button
                  type="button"
                  onClick={() => copy(keys.privateKey, "Private key")}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left font-mono text-sm text-teal-700 transition-colors hover:bg-teal-50"
                >
                  <span className="flex-1 truncate">{keys.privateKey}</span>
                  <Copy className="h-4 w-4 shrink-0" />
                </button>
                <p className="mt-1 text-xs text-slate-400">Click to copy the private key — keep it on your server only.</p>
              </section>
              <section className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
                Base URL: <code className="font-mono text-xs">{BASE_URL}</code>
              </section>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ApiIntegrationPage;

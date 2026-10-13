import { UPLOAD_BASE_URL, UPLOAD_BASE_URLs } from "../../services/config";

/**
 * Resolve a stored profile-image reference into a displayable URL.
 * Accepts a bare filename ("1728-456.jpg"), "/uploads/1728-456.jpg",
 * "uploads/1728-456.jpg", legacy shapes saved by older builds
 * ("/upload/upload/1728-456.jpg" and full URLs containing the /upload alias),
 * full http(s) URLs and data URIs.
 * Returns "" when there is no image (caller should show avatar initials).
 */
export const resolveAvatarUrl = (value?: string | null): string => {
  const src = String(value || "").trim();
  if (!src) return "";
  if (src.startsWith("data:")) return src;

  // Everything the upload endpoint saves lives flat in /uploads/<filename>.
  // Rebuilding the canonical URL from the filename fixes legacy references
  // ("/upload/upload/<file>", full URLs with the alias) that would otherwise
  // 404 — the server only strips the "/upload/" alias prefix once.
  const rebuildFromPath = (path: string): string => {
    const clean = path.split("?")[0].split("#")[0];
    const file = clean.split("/").filter(Boolean).pop() || "";
    return file ? `${UPLOAD_BASE_URLs}uploads/${file}` : "";
  };

  if (/^https?:/i.test(src)) {
    try {
      const url = new URL(src);
      if (/\/upload(s)?\//i.test(url.pathname)) {
        const rebuilt = rebuildFromPath(url.pathname);
        if (rebuilt) return rebuilt;
      }
      // Unrelated external URL — use it as-is.
      return src;
    } catch {
      return rebuildFromPath(src) || src;
    }
  }

  if (src.startsWith("/")) {
    // /uploads/x (and legacy /upload/upload/x) → host/uploads/x served by
    // express.static — works with or without the /upload alias middleware.
    return rebuildFromPath(src) || `${UPLOAD_BASE_URL}${src}`;
  }
  if (src.startsWith("uploads/")) return `${UPLOAD_BASE_URL}/${src}`;
  return `${UPLOAD_BASE_URLs}uploads/${src}`; // filename → express static
};

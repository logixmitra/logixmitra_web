/**
 * Seller-account impersonation session helpers ("Login as Seller").
 *
 * The app keeps the logged-in session in localStorage under `token` + `user`.
 * When an admin switches into a seller account we stash the admin's session
 * under `lm_impersonation` so we can restore it later from the banner.
 */

const SESSION_KEY = "lm_impersonation";

export interface ImpersonationSession {
  token: string;
  user: Record<string, unknown>;
  startedAt: string;
}

/** Returns the saved admin session, or null when not impersonating. */
export function getImpersonationSession(): ImpersonationSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImpersonationSession;
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isImpersonating(): boolean {
  return getImpersonationSession() !== null;
}

/** Clears the saved admin session without touching the live session. */
export function clearImpersonationSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Saves the current (admin) session and swaps in the target seller session.
 * Refuses when already impersonating so nested switches can't lose the
 * original admin credentials.
 */
export function startImpersonation(
  sellerToken: string,
  sellerUser: Record<string, unknown>
): boolean {
  if (!sellerToken || !sellerUser) return false;
  if (isImpersonating()) return false;

  const adminToken = localStorage.getItem("token");
  const adminUserRaw = localStorage.getItem("user");
  if (!adminToken || !adminUserRaw) return false;

  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        token: adminToken,
        user: JSON.parse(adminUserRaw),
        startedAt: new Date().toISOString(),
      })
    );
  } catch {
    return false;
  }

  localStorage.setItem("token", sellerToken);
  localStorage.setItem("user", JSON.stringify(sellerUser));
  return true;
}

/** Restores the saved admin session. Returns true when there was one. */
export function exitImpersonation(): boolean {
  const session = getImpersonationSession();
  if (!session) return false;

  localStorage.setItem("token", session.token);
  localStorage.setItem("user", JSON.stringify(session.user));
  clearImpersonationSession();
  return true;
}

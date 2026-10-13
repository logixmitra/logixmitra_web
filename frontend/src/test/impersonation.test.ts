import { describe, it, expect, beforeEach } from "vitest";
import {
  getImpersonationSession,
  isImpersonating,
  startImpersonation,
  exitImpersonation,
  clearImpersonationSession,
} from "../../services/impersonation";

const adminToken = "admin-token";
const adminUser = { id: 1, name: "Super Admin", email: "admin@logixmitra.com", role: "admin" };
const sellerToken = "seller-token";
const sellerUser = { id: 7, name: "Demo Seller", email: "seller@example.com", role: "seller" };

const seedAdminSession = () => {
  localStorage.setItem("token", adminToken);
  localStorage.setItem("user", JSON.stringify(adminUser));
};

describe("impersonation session helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reports no session when nothing is stored", () => {
    expect(getImpersonationSession()).toBeNull();
    expect(isImpersonating()).toBe(false);
    expect(exitImpersonation()).toBe(false);
  });

  it("startImpersonation swaps in the seller session and stashes the admin session", () => {
    seedAdminSession();

    const started = startImpersonation(sellerToken, sellerUser);

    expect(started).toBe(true);
    expect(localStorage.getItem("token")).toBe(sellerToken);
    expect(JSON.parse(localStorage.getItem("user") || "{}")).toEqual(sellerUser);

    const session = getImpersonationSession();
    expect(session).not.toBeNull();
    expect(session?.token).toBe(adminToken);
    expect(session?.user).toEqual(adminUser);
    expect(isImpersonating()).toBe(true);
  });

  it("exitImpersonation restores the admin session and clears the stash", () => {
    seedAdminSession();
    startImpersonation(sellerToken, sellerUser);

    expect(exitImpersonation()).toBe(true);

    expect(localStorage.getItem("token")).toBe(adminToken);
    expect(JSON.parse(localStorage.getItem("user") || "{}")).toEqual(adminUser);
    expect(isImpersonating()).toBe(false);
  });

  it("refuses nested impersonation without losing the original admin session", () => {
    seedAdminSession();
    startImpersonation(sellerToken, sellerUser);

    const nested = startImpersonation("another-token", { id: 8, name: "Other Seller" });

    expect(nested).toBe(false);
    // Original admin session must remain intact
    expect(getImpersonationSession()?.token).toBe(adminToken);
    // Live session is still the first seller
    expect(localStorage.getItem("token")).toBe(sellerToken);
  });

  it("refuses to start without an existing admin session", () => {
    expect(startImpersonation(sellerToken, sellerUser)).toBe(false);
    expect(isImpersonating()).toBe(false);
  });

  it("returns null for corrupted stored session instead of throwing", () => {
    localStorage.setItem("lm_impersonation", "{not-json");
    expect(getImpersonationSession()).toBeNull();

    localStorage.setItem("lm_impersonation", JSON.stringify({ user: adminUser }));
    expect(getImpersonationSession()).toBeNull();
  });

  it("clearImpersonationSession removes only the stash", () => {
    seedAdminSession();
    startImpersonation(sellerToken, sellerUser);

    clearImpersonationSession();

    expect(isImpersonating()).toBe(false);
    // Live seller session untouched
    expect(localStorage.getItem("token")).toBe(sellerToken);
  });
});

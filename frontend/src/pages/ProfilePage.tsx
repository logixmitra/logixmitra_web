import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import api from "../../services/api";
import { UPLOAD_BASE_URL } from "../../services/config";
import { resolveAvatarUrl } from "@/lib/avatarUrl";
import {
  BadgeCheck, Building2, CalendarDays, CheckCircle2, Eye, EyeOff, KeyRound,
  Loader2, Lock, Mail, MapPin, Package, Pencil, Phone, RefreshCw, RotateCcw, Save,
  ShieldCheck, Sparkles, TrendingUp, Undo2, User, Wallet, Trash2,
} from "lucide-react";

interface ProfilePermission {
  module: string;
  actions: string[];
}

interface Profile {
  id: number;
  name: string;
  email: string;
  mobile: string;
  phone: string;
  company: string;
  gst: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  avatar: string;
  avatarUrl: string;
  isActive: boolean;
  status: string;
  kycStatus: string;
  riskCategory: string;
  subscription: string;
  walletBalance: number;
  totalOrders: number;
  performanceScore: number;
  rtoRate: number;
  revenue: string;
  joinedAt: string;
  createdAt?: string;
  lastLogin?: string;
  role?: { id: number; name: string; description?: string } | null;
  roleId?: number;
  permissions?: ProfilePermission[];
  canViewAllOrders?: boolean;
}

type ProfileForm = {
  name: string;
  email: string;
  mobile: string;
  phone: string;
  company: string;
  gst: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  avatar: string;
  avatarUrl: string;
};

const EMPTY_FORM: ProfileForm = {
  name: "",
  email: "",
  mobile: "",
  phone: "",
  company: "",
  gst: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  avatar: "",
  avatarUrl: "",
};

const PERSONAL_FIELDS: (keyof ProfileForm)[] = ["name", "email", "mobile", "phone"];
const BUSINESS_FIELDS: (keyof ProfileForm)[] = ["company", "gst", "address", "city", "state", "pincode"];

const toForm = (profile: Profile): ProfileForm => ({
  name: profile?.name || "",
  email: profile?.email || "",
  mobile: profile?.mobile || "",
  phone: profile?.phone || "",
  company: profile?.company || "",
  gst: profile?.gst || "",
  address: profile?.address || "",
  city: profile?.city || "",
  state: profile?.state || "",
  pincode: profile?.pincode || "",
  avatar: profile?.avatar || "",
  avatarUrl: profile?.avatarUrl || "",
});

const initialsOf = (name?: string) => {
  const first = String(name || "").trim().charAt(0).toUpperCase();
  return first || "U";
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusTone = (value?: string) => {
  const key = String(value || "").toLowerCase();
  if (["active", "verified", "low"].includes(key)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["pending", "medium", "trial"].includes(key)) return "bg-amber-50 text-amber-700 border-amber-200";
  if (["blocked", "rejected", "high"].includes(key)) return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
};

const actionTone = (action: string) => {
  switch (String(action).toLowerCase()) {
    case "create":
      return "bg-emerald-50 text-emerald-700";
    case "read":
      return "bg-sky-50 text-sky-700";
    case "update":
      return "bg-amber-50 text-amber-700";
    case "delete":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const passwordScore = (value: string) => {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 5);
};

const PASSWORD_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"];

const validate = (form: ProfileForm) => {
  const errors: Partial<Record<keyof ProfileForm, string>> = {};

  if (!form.name.trim() || form.name.trim().length < 2) errors.name = "Name must be at least 2 characters";
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Enter a valid email";
  if (!form.company.trim()) errors.company = "Company name is required";
  if (!form.phone.trim()) errors.phone = "Phone number is required";
  else if (!/^[0-9+\-\s()]{6,20}$/.test(form.phone.trim())) errors.phone = "Enter a valid phone number";
  if (form.mobile.trim() && !/^[0-9+\-\s()]{6,20}$/.test(form.mobile.trim())) errors.mobile = "Enter a valid mobile number";
  if (!form.address.trim()) errors.address = "Address is required";
  if (form.pincode.trim() && !/^[0-9]{4,10}$/.test(form.pincode.trim())) errors.pincode = "Pincode must be 4-10 digits";

  return errors;
};

const ProfilePage = () => {
  const { toast } = useToast();
  const { user: authUser, patchUser } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [tab, setTab] = useState("personal");

  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
  const [pwdError, setPwdError] = useState("");
  const [pwdSubmitted, setPwdSubmitted] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  // Full-size photo viewer (view / update / remove from one dialog).
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  // Live current-password check: "idle" | "checking" | "ok" | "wrong" |
  // "unknown" (verify endpoint errored/unreachable — submission stays allowed;
  // the change-password endpoint re-validates the current password anyway).
  const [currentPwdStatus, setCurrentPwdStatus] = useState<"idle" | "checking" | "ok" | "wrong" | "unknown">("idle");
  const [verifyingCurrent, setVerifyingCurrent] = useState(false);
  // Monotonic counter so a stale in-flight verify response (sent with a
  // partially typed password) can never overwrite the status computed for the
  // latest typed password — that race used to show "incorrect password" even
  // when the correct password was entered.
  const pwdCheckSeq = useRef(0);

  // Instant local (blob) preview of the just-picked photo. Guarantees the hero
  // and header show the image immediately — even before (or without) the
  // server echoing avatarUrl back in its response.
  const [avatarPreview, setAvatarPreview] = useState("");
  const avatarPreviewRef = useRef("");

  const setAvatarPreviewSafe = (url: string) => {
    if (avatarPreviewRef.current && avatarPreviewRef.current !== url) {
      try { URL.revokeObjectURL(avatarPreviewRef.current); } catch { /* ignore */ }
    }
    avatarPreviewRef.current = url;
    setAvatarPreview(url);
  };

  // Revoke the last preview URL on unmount.
  useEffect(() => () => {
    if (avatarPreviewRef.current) {
      try { URL.revokeObjectURL(avatarPreviewRef.current); } catch { /* ignore */ }
    }
  }, []);

  // Single source of truth for the hero / photo-viewer image: the instant
  // local preview first, then the persisted reference from server state.
  const avatarSrc = avatarPreview || resolveAvatarUrl(profile?.avatarUrl || form.avatarUrl);

  // Logged-in account's email — password checks are scoped to THIS user's DB
  // record (backend resolves by email first, then compares the bcrypt hash).
  // Prefer the freshly loaded profile email (always in sync with the DB row
  // the backend sees); fall back to the session user from login/localStorage.
  const sessionEmail = String(profile?.email || authUser?.email || "");

  // Seller accounts are view-only on this page: they can change only their
  // password (Security tab) and their profile image. Everything else is
  // managed by admins (backend enforces the same rule).
  const isSellerAccount = useMemo(
    () => String(profile?.role?.name || authUser?.role || "").toLowerCase() === "seller",
    [profile, authUser]
  );

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getProfile();
      const data: Profile | undefined = res?.data;
      if (!data) throw new Error("Profile not found");
      setProfile(data);
      setForm(toForm(data));
      setErrors({});
    } catch (error: any) {
      toast({
        title: "Failed to load profile",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const dirty = useMemo(() => {
    if (!profile) return false;
    const original = toForm(profile);
    return (Object.keys(EMPTY_FORM) as (keyof ProfileForm)[]).some(
      (key) => String(original[key] || "") !== String(form[key] || "")
    );
  }, [form, profile]);

  const completeness = useMemo(() => {
    const fields = [...PERSONAL_FIELDS, ...BUSINESS_FIELDS];
    const filled = fields.filter((field) => String(form[field] || "").trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  const tokenExpiry = useMemo(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token || token === "null" || token === "undefined") return null;
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
      );
      return payload?.exp ? new Date(payload.exp * 1000).toISOString() : null;
    } catch {
      return null;
    }
  }, []);

  const permissionCount = useMemo(() => {
    const permissions = profile?.permissions || [];
    return {
      modules: permissions.length,
      actions: permissions.reduce((total, item) => total + (item.actions?.length || 0), 0),
    };
  }, [profile]);

  const handleField = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Upload a profile photo via the shared /upload endpoint, then persist it
  // immediately (PUT /auth/profile) so a page refresh never loses it.
  // With no photo, the first letter of the user's name shows.
  // NOTE: UPLOAD_BASE_URL already ends with "/upload", so POST to the base itself
  // ("/upload/upload" hits no route on the server and returns "Route not found").
  const handleAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!/^image\//i.test(file.type)) {
      toast({ title: "Invalid file", description: "Please choose an image (JPG, PNG or WebP).", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Profile images must be under 5 MB.", variant: "destructive" });
      return;
    }

    // Show the new photo in the hero instantly while upload + persist run.
    setAvatarPreviewSafe(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const formdata = new FormData();
      formdata.append("file", file);
      const uploadRes = await fetch(`${UPLOAD_BASE_URL}`, { method: "POST", body: formdata });
      let uploadData: {
        filename?: string;
        fileInfo?: { filename?: string };
        success?: boolean;
        error?: string;
        message?: string;
      } | null = null;
      try {
        uploadData = (await uploadRes.json()) as {
          filename?: string;
          fileInfo?: { filename?: string };
          success?: boolean;
          error?: string;
          message?: string;
        };
      } catch { /* non-JSON response — handled below */ }
      if (!uploadRes.ok) {
        throw new Error(uploadData?.error || uploadData?.message || `Upload failed (${uploadRes.status})`);
      }
      const name = uploadData?.filename || uploadData?.fileInfo?.filename || "";
      if (!name) throw new Error("No filename returned by the server");

      // Persist immediately so refresh keeps the photo. Never trust the server
      // response to echo avatarUrl back — if it omits/empties it (e.g. an older
      // backend build), keep the filename we know was just uploaded.
      const avatar = initialsOf(form.name);
      const res = await api.updateProfile({ avatar, avatarUrl: name });
      const data: Profile | undefined = res?.data;
      const savedAvatarUrl = data?.avatarUrl || name;
      if (data) {
        const merged = { ...data, avatarUrl: savedAvatarUrl };
        setProfile(merged);
        setForm(toForm(merged));
      } else {
        handleField("avatarUrl", name);
      }

      // Instant header update — no page reload, no loader flash.
      patchUser({
        avatar: data?.avatar || avatar,
        avatarUrl: savedAvatarUrl,
      });

      toast({ title: "Profile photo updated", description: "Your profile image was saved successfully." });
    } catch (error: any) {
      // Upload/persist failed — revert to whatever is already saved.
      setAvatarPreviewSafe("");
      toast({ title: "Upload failed", description: error?.message || "Could not upload image.", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Remove the profile photo and persist immediately (refresh-safe).
  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const avatar = initialsOf(form.name);
      const res = await api.updateProfile({ avatar, avatarUrl: "" });
      const data: Profile | undefined = res?.data;
      if (data) {
        setProfile(data);
        setForm(toForm(data));
      } else {
        handleField("avatarUrl", "");
      }

      // Instant header update — no page reload, no loader flash.
      patchUser({ avatar: data?.avatar || avatar, avatarUrl: "" });
      setAvatarPreviewSafe("");
      setPhotoViewerOpen(false);

      toast({ title: "Profile photo removed", description: "Your name initial now shows instead." });
    } catch (error: any) {
      toast({ title: "Remove failed", description: error?.message || "Could not remove image.", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleReset = () => {
    if (!profile) return;
    setForm(toForm(profile));
    setErrors({});
    toast({ title: "Changes discarded", description: "Form restored to your saved profile." });
  };

  const handleSave = async (event?: React.FormEvent) => {
    event?.preventDefault();

    // Seller accounts: only the profile image can be updated.
    if (isSellerAccount) {
      setErrors({});
      setSaving(true);
      try {
        const avatar = initialsOf(form.name);
        const res = await api.updateProfile({ avatar, avatarUrl: form.avatarUrl || "" });
        const data: Profile | undefined = res?.data;

        if (data) {
          setProfile(data);
          setForm(toForm(data));
        }

        // Instant header update — no page reload, no loader flash.
        patchUser({
          avatar: data?.avatar || avatar,
          avatarUrl: data?.avatarUrl ?? form.avatarUrl,
        });

        toast({ title: "Profile image updated", description: "Your profile image was saved successfully." });
      } catch (error: any) {
        toast({
          title: "Update failed",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    const validation = validate(form);
    setErrors(validation);

    if (Object.keys(validation).length > 0) {
      const first = Object.keys(validation)[0] as keyof ProfileForm;
      setTab(PERSONAL_FIELDS.includes(first) ? "personal" : "business");
      toast({
        title: "Please fix the highlighted fields",
        description: Object.values(validation)[0],
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateProfile({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        avatar: initialsOf(form.name),
        avatarUrl: form.avatarUrl || "",
      });

      const data: Profile | undefined = res?.data;

      if (data) {
        setProfile(data);
        setForm(toForm(data));
      }

      // Instant header update — no page reload, no loader flash.
      patchUser({
        name: form.name.trim(),
        email: form.email.trim(),
        avatar: data?.avatar || initialsOf(form.name),
        avatarUrl: data?.avatarUrl ?? form.avatarUrl,
      });

      toast({ title: "Profile updated", description: "Your details were saved successfully." });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Verify the typed current password against the server (debounced from the field).
  const verifyCurrentPassword = useCallback(async (value: string) => {
    const typed = String(value || "");
    if (!typed) {
      setCurrentPwdStatus("idle");
      setVerifyingCurrent(false);
      return;
    }
    // Only the latest request may write the status — older in-flight requests
    // still carry a partially typed password.
    const seq = ++pwdCheckSeq.current;
    setCurrentPwdStatus("checking");
    setVerifyingCurrent(true);
    try {
      await api.verifyPassword(typed, sessionEmail);
      if (seq === pwdCheckSeq.current) setCurrentPwdStatus("ok");
    } catch (error: any) {
      if (seq !== pwdCheckSeq.current) return;
      // Only treat it as "wrong" when the server explicitly says so. Network
      // hiccups / a missing endpoint must NOT block the change-password form —
      // the change-password endpoint re-validates the current password anyway.
      const explicitlyWrong =
        error?.status === 400 && /current password is incorrect/i.test(String(error?.message || ""));
      setCurrentPwdStatus(explicitlyWrong ? "wrong" : "unknown");
    } finally {
      if (seq === pwdCheckSeq.current) setVerifyingCurrent(false);
    }
  }, [sessionEmail]);

  // Debounce the live check so we don't hit the API on every keystroke.
  useEffect(() => {
    if (!pwd.current) {
      setCurrentPwdStatus("idle");
      return;
    }
    setCurrentPwdStatus("checking");
    const timer = setTimeout(() => {
      verifyCurrentPassword(pwd.current);
    }, 600);
    return () => clearTimeout(timer);
  }, [pwd.current, verifyCurrentPassword]);

  const handlePasswordChange = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setPwdError("");
    setPwdSubmitted(true);

    if (!pwd.current || !pwd.next || !pwd.confirm) {
      setPwdError("All password fields are required.");
      return;
    }
    if (currentPwdStatus === "checking" || verifyingCurrent) {
      setPwdError("Please wait while we verify your current password.");
      return;
    }
    if (currentPwdStatus === "wrong") {
      setPwdError("Current password is incorrect.");
      return;
    }
    if (pwd.next.length < 8) {
      setPwdError("New password must be at least 8 characters.");
      return;
    }
    // Mismatch / same-as-current errors are displayed live under the confirm
    // field while typing — just block submission here without a message.
    if (pwd.next !== pwd.confirm) {
      return;
    }
    if (pwd.current === pwd.next) {
      return;
    }

    setChangingPwd(true);
    try {
      await api.changePassword({
        currentPassword: pwd.current,
        newPassword: pwd.next,
        email: sessionEmail,
      });
      setPwd({ current: "", next: "", confirm: "" });
      setPwdSubmitted(false);
      setCurrentPwdStatus("idle");
      toast({
        title: "Password updated — please login again",
        description: "Your password was changed successfully. Sign in with your new password.",
      });
      // Let the user read the success message, then send them to login.
      setTimeout(() => {
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        } catch { /* storage unavailable — still redirect */ }
        window.location.href = "/login";
      }, 3000);
    } catch (error: any) {
      const message = error?.message || "Could not update password.";
      setPwdError(message);
      if (/current password is incorrect/i.test(message)) setCurrentPwdStatus("wrong");
      toast({ title: "Password update failed", description: message, variant: "destructive" });
    } finally {
      setChangingPwd(false);
    }
  };

  // Live validation under the "Confirm new password" field — recomputed on
  // every keystroke, so the message appears/clears as the user types.
  const pwdConfirmError =
    pwd.next && pwd.confirm && pwd.next !== pwd.confirm
      ? "New password and confirmation do not match."
      : pwd.next && pwd.current && pwd.next === pwd.current
        ? "New password must be different from the current password."
        : pwdError;

  if (loading && !profile) {
    return (
      <DashboardLayout title="My Profile" subtitle="Manage your account, business details and security">
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            Loading your profile…
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Profile" subtitle="Manage your account, business details and security">
      <div className="page-container">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-900/10 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-800 p-5 text-white shadow-lg lg:p-7">
          <div className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <button
                  type="button"
                  title={avatarSrc ? "View profile photo" : "Upload profile photo"}
                  disabled={uploadingAvatar}
                  onClick={() => {
                    if (avatarSrc) setPhotoViewerOpen(true);
                    else document.getElementById("profile-photo-input")?.click();
                  }}
                  className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-lg font-bold tracking-wide ring-1 ring-white/20 backdrop-blur transition hover:ring-teal-300/60 disabled:opacity-60"
                >
                  {initialsOf(profile?.name || form.name)}
                  {avatarSrc && (
                    <img
                      key={avatarSrc}
                      src={avatarSrc}
                      alt="Profile photo"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                </button>
                <input
                  id="profile-photo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFile}
                />
                <button
                  type="button"
                  title={uploadingAvatar ? "Uploading…" : "Change profile photo"}
                  disabled={uploadingAvatar}
                  onClick={() => document.getElementById("profile-photo-input")?.click()}
                  className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-teal-500 text-white shadow-lg ring-2 ring-slate-900 transition-colors hover:bg-teal-400 disabled:opacity-60"
                >
                  {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                </button>
                {(form.avatarUrl || avatarSrc) && (
                  <button
                    type="button"
                    title="Remove photo"
                    disabled={uploadingAvatar}
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-slate-200 shadow ring-1 ring-white/25 transition-colors hover:bg-rose-600 hover:text-white disabled:opacity-60"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Full-size photo viewer: view / update / remove */}
              <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
                <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Profile photo</DialogTitle>
                    <DialogDescription>
                      View your current photo, upload a new one, or remove it (your name initial shows instead).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center justify-center py-2">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="Profile photo"
                        className="max-h-[60vh] w-auto max-w-full rounded-xl object-contain shadow"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-slate-100 text-4xl font-bold text-slate-600">
                        {initialsOf(profile?.name || form.name)}
                      </div>
                    )}
                  </div>
                  <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl text-rose-600 hover:text-rose-700"
                      disabled={uploadingAvatar || (!form.avatarUrl && !avatarSrc)}
                      onClick={handleRemoveAvatar}
                    >
                      {uploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Remove
                    </Button>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="rounded-xl" onClick={() => setPhotoViewerOpen(false)}>
                        Close
                      </Button>
                      <Button
                        type="button"
                        className="rounded-xl bg-teal-600 hover:bg-teal-700"
                        disabled={uploadingAvatar}
                        onClick={() => document.getElementById("profile-photo-input")?.click()}
                      >
                        {uploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
                        Update photo
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-bold tracking-tight lg:text-2xl">
                    {form.name || "Your name"}
                  </h2>
                  <span className="rounded-full bg-teal-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-teal-200 ring-1 ring-teal-300/30">
                    {profile?.role?.name || "user"}
                  </span>
                  {profile?.canViewAllOrders && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200 ring-1 ring-white/15">
                      <ShieldCheck className="h-3 w-3" /> All orders
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {form.email || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {form.phone || form.mobile || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {[form.city, form.state].filter(Boolean).join(", ") || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Member since {formatDate(profile?.joinedAt)}
                  </span>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-2 text-[11px] font-semibold capitalize">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
                    <CheckCircle2 className="h-3 w-3 text-emerald-300" /> {profile?.status || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
                    <BadgeCheck className="h-3 w-3 text-teal-300" /> KYC {profile?.kycStatus || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
                    {profile?.subscription || "Trial"} plan
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
                    {profile?.riskCategory || "low"} risk
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setTab("personal")}
                className="h-10 rounded-xl bg-teal-500 font-semibold text-white hover:bg-teal-400"
              >
                <User className="mr-2 h-4 w-4" /> Edit profile
              </Button>
              <Button
                variant="outline"
                onClick={() => setTab("security")}
                className="h-10 rounded-xl border-white/25 bg-white/5 font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                <KeyRound className="mr-2 h-4 w-4" /> Password
              </Button>
              <Button
                variant="outline"
                onClick={loadProfile}
                disabled={loading}
                title="Refresh profile"
                className="h-10 rounded-xl border-white/25 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

          </div>

          <div className="relative mt-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span>Profile completeness</span>
              <span className="text-teal-200">{completeness}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-300 transition-all duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Keep your business details accurate — they are used on invoices, shipping labels and settlements.
            </p>
          </div>
        </section>

        {/* Snapshot stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Wallet balance",
              value: `₹${Number(profile?.walletBalance || 0).toLocaleString("en-IN")}`,
              hint: "Available for shipping",
              icon: Wallet,
              tone: "bg-teal-50 text-teal-600",
            },
            {
              title: "Total orders",
              value: profile?.totalOrders ?? 0,
              hint: `Revenue ${profile?.revenue || "₹0"}`,
              icon: Package,
              tone: "bg-sky-50 text-sky-600",
            },
            {
              title: "Performance",
              value: `${Number(profile?.performanceScore || 0).toFixed(0)}/100`,
              hint: "Platform score",
              icon: TrendingUp,
              tone: "bg-emerald-50 text-emerald-600",
            },
            {
              title: "RTO rate",
              value: `${Number(profile?.rtoRate || 0).toFixed(1)}%`,
              hint: "Return to origin",
              icon: RotateCcw,
              tone: "bg-amber-50 text-amber-600",
            },
          ].map(({ title, value, hint, icon: Icon, tone }) => (
            <div key={title} className="shadow-card shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
                  <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{hint}</p>
                </div>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="h-auto flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <TabsTrigger value="personal" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              Personal
            </TabsTrigger>
            <TabsTrigger value="business" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              Business &amp; address
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              Security
            </TabsTrigger>
            <TabsTrigger value="access" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              Access
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <form onSubmit={handleSave}>
              <Card className="shadow-card">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base text-foreground">
                        <User className="h-4 w-4 text-teal-600" /> Personal information
                      </CardTitle>
                      <CardDescription>Name and contact details used across the console</CardDescription>
                    </div>
                    {dirty && (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        Unsaved changes
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pt-5">
                  {isSellerAccount && (
                    <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/70 p-4 text-xs text-sky-900">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                      <p>
                        Seller accounts are view-only here — you can update only your <strong>password</strong>{" "}
                        (Security tab) and your <strong>profile image</strong>. Contact an admin for other changes.
                      </p>
                    </div>
                  )}
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profile-name">Full name *</Label>
                      <Input
                        id="profile-name"
                        value={form.name}
                        disabled={isSellerAccount}
                        onChange={(e) => handleField("name", e.target.value)}
                        placeholder="e.g. Ravi Sharma"
                        autoComplete="off"
                        className={errors.name ? "border-rose-300 focus-visible:ring-rose-400" : ""}
                      />
                      {errors.name && <p className="text-xs font-medium text-rose-600">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-email">Email *</Label>
                      <Input
                        id="profile-email"
                        type="email"
                        value={form.email}
                        disabled={isSellerAccount}
                        onChange={(e) => handleField("email", e.target.value)}
                        placeholder="you@company.com"
                        className={errors.email ? "border-rose-300 focus-visible:ring-rose-400" : ""}
                      />
                      {errors.email ? (
                        <p className="text-xs font-medium text-rose-600">{errors.email}</p>
                      ) : (
                        <p className="text-xs text-slate-500">Used to sign in — keep it up to date.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-phone">Phone *</Label>
                      <Input
                        id="profile-phone"
                        value={form.phone}
                        disabled={isSellerAccount}
                        onChange={(e) => handleField("phone", e.target.value)}
                        placeholder="+91 98765 43210"
                        className={errors.phone ? "border-rose-300 focus-visible:ring-rose-400" : ""}
                      />
                      {errors.phone && <p className="text-xs font-medium text-rose-600">{errors.phone}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-mobile">Alternate mobile</Label>
                      <Input
                        id="profile-mobile"
                        value={form.mobile}
                        disabled={isSellerAccount}
                        onChange={(e) => handleField("mobile", e.target.value)}
                        placeholder="Optional"
                        className={errors.mobile ? "border-rose-300 focus-visible:ring-rose-400" : ""}
                      />
                      {errors.mobile && <p className="text-xs font-medium text-rose-600">{errors.mobile}</p>}
                    </div>

                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Account</p>
                    <div className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-slate-400">User ID</p>
                        <p className="mt-0.5 font-semibold text-slate-800">#{profile?.id ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Role</p>
                        <p className="mt-0.5 font-semibold capitalize text-slate-800">{profile?.role?.name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Member since</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{formatDate(profile?.joinedAt)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Last login</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{formatDateTime(profile?.lastLogin)}</p>
                      </div>
                    </div>
                  </div>

                </CardContent>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
                  <p className="text-xs text-slate-500">
                    {dirty ? "You have unsaved changes." : "All changes are saved."}
                  </p>
                  <div className="flex items-center gap-2">
                    {isSellerAccount ? (
                      <p className="text-xs font-semibold text-slate-500">
                        View-only — seller accounts cannot edit business details.
                      </p>
                    ) : (
                      <>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={handleReset} disabled={!dirty || saving}>
                          <Undo2 className="mr-2 h-4 w-4" /> Reset
                        </Button>
                        <Button type="submit" className="rounded-xl bg-teal-600 hover:bg-teal-700" disabled={saving || !dirty}>
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save changes
                        </Button>
                      </>
                    )}
                  </div>
                  {/* <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={handleReset} disabled={!dirty || saving}>
                      <Undo2 className="mr-2 h-4 w-4" /> Reset
                    </Button>
                    <Button type="submit" className="rounded-xl bg-teal-600 hover:bg-teal-700" disabled={saving || !dirty}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save changes
                    </Button>
                  </div> */}
                </div>
              </Card>
            </form>
          </TabsContent>

          <TabsContent value="business" className="space-y-4">
            <form onSubmit={handleSave}>
              <Card className="shadow-card">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base text-foreground">
                        <Building2 className="h-4 w-4 text-teal-600" /> Business &amp; address
                      </CardTitle>
                      <CardDescription>Appears on invoices, labels and COD settlements</CardDescription>
                    </div>
                    {dirty && (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        Unsaved changes
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pt-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profile-company">Company / business name *</Label>
                      <Input
                        id="profile-company"
                        value={form.company}
                        disabled={isSellerAccount}
                        onChange={(e) => handleField("company", e.target.value)}
                        placeholder="e.g. LogixMitra Pvt Ltd"
                        className={errors.company ? "border-rose-300 focus-visible:ring-rose-400" : ""}
                      />
                      {errors.company && <p className="text-xs font-medium text-rose-600">{errors.company}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-gst">GSTIN</Label>
                      <Input
                        id="profile-gst"
                        value={form.gst}
                        disabled={isSellerAccount}
                        onChange={(e) => handleField("gst", e.target.value.toUpperCase())}
                        placeholder="15-digit GST number"
                      />
                      <p className="text-xs text-slate-500">Printed on GST invoices and credit notes.</p>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="profile-address">Registered address *</Label>
                      <Textarea
                        id="profile-address"
                        value={form.address}
                        disabled={isSellerAccount}
                        onChange={(e) => handleField("address", e.target.value)}
                        placeholder="Building, street, area"
                        rows={2}
                        className={errors.address ? "border-rose-300 focus-visible:ring-rose-400" : ""}
                      />
                      {errors.address && <p className="text-xs font-medium text-rose-600">{errors.address}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-city">City</Label>
                      <Input
                        id="profile-city"
                        value={form.city}
                        disabled={isSellerAccount}
                        onChange={(e) => handleField("city", e.target.value)}
                        placeholder="e.g. Gurugram"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-state">State</Label>
                      <Input
                        id="profile-state"
                        value={form.state}
                        disabled={isSellerAccount}
                        onChange={(e) => handleField("state", e.target.value)}
                        placeholder="e.g. Haryana"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-pincode">Pincode</Label>
                      <Input
                        id="profile-pincode"
                        value={form.pincode}
                        disabled={isSellerAccount}
                        onChange={(e) => handleField("pincode", e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="e.g. 122001"
                        inputMode="numeric"
                        className={errors.pincode ? "border-rose-300 focus-visible:ring-rose-400" : ""}
                      />
                      {errors.pincode && <p className="text-xs font-medium text-rose-600">{errors.pincode}</p>}
                    </div>

                  </div>

                  <div className="flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/60 p-4 text-xs text-teal-900">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    <p>
                      Tip: keep GSTIN, city and pincode in sync with your warehouse to avoid failed pickups and
                      settlement mismatches.
                    </p>
                  </div>
                </CardContent>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
                  <p className="text-xs text-slate-500">
                    {dirty ? "You have unsaved changes." : "All changes are saved."}
                  </p>
                  <div className="flex items-center gap-2">
                    {isSellerAccount ? (
                      <p className="text-xs font-semibold text-slate-500">
                        View-only — seller accounts cannot edit business details.
                      </p>
                    ) : (
                      <>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={handleReset} disabled={!dirty || saving}>
                          <Undo2 className="mr-2 h-4 w-4" /> Reset
                        </Button>
                        <Button type="submit" className="rounded-xl bg-teal-600 hover:bg-teal-700" disabled={saving || !dirty}>
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save changes
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </form>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="shadow-card lg:col-span-2">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    <Lock className="h-4 w-4 text-teal-600" /> Change password
                  </CardTitle>
                  <CardDescription>
                    At least 8 characters with a mix of letters, numbers and symbols
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5 pt-5">
                  <form onSubmit={handlePasswordChange} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="pwd-current">Current password</Label>
                      <div className="relative">
                        <Input
                          id="pwd-current"
                          type={showPwd.current ? "text" : "password"}
                          value={pwd.current}
                          onChange={(e) => setPwd((prev) => ({ ...prev, current: e.target.value }))}
                          placeholder="Enter current password"
                          autoComplete="current-password"
                          className={`pr-10 ${currentPwdStatus === "wrong" ? "border-rose-300 focus-visible:ring-rose-400" : currentPwdStatus === "ok" ? "border-emerald-300 focus-visible:ring-emerald-400" : ""}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((s) => ({ ...s, current: !s.current }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label="Toggle current password visibility"
                        >
                          {showPwd.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {pwd.current !== "" && currentPwdStatus === "checking" && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Loader2 className="h-3 w-3 animate-spin" /> Verifying current password…
                        </p>
                      )}
                      {pwd.current !== "" && currentPwdStatus === "ok" && (
                        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Current password is correct.
                        </p>
                      )}
                      {pwd.current !== "" && currentPwdStatus === "wrong" && (
                        <p className="text-xs font-medium text-rose-600">
                          Current password is incorrect — please check and try again.
                        </p>
                      )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="pwd-next">New password</Label>
                        <div className="relative">
                          <Input
                            id="pwd-next"
                            type={showPwd.next ? "text" : "password"}
                            value={pwd.next}
                            onChange={(e) => {
                              setPwdError("");
                              setPwdSubmitted(false);
                              setPwd((prev) => ({ ...prev, next: e.target.value }));
                            }}
                            placeholder="Enter new password"
                            autoComplete="new-password"
                            className={`pr-10 ${pwdSubmitted && !pwd.next ? "border-rose-300 focus-visible:ring-rose-400" : ""}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwd((s) => ({ ...s, next: !s.next }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label="Toggle new password visibility"
                          >
                            {showPwd.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pwd-confirm">Confirm new password</Label>
                        <div className="relative">
                          <Input
                            id="pwd-confirm"
                            type={showPwd.confirm ? "text" : "password"}
                            value={pwd.confirm}
                            onChange={(e) => {
                              setPwdError("");
                              setPwdSubmitted(false);
                              setPwd((prev) => ({ ...prev, confirm: e.target.value }));
                            }}
                            placeholder="Re-enter new password"
                            autoComplete="new-password"
                            className={`pr-10 ${pwdSubmitted && !pwd.confirm ? "border-rose-300 focus-visible:ring-rose-400" : ""}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwd((s) => ({ ...s, confirm: !s.confirm }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label="Toggle confirm password visibility"
                          >
                            {showPwd.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {pwdConfirmError && (
                          <p className="text-xs font-medium text-rose-600">{pwdConfirmError}</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span>Password strength</span>
                        <span className={pwd.next ? "text-slate-800" : "text-slate-400"}>
                          {pwd.next ? PASSWORD_LABELS[passwordScore(pwd.next)] : "—"}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        {[0, 1, 2, 3, 4].map((index) => {
                          const score = passwordScore(pwd.next);
                          const tone =
                            index >= score
                              ? "bg-slate-200"
                              : score <= 2
                                ? "bg-rose-400"
                                : score === 3
                                  ? "bg-amber-400"
                                  : "bg-emerald-500";
                          return <span key={index} className={`h-1.5 flex-1 rounded-full transition-colors ${tone}`} />;
                        })}
                      </div>
                      <ul className="mt-3 grid gap-1.5 text-[11px] sm:grid-cols-2">
                        {([
                          ["At least 8 characters", pwd.next.length >= 8],
                          ["Upper & lower case", /[A-Z]/.test(pwd.next) && /[a-z]/.test(pwd.next)],
                          ["Contains a number", /\d/.test(pwd.next)],
                          ["Contains a symbol", /[^A-Za-z0-9]/.test(pwd.next)],
                        ] as [string, boolean][]).map(([label, ok]) => (
                          <li key={label} className={`flex items-center gap-1.5 ${ok ? "text-emerald-600" : "text-slate-500"}`}>
                            <CheckCircle2 className={`h-3 w-3 ${ok ? "text-emerald-500" : "text-slate-300"}`} />
                            {label}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="submit"
                        className="rounded-xl bg-teal-600 hover:bg-teal-700"
                        disabled={changingPwd || verifyingCurrent || currentPwdStatus === "checking" || currentPwdStatus === "wrong" || currentPwdStatus === "idle"}
                        title={currentPwdStatus === "ok" ? "Update password" : "Enter the correct current password to enable"}
                      >
                        {changingPwd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                        Update password
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        disabled={changingPwd}
                        onClick={() => {
                          setPwd({ current: "", next: "", confirm: "" });
                          setPwdError("");
                          setPwdSubmitted(false);
                          setCurrentPwdStatus("idle");
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    <ShieldCheck className="h-4 w-4 text-teal-600" /> Account &amp; session
                  </CardTitle>
                  <CardDescription>Signed-in account details</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Account status</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusTone(profile?.status)}`}>
                      {profile?.status || "—"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">KYC</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusTone(profile?.kycStatus)}`}>
                      {profile?.kycStatus || "—"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Role</span>
                    <span className="font-semibold capitalize text-slate-800">{profile?.role?.name || "—"}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">User ID</span>
                    <span className="font-semibold text-slate-800">#{profile?.id ?? "—"}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Last login</span>
                    <span className="text-right font-semibold text-slate-800">{formatDateTime(profile?.lastLogin)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Session expires</span>
                    <span className="text-right font-semibold text-slate-800">{formatDateTime(tokenExpiry || undefined)}</span>
                  </div>

                  <div className="mt-1 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-[11px] leading-relaxed text-slate-500">
                    Changing your password keeps this session active until the token expires. Sign out and back in on
                    shared devices if you suspect misuse.
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader className="border-b border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base text-foreground">
                      <ShieldCheck className="h-4 w-4 text-teal-600" /> Access &amp; permissions
                    </CardTitle>
                    <CardDescription>
                      What the <span className="font-semibold capitalize text-slate-700">{profile?.role?.name || "user"}</span> role
                      can do in the console
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">
                      {permissionCount.modules} modules
                    </Badge>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                      {permissionCount.actions} actions
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                {(profile?.permissions?.length ?? 0) === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center text-sm text-slate-500">
                    No module permissions are assigned to this role yet. Ask an administrator to grant access.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {profile?.permissions?.map((item) => (
                      <div
                        key={item.module}
                        className="rounded-xl border border-slate-200/80 bg-white p-4 transition-shadow hover:shadow-[0_4px_16px_rgba(20,184,166,0.08)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">{item.module}</p>
                          <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                            {item.actions.length}/{4}
                          </span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {item.actions.map((action) => (
                            <span
                              key={action}
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${actionTone(action)}`}
                            >
                              {action}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;


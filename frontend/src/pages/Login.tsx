import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Truck, BarChart3, ShieldCheck, Lock, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/brand/BrandLogo";
import { toast } from "sonner";

const features = [
  { icon: Truck, label: "Order tracking", bg: "bg-sky-50", iconBg: "bg-sky-100", iconColor: "text-sky-600" },
  { icon: BarChart3, label: "Live analytics", bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { icon: ShieldCheck, label: "Secure wallets", bg: "bg-violet-50", iconBg: "bg-violet-100", iconColor: "text-violet-600" },
];

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success("Welcome to LogixMitra");
        navigate("/dashboard");
      } else {
        toast.error(result.error || "Invalid credentials");
      }
    } catch {
      toast.error("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f2f5]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Top bar — same style as dashboard header */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
        <BrandLogo />
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-57px)] max-w-6xl flex-col items-center justify-center gap-8 px-4 py-10 lg:flex-row lg:gap-14 lg:px-8">
        {/* Left — intro */}
        <div className="max-w-md text-center lg:text-left">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
            <Package className="h-3.5 w-3.5" /> Logistics Management Platform
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
            Welcome to{" "}
            <span className="text-teal-600">LogixMitra</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Manage orders, track shipments, handle COD settlements, and run reports — all from one console.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {features.map(({ icon: Icon, label, bg, iconBg, iconColor }) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-2xl border border-white/60 px-4 py-3 shadow-sm ${bg}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={1.75} />
                </span>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — sign-in card */}
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Sign in</h2>
                <p className="text-xs text-slate-500">Access your LogixMitra console</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@logixmitra.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 pr-10 focus-visible:ring-teal-500"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-teal-600 font-semibold hover:bg-teal-700"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Sign in to dashboard"
                )}
              </Button>
            </form>

            {/* <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Demo access</p>
              <p className="mt-1 text-xs text-slate-600">
                <span className="font-medium">admin@logixmitra.com</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-medium">admin123</span>
              </p>
            </div> */}
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} LogixMitra · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Toaster, toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidPhone, phoneValidationHint } from "@/lib/phone";
import { minimizeBusinessForStorage } from "@/lib/businessStorage";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API = `${API_BASE}/api`;

function LogoMark() {
  return (
    <div className="flex items-center justify-center">
      <img
        src="/brand/dobook-logo.png"
        alt="DoBook"
        className="h-16 w-auto select-none"
        draggable={false}
      />
    </div>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const resetToken = useMemo(() => String(searchParams?.get("token") || "").trim(), [searchParams]);
  const isReset = useMemo(() => Boolean(resetToken), [resetToken]);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPassword2, setResetPassword2] = useState("");
  const initialPlan = useMemo(() => {
    const plan = String(searchParams?.get("plan") || "").toLowerCase();
    if (plan === "pro") return "pro";
    return "free";
  }, [searchParams]);
  const initialIndustry = useMemo(() => {
    const raw = String(searchParams?.get("industry") || "").toLowerCase();
    const allowed = new Set(["photobooth", "salon", "doctor", "consultant", "tutor", "fitness", "tradie"]);
    return allowed.has(raw) ? raw : "photobooth";
  }, [searchParams]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    business_name: "",
    phone: "",
    subscription_plan: initialPlan,
    industry: initialIndustry,
  });

  const title = useMemo(() => (isLogin ? "Login" : "Create account"), [isLogin]);
  const subtitle = useMemo(
    () => (isLogin ? "Welcome back to DoBook." : "Start managing bookings in minutes."),
    [isLogin],
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isReset) {
        if (!resetPassword || resetPassword.length < 6) {
          toast.error("Password must be at least 6 characters");
          return;
        }
        if (resetPassword !== resetPassword2) {
          toast.error("Passwords do not match");
          return;
        }
        await axios.post(`${API}/auth/password-reset/confirm`, { token: resetToken, password: resetPassword });
        toast.success("Password updated. Please login.");
        setResetPassword("");
        setResetPassword2("");
        setFormData((prev) => ({ ...prev, password: "" }));
        router.replace("/auth");
        return;
      }

      if (forgotMode) {
        if (!formData.email) {
          toast.error("Email is required");
          return;
        }
        await axios.post(`${API}/auth/password-reset/request`, { email: formData.email });
        toast.success("If that email exists, we sent a reset link.");
        setForgotMode(false);
        return;
      }

      if (!isLogin && formData.phone && !isValidPhone(formData.phone)) {
        toast.error(phoneValidationHint());
        return;
      }

      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem("dobook_token", response.data.token);
      localStorage.setItem("dobook_business", JSON.stringify(minimizeBusinessForStorage(response.data.business)));

      if (!isLogin && formData.subscription_plan === "pro") {
        toast.success("Account created! Redirecting to payment…");
        const checkout = await axios.post(
          `${API}/stripe/checkout`,
          { plan: "pro" },
          { headers: { Authorization: `Bearer ${response.data.token}` } },
        );
        const url = checkout?.data?.url;
        if (!url) throw new Error("Missing checkout URL");
        window.location.href = url;
        return;
      }

      toast.success(isLogin ? "Logged in!" : "Account created!");
      router.replace("/dashboard");
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Authentication failed";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  }

  const computedTitle = useMemo(() => {
    if (isReset) return "Reset password";
    if (forgotMode) return "Forgot password";
    return title;
  }, [forgotMode, isReset, title]);

  const computedSubtitle = useMemo(() => {
    if (isReset) return "Set a new password for your account.";
    if (forgotMode) return "We’ll email you a password reset link.";
    return subtitle;
  }, [forgotMode, isReset, subtitle]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-10">
      <Toaster position="top-center" richColors />

      <div className="w-full max-w-md">
        <div className="mb-6">
          <LogoMark />
        </div>

        <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Manrope" }}>
              {computedTitle}
            </CardTitle>
            <CardDescription style={{ fontFamily: "Inter" }}>{computedSubtitle}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isReset && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-xl h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_password2">Confirm new password</Label>
                    <Input
                      id="new_password2"
                      type="password"
                      value={resetPassword2}
                      onChange={(e) => setResetPassword2(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-xl h-12"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-semibold"
                  >
                    {loading ? "Please wait..." : "Update password"}
                  </Button>

                  <div className="mt-5 text-center text-sm">
                    <button
                      type="button"
                      onClick={() => router.replace("/auth")}
                      className="text-rose-600 hover:underline"
                    >
                      Back to login
                    </button>
                  </div>
                </>
              )}

              {!isReset && forgotMode && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      autoComplete="email"
                      inputMode="email"
                      className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-xl h-12"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-semibold"
                  >
                    {loading ? "Please wait..." : "Send reset link"}
                  </Button>

                  <div className="mt-5 text-center text-sm">
                    <button
                      type="button"
                      onClick={() => setForgotMode(false)}
                      className="text-rose-600 hover:underline"
                    >
                      Back to login
                    </button>
                  </div>
                </>
              )}

              {!isReset && !forgotMode && (
                <>
                  {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business name</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    required={!isLogin}
                    autoComplete="organization"
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-xl h-12"
                  />
                </div>
                  )}

                  {!isLogin && (
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, subscription_plan: "free" })}
                      className={`w-full text-left p-4 rounded-xl border transition-colors ${
                        formData.subscription_plan === "free"
                          ? "border-rose-200 bg-rose-50"
                          : "border-zinc-200 bg-white hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Free</div>
                        <div className="text-sm text-zinc-600">$0</div>
                      </div>
                      <div className="text-xs text-zinc-600 mt-1">10 bookings/month • Confirmation emails only</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, subscription_plan: "pro" })}
                      className={`w-full text-left p-4 rounded-xl border transition-colors ${
                        formData.subscription_plan === "pro"
                          ? "border-rose-200 bg-rose-50"
                          : "border-zinc-200 bg-white hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Pro</div>
                        <div className="text-sm text-zinc-600">$30 AUD / month</div>
                      </div>
                      <div className="text-xs text-zinc-600 mt-1">Unlimited bookings • Invoice PDFs • Automated reminders</div>
                    </button>
                  </div>
                </div>
                  )}

                  {!isLogin && (
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(val) => setFormData({ ...formData, industry: val })}
                  >
                    <SelectTrigger className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-xl h-12">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photobooth">Photo booth</SelectItem>
                      <SelectItem value="salon">Salon</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="tutor">Tutor</SelectItem>
                      <SelectItem value="fitness">Fitness trainer</SelectItem>
                      <SelectItem value="tradie">Tradie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      autoComplete="email"
                      inputMode="email"
                      className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-xl h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-xl h-12"
                    />
                  </div>

                  {isLogin && (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setForgotMode(true)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    autoComplete="tel"
                    inputMode="tel"
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-xl h-12"
                  />
                  <p className="text-xs text-zinc-500">{phoneValidationHint()}</p>
                </div>
              )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-semibold"
                  >
                    {loading ? "Please wait..." : isLogin ? "Login" : "Create account"}
                  </Button>
                </>
              )}
            </form>

            {!isReset && !forgotMode && (
              <div className="mt-5 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsLogin((v) => !v)}
                  className="text-rose-600 hover:underline"
                >
                  {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
                </button>
              </div>
            )}

            <div className="mt-5 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                Back to home
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-500">
              <a className="hover:text-zinc-700" href="/terms">
                Terms
              </a>
              <a className="hover:text-zinc-700" href="/privacy">
                Privacy
              </a>
              <a className="hover:text-zinc-700" href="/policies/cancellation">
                Cancellation Policy
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

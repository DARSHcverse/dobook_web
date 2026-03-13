"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { Briefcase, GraduationCap, Hammer, Scissors, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidPhone, phoneValidationHint } from "@/lib/phone";
import { minimizeBusinessForStorage } from "@/lib/businessStorage";
import { BUSINESS_TYPES, normalizeBusinessType } from "@/lib/businessTypeTemplates";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API = `${API_BASE}/api`;
axios.defaults.withCredentials = true;

const BUSINESS_TYPE_TO_INDUSTRY = {
  salon_barbershop: "salon",
  medical_wellness: "doctor",
  consultant: "consultant",
  tutoring_education: "tutor",
  home_services_trades: "tradie",
};

const BUSINESS_TYPE_ICON = {
  scissors: Scissors,
  stethoscope: Stethoscope,
  briefcase: Briefcase,
  "graduation-cap": GraduationCap,
  hammer: Hammer,
};

function LogoMark() {
  return (
    <div className="flex items-center justify-center">
      <img
        src="/brand/dobook-logo.png"
        alt="DoBook"
        width={192}
        height={128}
        style={{ height: 64, width: "auto" }}
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
  const [signupStep, setSignupStep] = useState(1);
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
  const forceSignup = useMemo(() => {
    const mode = String(searchParams?.get("mode") || "").trim().toLowerCase();
    return mode === "signup" || mode === "register";
  }, [searchParams]);
  const initialBusinessType = useMemo(() => {
    const raw = String(searchParams?.get("business_type") || "").trim();
    return normalizeBusinessType(raw);
  }, [searchParams]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    business_name: "",
    phone: "",
    subscription_plan: initialPlan,
    industry: initialIndustry,
    business_type: initialBusinessType,
  });

  useEffect(() => {
    if (!forceSignup) return;
    setIsLogin(false);
    setForgotMode(false);
    setSignupStep(1);
  }, [forceSignup]);

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

      if (!isLogin && signupStep === 1) {
        if (!formData.business_name || String(formData.business_name || "").trim().length < 2) {
          toast.error("Business name is required");
          return;
        }
        if (!formData.email) {
          toast.error("Email is required");
          return;
        }
        if (!formData.password || String(formData.password || "").length < 6) {
          toast.error("Password must be at least 6 characters");
          return;
        }
        setSignupStep(2);
        return;
      }

      if (!isLogin && signupStep === 2) {
        const bt = normalizeBusinessType(formData.business_type);
        if (!bt) {
          toast.error("Please choose a business type");
          return;
        }
      }

      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload, { withCredentials: true });
      if (response?.data?.business) {
        localStorage.setItem("dobook_business", JSON.stringify(minimizeBusinessForStorage(response.data.business)));
      }

      if (!isLogin && formData.subscription_plan === "pro") {
        toast.success("Account created! Redirecting to payment…");
        const checkout = await axios.post(`${API}/stripe/checkout`, { plan: "pro" }, { withCredentials: true });
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
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-200"
            aria-label="Back to DoBook home"
          >
            <LogoMark />
          </button>
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
                  {!isLogin && signupStep === 1 && (
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

	                  {!isLogin && signupStep === 1 && (
	                <div className="space-y-2">
	                  <Label>Plan</Label>
	                  <div className="grid grid-cols-1 gap-3">
	                    <button
	                      type="button"
	                      onClick={() => setFormData({ ...formData, subscription_plan: "free" })}
	                      className={`w-full text-left p-4 rounded-xl border transition-colors ${
	                        formData.subscription_plan === "free"
	                          ? "border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/15 dark:hover:bg-rose-500/20"
	                          : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-950/20 dark:hover:bg-zinc-800/50"
	                      }`}
	                    >
	                      <div className="flex items-center justify-between">
	                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">Free</div>
	                        <div className="text-sm text-zinc-600 dark:text-zinc-300">$0</div>
	                      </div>
	                      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">10 bookings/month • Confirmation emails only</div>
	                    </button>

	                    <button
	                      type="button"
	                      onClick={() => setFormData({ ...formData, subscription_plan: "pro" })}
	                      className={`w-full text-left p-4 rounded-xl border transition-colors ${
	                        formData.subscription_plan === "pro"
	                          ? "border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/15 dark:hover:bg-rose-500/20"
	                          : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-950/20 dark:hover:bg-zinc-800/50"
	                      }`}
	                    >
	                      <div className="flex items-center justify-between">
	                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">Pro</div>
	                        <div className="text-sm text-zinc-600 dark:text-zinc-300">$20 AUD / month</div>
	                      </div>
	                      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Unlimited bookings • Invoice PDFs • Automated reminders</div>
	                    </button>
	                  </div>
	                </div>
	                  )}

                  {!isLogin && signupStep === 1 && (
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

                  {!isLogin && signupStep === 2 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label>What type of business are you?</Label>
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:underline"
                          onClick={() => setSignupStep(1)}
                        >
                          Back
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {BUSINESS_TYPES.map((t) => {
                          const Icon = BUSINESS_TYPE_ICON[t.icon] || Briefcase;
                          const active = formData.business_type === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                const mapped = BUSINESS_TYPE_TO_INDUSTRY[t.id];
                                const shouldApply = formData.industry === "photobooth" && mapped;
                                setFormData({ ...formData, business_type: t.id, industry: shouldApply ? mapped : formData.industry });
                              }}
                              className={`p-4 rounded-2xl border text-left transition-colors ${
                                active
                                  ? "border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/15 dark:hover:bg-rose-500/20"
                                  : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-950/20 dark:hover:bg-zinc-800/50"
                              }`}
                              aria-pressed={active}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                    active ? "bg-rose-600 text-white" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                                  }`}
                                  aria-hidden="true"
                                >
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">{t.label}</div>
                                  <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">{t.description}</div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Don’t worry — you can change this later in Settings. We’ll just pre-fill sensible defaults to get you started.
                      </p>
                    </div>
                  )}

                  {(!isLogin && signupStep === 2) ? null : (
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
                  )}

                  {(!isLogin && signupStep === 2) ? null : (
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
                  )}

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

                  {!isLogin && signupStep === 1 && (
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
                    {loading
                      ? "Please wait..."
                      : isLogin
                        ? "Login"
                        : signupStep === 1
                          ? "Continue"
                          : "Create account"}
                  </Button>
                </>
              )}
            </form>

            {!isReset && !forgotMode && (
              <div className="mt-5 text-center text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin((v) => {
                        const next = !v;
                        if (!next) setSignupStep(1);
                        return next;
                      });
                    }}
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

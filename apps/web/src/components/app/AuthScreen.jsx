"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Toaster, toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [loading, setLoading] = useState(false);
  const initialPlan = useMemo(() => {
    const plan = String(searchParams?.get("plan") || "").toLowerCase();
    if (plan === "pro") return "pro";
    return "free";
  }, [searchParams]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    business_name: "",
    phone: "",
    subscription_plan: initialPlan,
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
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem("dobook_token", response.data.token);
      localStorage.setItem("dobook_business", JSON.stringify(response.data.business));

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
              {title}
            </CardTitle>
            <CardDescription style={{ fontFamily: "Inter" }}>{subtitle}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                      <div className="text-xs text-zinc-600 mt-1">10 bookings/month • 1 invoice template</div>
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
                      <div className="text-xs text-zinc-600 mt-1">Unlimited bookings • Unlimited templates</div>
                    </button>
                  </div>
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

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    autoComplete="tel"
                    inputMode="tel"
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-xl h-12"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-semibold"
              >
                {loading ? "Please wait..." : isLogin ? "Login" : "Create account"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin((v) => !v)}
                className="text-rose-600 hover:underline"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
              </button>
            </div>

            <div className="mt-5 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                Back to home
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

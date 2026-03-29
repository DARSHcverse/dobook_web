"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, CreditCard, Download, Receipt, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ["all", "paid", "failed", "pending", "cancelled"];

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

function formatAmount(value) {
  const amount = Number(value || 0);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatusLabel(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return "Pending";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function paymentStatusClass(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return cn(
    "rounded-full border px-3 py-0.5 text-xs font-medium",
    normalized === "paid" && "border-emerald-200 bg-emerald-50 text-emerald-700",
    normalized === "failed" && "border-red-200 bg-red-50 text-red-700",
    normalized === "pending" && "border-amber-200 bg-amber-50 text-amber-700",
    normalized === "refunded" && "border-zinc-200 bg-zinc-100 text-zinc-700",
    normalized === "cancelled" && "border-slate-200 bg-slate-100 text-slate-700",
  );
}

async function readResponseError(response) {
  try {
    const data = await response.json();
    return data?.detail || data?.error || response.statusText || "Request failed";
  } catch {
    try {
      const text = await response.text();
      return text || response.statusText || "Request failed";
    } catch {
      return response.statusText || "Request failed";
    }
  }
}

function StatCard({ title, value, hint, icon: Icon }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentsTab({ active }) {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    totalPaid: 0,
    failedPayments: 0,
    activeSubscriptions: 0,
    breakdown: [],
  });

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const loadPayments = async () => {
      setPaymentsLoading(true);
      try {
        const url = new URL("/api/admin/payments", window.location.origin);
        if (statusFilter !== "all") {
          url.searchParams.set("status", statusFilter);
        }

        const response = await fetch(url.toString(), { method: "GET" });
        if (response.status === 401) {
          router.replace("/admin/auth");
          return;
        }
        if (!response.ok) {
          throw new Error(await readResponseError(response));
        }

        const data = await response.json();
        if (!cancelled) {
          setPayments(Array.isArray(data?.payments) ? data.payments : []);
        }
      } catch (error) {
        if (!cancelled) {
          setPayments([]);
          toast.error(error.message || "Failed to load payments");
        }
      } finally {
        if (!cancelled) setPaymentsLoading(false);
      }
    };

    loadPayments();

    return () => {
      cancelled = true;
    };
  }, [active, router, statusFilter]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const response = await fetch("/api/admin/payments/stats", { method: "GET" });
        if (response.status === 401) {
          router.replace("/admin/auth");
          return;
        }
        if (!response.ok) {
          throw new Error(await readResponseError(response));
        }

        const data = await response.json();
        if (!cancelled) {
          setStats({
            monthlyRevenue: Number(data?.monthlyRevenue || 0),
            totalPaid: Number(data?.totalPaid || 0),
            failedPayments: Number(data?.failedPayments || 0),
            activeSubscriptions: Number(data?.activeSubscriptions || 0),
            breakdown: Array.isArray(data?.breakdown) ? data.breakdown : [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.message || "Failed to load payment stats");
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [active, router]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/admin/payments/export", { method: "GET" });
      if (response.status === 401) {
        router.replace("/admin/auth");
        return;
      }
      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "dobook-payments.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.message || "Failed to export payments");
    } finally {
      setExporting(false);
    }
  };

  const chartData = Array.isArray(stats.breakdown) ? stats.breakdown : [];

  return (
    <div className={cn("mt-8", active ? "block" : "hidden")}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Payments</h2>
            <p className="text-sm text-muted-foreground">Stripe payment events, revenue, and subscription activity.</p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Monthly Revenue"
            value={statsLoading ? "..." : formatAmount(stats.monthlyRevenue)}
            hint="Paid this month"
            icon={TrendingUp}
          />
          <StatCard
            title="Total Paid"
            value={statsLoading ? "..." : formatAmount(stats.totalPaid)}
            hint="All time"
            icon={Receipt}
          />
          <StatCard
            title="Failed Payments"
            value={statsLoading ? "..." : String(stats.failedPayments)}
            hint="This month"
            icon={AlertCircle}
          />
          <StatCard
            title="Active Subscriptions"
            value={statsLoading ? "..." : String(stats.activeSubscriptions)}
            hint="Active Pro businesses"
            icon={CreditCard}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter;
            return (
              <Button
                key={filter}
                type="button"
                variant={isActive ? "default" : "outline"}
                onClick={() => setStatusFilter(filter)}
                className={cn("rounded-full px-4", !isActive && "text-muted-foreground")}
              >
                {formatStatusLabel(filter)}
              </Button>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Records</CardTitle>
            <CardDescription>
              {paymentsLoading ? "Loading payment records..." : `${payments.length} record(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Amount (AUD)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="min-w-[220px]">
                        <div className="font-medium">{payment.business_name || "Unknown business"}</div>
                        <div className="text-xs text-muted-foreground">{payment.business_email || payment.description || "-"}</div>
                      </TableCell>
                      <TableCell>{formatAmount(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={paymentStatusClass(payment.status)}>
                          {formatStatusLabel(payment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.payment_type_label}</TableCell>
                      <TableCell>{payment.period_label}</TableCell>
                      <TableCell>{formatDate(payment.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {!paymentsLoading && payments.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No payment records in this filter.</div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Paid revenue by month over the last 12 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value) => `$${Number(value || 0).toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value) => [formatAmount(value), "Revenue"]}
                    labelFormatter={(label) => String(label || "")}
                  />
                  <Bar dataKey="revenue" fill="#e11d48" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Building2, Search, Edit, Crown, Users, TrendingUp, CreditCard, LogOut } from "lucide-react";

export default function AdminPanel() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsFilter, setReviewsFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [businessDetail, setBusinessDetail] = useState(null);
  const [businessDetailLoading, setBusinessDetailLoading] = useState(false);
  const [businessDraft, setBusinessDraft] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketStatus, setTicketStatus] = useState("open");
  const [supportReply, setSupportReply] = useState("");
  const [supportReplySending, setSupportReplySending] = useState(false);
  const [supportUpdating, setSupportUpdating] = useState(false);
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportFilter, setSupportFilter] = useState("open");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState("all");
  const [broadcastPreviewCount, setBroadcastPreviewCount] = useState(null);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("businesses");

  const getBusinessName = (business) => business?.business_name || business?.name || "";
  const formatCreatedAt = (raw) => {
    if (!raw) return "-";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };
  const readResponseError = async (response) => {
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
  };

  const fetchReviews = async (nextFilter) => {
    setReviewsLoading(true);
    try {
      const url = new URL("/api/admin/platform-reviews", window.location.origin);
      if (nextFilter && nextFilter !== "all") url.searchParams.set("status", nextFilter);
      const response = await fetch(url.toString(), { method: "GET" });
      if (response.status === 401) {
        router.replace("/admin/auth");
        return;
      }
      if (!response.ok) {
        const err = await readResponseError(response);
        throw new Error(err || "Failed to load reviews");
      }
      const data = await response.json();
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
    } catch (error) {
      setReviews([]);
      toast.error(error.message || "Failed to load reviews");
    } finally {
      setReviewsLoading(false);
    }
  };

  const updateReviewStatus = async (reviewId, status) => {
    try {
      const response = await fetch(`/api/admin/platform-reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.status === 401) {
        router.replace("/admin/auth");
        return;
      }
      if (!response.ok) {
        const err = await readResponseError(response);
        throw new Error(err || "Failed to update review");
      }
      toast.success(`Review ${status}`);
      await fetchReviews(reviewsFilter);
    } catch (error) {
      toast.error(error.message || "Failed to update review");
    }
  };

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    free: 0,
    pro: 0,
    active: 0,
    inactive: 0,
    monthlyRevenue: 0,
    newSignupsThisMonth: 0,
    bookingsThisMonth: 0,
    churnThisMonth: 0,
    openTickets: 0
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        setAuthLoading(false);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/businesses');

      if (response.status === 401) {
        router.replace('/admin/auth');
        return;
      }
      
      if (!response.ok) {
        const err = await readResponseError(response);
        toast.error(err || "Failed to load businesses data");
        setAuthLoading(false);
        return;
      }

      const data = await response.json();
      setBusinesses(data.businesses || []);
      calculateStats(data.businesses || []);
      await Promise.all([fetchReviews(reviewsFilter), loadStats(), fetchActivityLog()]);
    } catch (error) {
      toast.error(error.message || "Failed to load businesses data");
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  };

  const calculateStats = (businesses) => {
    const next = {
      total: businesses.length,
      free: businesses.filter(b => b.subscription_plan === 'free').length,
      pro: businesses.filter(b => b.subscription_plan === 'pro').length,
      active: businesses.filter(b => b.subscription_status === 'active').length,
      inactive: businesses.filter(b => b.subscription_status !== 'active').length
    };
    setStats((prev) => ({ ...prev, ...next }));
  };

  const loadStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (response.status === 401) {
        router.replace("/admin/auth");
        return;
      }
      if (!response.ok) {
        const err = await readResponseError(response);
        throw new Error(err || "Failed to load stats");
      }
      const data = await response.json();
      setStats((prev) => ({ ...prev, ...(data || {}) }));
    } catch (error) {
      toast.error(error.message || "Failed to load stats");
    }
  };

  const fetchActivityLog = async () => {
    setActivityLoading(true);
    try {
      const response = await fetch("/api/admin/activity-log?limit=100");
      if (response.status === 401) {
        router.replace("/admin/auth");
        return;
      }
      if (!response.ok) {
        const err = await readResponseError(response);
        throw new Error(err || "Failed to load activity log");
      }
      const data = await response.json();
      setActivityLog(Array.isArray(data?.logs) ? data.logs : []);
    } catch (error) {
      setActivityLog([]);
      toast.error(error.message || "Failed to load activity log");
    } finally {
      setActivityLoading(false);
    }
  };

  const filterBusinesses = () => {
    let filtered = businesses;

    if (searchTerm) {
      filtered = filtered.filter(b => 
        getBusinessName(b)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterPlan !== 'all') {
      filtered = filtered.filter(b => b.subscription_plan === filterPlan);
    }

    setFilteredBusinesses(filtered);
  };

  const fetchSupportTickets = async (status) => {
    setSupportLoading(true);
    try {
      const url = new URL("/api/admin/support-tickets", window.location.origin);
      const nextStatus = status || supportFilter;
      if (nextStatus && nextStatus !== "all") {
        url.searchParams.set("status", nextStatus);
      }
      const response = await fetch(url.toString(), { method: "GET" });
      if (response.status === 401) {
        router.replace("/admin/auth");
        return;
      }
      if (!response.ok) {
        const err = await readResponseError(response);
        throw new Error(err || "Failed to load support tickets");
      }
      const data = await response.json();
      setSupportTickets(Array.isArray(data?.tickets) ? data.tickets : []);
    } catch (error) {
      setSupportTickets([]);
      toast.error(error.message || "Failed to load support tickets");
    } finally {
      setSupportLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, status) => {
    setSupportUpdating(true);
    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.status === 401) {
        router.replace("/admin/auth");
        return;
      }
      if (!response.ok) {
        const err = await readResponseError(response);
        throw new Error(err || "Failed to update ticket");
      }
      const data = await response.json();
      const updated = data?.ticket;
      if (updated) {
        setSelectedTicket((prev) => (prev?.id === updated.id ? updated : prev));
        setSupportTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      }
      toast.success("Ticket status updated");
      await Promise.all([loadStats(), fetchActivityLog(), fetchSupportTickets(supportFilter)]);
    } catch (error) {
      toast.error(error.message || "Failed to update ticket");
    } finally {
      setSupportUpdating(false);
    }
  };

  const sendSupportReply = async (ticketId) => {
    if (!supportReply.trim()) return;
    setSupportReplySending(true);
    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: supportReply }),
      });
      if (response.status === 401) {
        router.replace("/admin/auth");
        return;
      }
      if (!response.ok) {
        const err = await readResponseError(response);
        throw new Error(err || "Failed to send reply");
      }
      toast.success("Reply sent");
      setSupportReply("");
      await fetchActivityLog();
    } catch (error) {
      toast.error(error.message || "Failed to send reply");
    } finally {
      setSupportReplySending(false);
    }
  };

  const getAudienceCount = (audience) => {
    const next = String(audience || "all").toLowerCase();
    const filtered = (businesses || []).filter((b) => {
      if (!String(b?.email || "").trim()) return false;
      if (next === "pro") return b.subscription_plan === "pro";
      if (next === "free") return b.subscription_plan === "free";
      if (next === "inactive") return b.subscription_status !== "active";
      return true;
    });
    return filtered.length;
  };

  const sendBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    setBroadcastSending(true);
    try {
      const response = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: broadcastSubject.trim(),
          message: broadcastMessage.trim(),
          audience: broadcastAudience,
        }),
      });
      if (response.status === 401) {
        router.replace("/admin/auth");
        return;
      }
      if (!response.ok) {
        const err = await readResponseError(response);
        throw new Error(err || "Failed to send broadcast");
      }
      const data = await response.json();
      toast.success(`Broadcast sent to ${data?.sent_count ?? 0} businesses`);
      setBroadcastSubject("");
      setBroadcastMessage("");
      setBroadcastPreviewCount(null);
      await Promise.all([fetchActivityLog(), loadStats()]);
    } catch (error) {
      toast.error(error.message || "Failed to send broadcast");
    } finally {
      setBroadcastSending(false);
    }
  };

  useEffect(() => {
    filterBusinesses();
  }, [businesses, searchTerm, filterPlan]);

  useEffect(() => {
    fetchReviews(reviewsFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewsFilter]);

  useEffect(() => {
    if (activeTab !== "support") return;
    fetchSupportTickets(supportFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, supportFilter]);

  useEffect(() => {
    if (!editingBusiness?.id) {
      setBusinessDetail(null);
      setBusinessDraft(null);
      return;
    }
    let cancelled = false;
    const loadDetail = async () => {
      setBusinessDetailLoading(true);
      try {
        const response = await fetch(`/api/admin/businesses/${editingBusiness.id}/detail`);
        if (response.status === 401) {
          router.replace("/admin/auth");
          return;
        }
        if (!response.ok) {
          const err = await readResponseError(response);
          throw new Error(err || "Failed to load business details");
        }
        const data = await response.json();
        if (cancelled) return;
        setBusinessDetail(data || null);
        setBusinessDraft(data?.business ? { ...data.business } : null);
      } catch (error) {
        if (!cancelled) toast.error(error.message || "Failed to load business details");
      } finally {
        if (!cancelled) setBusinessDetailLoading(false);
      }
    };
    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [editingBusiness?.id, router]);

  useEffect(() => {
    if (!selectedTicket) return;
    setTicketStatus(selectedTicket.status || "open");
    setSupportReply("");
  }, [selectedTicket]);

  const handleLogout = () => {
    fetch("/api/admin/auth/logout", { method: "POST" })
      .catch(() => {})
      .finally(() => router.push("/admin/auth"));
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Checking admin access...</div>
      </div>
    );
  }

  const handleSetSubscription = async (businessId, nextPlan, nextStatus) => {
    try {
      const response = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_plan: nextPlan,
          subscription_status: nextStatus,
        })
      });

      if (response.status === 401) {
        router.replace('/admin/auth');
        return;
      }

      if (!response.ok) {
        const err = await readResponseError(response);
        throw new Error(err || 'Failed to update subscription');
      }

      toast.success(`Subscription updated to ${String(nextPlan).toUpperCase()}`);
      await checkAuthAndFetch();
    } catch (error) {
      toast.error(error.message || "Failed to update subscription");
    }
  };

  const handleDeleteBusiness = async (businessId) => {
    if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'DELETE'
      });

      if (response.status === 401) {
        router.replace('/admin/auth');
        return;
      }

      if (!response.ok) {
        const err = await readResponseError(response);
        throw new Error(err || 'Failed to delete business');
      }

      toast.success("Business deleted successfully!");
      await checkAuthAndFetch();
    } catch (error) {
      toast.error(error.message || "Failed to delete business");
    }
  };

  const handleUpdateBusiness = async (businessData) => {
    try {
      const payload = {
        business_name: getBusinessName(businessData),
        email: businessData?.email || "",
        subscription_plan: businessData?.subscription_plan || "free",
        subscription_status: businessData?.subscription_status || "inactive",
        admin_notes: businessData?.admin_notes || "",
      };

      const response = await fetch(`/api/admin/businesses/${editingBusiness.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        router.replace('/admin/auth');
        return;
      }

      if (!response.ok) {
        const err = await readResponseError(response);
        throw new Error(err || 'Failed to update business');
      }

      toast.success("Business updated successfully!");
      setEditingBusiness(null);
      await checkAuthAndFetch();
    } catch (error) {
      toast.error(error.message || "Failed to update business");
    }
  };

  const getPlanBadge = (plan) => {
    if (String(plan || "").toLowerCase() === "pro") {
      return <Badge>Pro</Badge>;
    }
    return <Badge variant="secondary">Free</Badge>;
  };

  const getStatusBadge = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "active") {
      return <Badge>Active</Badge>;
    }
    if (normalized === "inactive") {
      return <Badge variant="outline">Inactive</Badge>;
    }
    if (normalized === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    return <Badge variant="outline">{normalized ? normalized.toUpperCase() : "INACTIVE"}</Badge>;
  };

  const getReviewStatusBadge = (status) => {
    const variants = {
      approved: "default",
      pending: "secondary",
      rejected: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {String(status || "pending").toUpperCase()}
      </Badge>
    );
  };

  const getTicketStatusBadge = (status) => {
    const variants = {
      open: "secondary",
      "in-progress": "default",
      resolved: "outline",
    };
    return (
      <Badge variant={variants[String(status || "open")] || "secondary"}>
        {String(status || "open").toUpperCase()}
      </Badge>
    );
  };

  const formatDateTime = (raw) => {
    if (!raw) return "-";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  const formatAction = (action) =>
    String(action || "")
      .replaceAll("_", " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="w-8 h-8" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Manage businesses and subscriptions</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-9 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Plans</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.free}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Plans</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pro}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Number(stats.monthlyRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Active Pro × $20</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Signups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newSignupsThisMonth}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bookingsThisMonth}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.churnThisMonth}</div>
            <p className="text-xs text-muted-foreground">Went inactive</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            Support
            <Badge variant="secondary" className="ml-1">
              {stats.openTickets || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
        </TabsList>

        <TabsContent value="businesses">
          {/* Filters */}
          <Card>
        <CardHeader>
          <CardTitle>Businesses</CardTitle>
          <CardDescription>Manage all registered businesses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search businesses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Businesses Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBusinesses.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{getBusinessName(business)}</div>
                        {business.account_role === 'owner' && (
                          <Badge variant="outline" className="text-xs">OWNER</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{business.email}</TableCell>
                    <TableCell>{getPlanBadge(business.subscription_plan)}</TableCell>
                    <TableCell>{getStatusBadge(business.subscription_status)}</TableCell>
                    <TableCell>
                      {formatCreatedAt(business.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetSubscription(business.id, 'pro', 'active')}
                        >
                          Grant Pro
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSetSubscription(business.id, 'free', 'inactive')}
                        >
                          Set Free
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingBusiness(business)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteBusiness(business.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredBusinesses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No businesses found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="reviews">
          {/* Platform Reviews Moderation */}
          <Card>
        <CardHeader>
          <CardTitle>DoBook Reviews</CardTitle>
          <CardDescription>Approve or deny business reviews before they show on the DoBook website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Select value={reviewsFilter} onValueChange={setReviewsFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter reviews" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {reviewsLoading ? "Loading..." : `${Array.isArray(reviews) ? reviews.length : 0} review(s)`}
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(reviews) ? reviews : []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="min-w-0">
                      <div className="font-medium truncate">{r.business_name || "-"}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{r.business_id || "-"}</div>
                    </TableCell>
                    <TableCell>{Number(r.rating || 0) ? `${r.rating}/5` : "-"}</TableCell>
                    <TableCell className="max-w-[360px] truncate">{r.comment || "-"}</TableCell>
                    <TableCell>{getReviewStatusBadge(String(r.status || "pending").toLowerCase())}</TableCell>
                    <TableCell>{formatCreatedAt(r.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateReviewStatus(r.id, "approved")}
                          className="text-green-600 hover:text-green-700"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateReviewStatus(r.id, "rejected")}
                          className="text-red-600 hover:text-red-700"
                        >
                          Deny
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!reviewsLoading && (Array.isArray(reviews) ? reviews.length : 0) === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No reviews in this filter.</div>
          ) : null}
        </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>Respond to business support requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <Select value={supportFilter} onValueChange={setSupportFilter}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter tickets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground">
                  {supportLoading ? "Loading..." : `${supportTickets.length} ticket(s)`}
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supportTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <div className="font-medium">{ticket.business_name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{ticket.business_email || "-"}</div>
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate">{ticket.subject}</TableCell>
                        <TableCell>{getTicketStatusBadge(ticket.status)}</TableCell>
                        <TableCell>{formatCreatedAt(ticket.created_at)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => setSelectedTicket(ticket)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {!supportLoading && supportTickets.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">No tickets in this filter.</div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast">
          <Card>
            <CardHeader>
              <CardTitle>Broadcast Email</CardTitle>
              <CardDescription>Send updates to your businesses via email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="broadcast-subject">Subject</Label>
                <Input
                  id="broadcast-subject"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  placeholder="What's new in DoBook?"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="broadcast-audience">Audience</Label>
                <Select value={broadcastAudience} onValueChange={setBroadcastAudience}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All businesses</SelectItem>
                    <SelectItem value="pro">Pro only</SelectItem>
                    <SelectItem value="free">Free only</SelectItem>
                    <SelectItem value="inactive">Inactive only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="broadcast-message">Message</Label>
                <Textarea
                  id="broadcast-message"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Write your announcement. Basic HTML is allowed."
                  className="min-h-[160px]"
                />
                <p className="text-xs text-muted-foreground">Keep it concise. Basic line breaks are supported.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBroadcastPreviewCount(getAudienceCount(broadcastAudience))}
                >
                  Preview Audience
                </Button>
                {broadcastPreviewCount !== null ? (
                  <div className="text-sm text-muted-foreground">
                    Will send to {broadcastPreviewCount} business(es)
                  </div>
                ) : null}
              </div>
              <Button onClick={sendBroadcast} disabled={broadcastSending} className="w-full sm:w-auto">
                {broadcastSending ? "Sending..." : "Send Broadcast"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Recent admin actions</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="text-sm text-muted-foreground">Loading activity…</div>
          ) : activityLog.length ? (
            <div className="max-h-80 overflow-y-auto space-y-3">
              {activityLog.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-4 border-b pb-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{formatAction(log.action)}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Business: {log.business_name || log.target_business_id || "-"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No recent activity.</div>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={!!editingBusiness}
        onOpenChange={(open) => {
          if (!open) {
            setEditingBusiness(null);
            setBusinessDetail(null);
            setBusinessDraft(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Business Details</SheetTitle>
            <SheetDescription>Admin-only view of business performance</SheetDescription>
          </SheetHeader>
          {businessDetailLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Loading business details...</div>
          ) : businessDraft ? (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Created</div>
                  <div className="font-medium">{formatCreatedAt(businessDetail?.business?.created_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Last login</div>
                  <div className="font-medium">
                    {businessDetail?.stats?.last_login_at ? formatDateTime(businessDetail.stats.last_login_at) : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total bookings</div>
                  <div className="font-medium">{businessDetail?.stats?.bookings_count ?? 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total revenue</div>
                  <div className="font-medium">
                    ${Number(businessDetail?.stats?.total_revenue || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Business type</div>
                  <div className="font-medium">
                    {businessDetail?.business?.business_type || businessDetail?.business?.industry || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium">
                    {String(businessDraft.subscription_status || "inactive").toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Business Name</Label>
                <Input
                  value={getBusinessName(businessDraft)}
                  onChange={(e) => setBusinessDraft({ ...businessDraft, business_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={businessDraft.email || ""}
                  onChange={(e) => setBusinessDraft({ ...businessDraft, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Subscription Plan</Label>
                <Select
                  value={businessDraft.subscription_plan || "free"}
                  onValueChange={(value) => setBusinessDraft({ ...businessDraft, subscription_plan: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Subscription Status</Label>
                <Select
                  value={businessDraft.subscription_status || "inactive"}
                  onValueChange={(value) => setBusinessDraft({ ...businessDraft, subscription_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={businessDraft.admin_notes || ""}
                  onChange={(e) => setBusinessDraft({ ...businessDraft, admin_notes: e.target.value })}
                  className="min-h-[120px]"
                />
              </div>
            </div>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">Select a business to view details.</div>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditingBusiness(null)}>
              Close
            </Button>
            <Button onClick={() => handleUpdateBusiness(businessDraft)} disabled={!businessDraft}>
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!selectedTicket}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicket(null);
            setSupportReply("");
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Support Ticket</SheetTitle>
            <SheetDescription>View message and respond</SheetDescription>
          </SheetHeader>
          {selectedTicket ? (
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground">
                <div className="font-medium text-foreground">{selectedTicket.subject}</div>
                <div>{selectedTicket.business_name || "-"}</div>
                <div>{selectedTicket.business_email || "-"}</div>
                <div>{formatDateTime(selectedTicket.created_at)}</div>
              </div>
              <div className="rounded-md border p-4 whitespace-pre-wrap text-sm">
                {selectedTicket.message}
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={ticketStatus} onValueChange={setTicketStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => updateTicketStatus(selectedTicket.id, ticketStatus)}
                  disabled={supportUpdating}
                  className="w-fit"
                >
                  {supportUpdating ? "Updating..." : "Update Status"}
                </Button>
              </div>
              <div className="grid gap-2">
                <Label>Reply</Label>
                <Textarea
                  value={supportReply}
                  onChange={(e) => setSupportReply(e.target.value)}
                  placeholder="Write a response to the business..."
                  className="min-h-[120px]"
                />
                <Button
                  onClick={() => sendSupportReply(selectedTicket.id)}
                  disabled={supportReplySending || !supportReply.trim()}
                  className="w-fit"
                >
                  {supportReplySending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">Select a ticket to view details.</div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

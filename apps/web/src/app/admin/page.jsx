"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Business, Plus, Search, Edit, Trash2, Crown, Users, TrendingUp, CreditCard, LogOut } from "lucide-react";

export default function AdminPanel() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    free: 0,
    pro: 0,
    active: 0,
    inactive: 0
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth');
        return;
      }

      // Check if user has admin access
      const response = await fetch('/api/admin/businesses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          setMessage({ type: "error", text: "Admin access required. You need owner privileges to access this panel." });
        } else if (response.status === 401) {
          router.push('/auth');
        } else {
          setMessage({ type: "error", text: "Failed to access admin panel" });
        }
        setAuthLoading(false);
        return;
      }

      const data = await response.json();
      setBusinesses(data.businesses || []);
      calculateStats(data.businesses || []);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    filterBusinesses();
  }, [businesses, searchTerm, filterPlan]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('business');
    router.push('/');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Checking admin access...</div>
      </div>
    );
  }

  const calculateStats = (businesses) => {
    const stats = {
      total: businesses.length,
      free: businesses.filter(b => b.subscription_plan === 'free').length,
      pro: businesses.filter(b => b.subscription_plan === 'pro').length,
      active: businesses.filter(b => b.subscription_status === 'active').length,
      inactive: businesses.filter(b => b.subscription_status !== 'active').length
    };
    setStats(stats);
  };

  const filterBusinesses = () => {
    let filtered = businesses;

    if (searchTerm) {
      filtered = filtered.filter(b => 
        b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterPlan !== 'all') {
      filtered = filtered.filter(b => b.subscription_plan === filterPlan);
    }

    setFilteredBusinesses(filtered);
  };

  const handleUpgradeToPro = async (businessId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/businesses/${businessId}/upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to upgrade business');
      }

      setMessage({ type: "success", text: "Business upgraded to pro plan successfully!" });
      fetchBusinesses();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  const handleDeleteBusiness = async (businessId) => {
    if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete business');
      }

      setMessage({ type: "success", text: "Business deleted successfully!" });
      fetchBusinesses();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  const handleUpdateBusiness = async (businessData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/businesses/${editingBusiness.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(businessData)
      });

      if (!response.ok) {
        throw new Error('Failed to update business');
      }

      setMessage({ type: "success", text: "Business updated successfully!" });
      setEditingBusiness(null);
      fetchBusinesses();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  const getPlanBadge = (plan) => {
    const variants = {
      free: "secondary",
      pro: "default"
    };
    return (
      <Badge variant={variants[plan] || "secondary"}>
        {plan?.toUpperCase() || "FREE"}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: "default",
      inactive: "secondary",
      cancelled: "destructive"
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status?.toUpperCase() || "INACTIVE"}
      </Badge>
    );
  };

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

      {message.text && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
            <Business className="h-4 w-4 text-muted-foreground" />
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
      </div>

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
                        <div className="font-medium">{business.name}</div>
                        {business.account_role === 'owner' && (
                          <Badge variant="outline" className="text-xs">OWNER</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{business.email}</TableCell>
                    <TableCell>{getPlanBadge(business.subscription_plan)}</TableCell>
                    <TableCell>{getStatusBadge(business.subscription_status)}</TableCell>
                    <TableCell>
                      {new Date(business.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {business.subscription_plan === 'free' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpgradeToPro(business.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Crown className="w-4 h-4 mr-1" />
                            Upgrade
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingBusiness(business)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteBusiness(business.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Edit Business Dialog */}
      <Dialog open={!!editingBusiness} onOpenChange={() => setEditingBusiness(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>
              Update business information and subscription details.
            </DialogDescription>
          </DialogHeader>
          {editingBusiness && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  value={editingBusiness.name || ''}
                  onChange={(e) => setEditingBusiness({...editingBusiness, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingBusiness.email || ''}
                  onChange={(e) => setEditingBusiness({...editingBusiness, email: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan">Subscription Plan</Label>
                <Select 
                  value={editingBusiness.subscription_plan || 'free'} 
                  onValueChange={(value) => setEditingBusiness({...editingBusiness, subscription_plan: value})}
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
                <Label htmlFor="status">Subscription Status</Label>
                <Select 
                  value={editingBusiness.subscription_status || 'inactive'} 
                  onValueChange={(value) => setEditingBusiness({...editingBusiness, subscription_status: value})}
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBusiness(null)}>
              Cancel
            </Button>
            <Button onClick={() => handleUpdateBusiness(editingBusiness)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

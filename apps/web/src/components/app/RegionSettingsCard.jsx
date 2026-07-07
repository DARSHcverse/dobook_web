"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countryOptions, getCountryProfile, normalizeCountryCode, DEFAULT_COUNTRY_CODE } from "@/lib/countries";
import { formatMoney, normalizeCurrency } from "@/lib/money";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API = `${API_BASE}/api`;

// Currencies offered in the picker (superset of what countries map to).
const CURRENCIES = ["aud", "usd", "gbp", "eur", "cad", "nzd", "inr", "sgd", "myr", "zar", "aed", "brl", "mxn", "jpy"];

export default function RegionSettingsCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [currency, setCurrency] = useState("aud");
  const [distanceUnit, setDistanceUnit] = useState("km");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await axios.get(`${API}/business/profile`);
        const b = res?.data || {};
        if (!active) return;
        setCountryCode(normalizeCountryCode(b.country_code) || DEFAULT_COUNTRY_CODE);
        setCurrency(normalizeCurrency(b.currency));
        setDistanceUnit(b.distance_unit === "mi" ? "mi" : "km");
      } catch {
        // keep defaults
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // When the country changes, pre-fill currency + units from its profile
  // (still editable below).
  function handleCountryChange(value) {
    const code = normalizeCountryCode(value) || DEFAULT_COUNTRY_CODE;
    setCountryCode(code);
    const profile = getCountryProfile(code);
    setCurrency(profile.currency);
    setDistanceUnit(profile.distance_unit);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await axios.put(`${API}/business/profile`, {
        country_code: countryCode,
        currency,
        distance_unit: distanceUnit,
      });
      toast.success("Region settings saved");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save region settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Region &amp; Currency</CardTitle>
        <CardDescription>
          Sets how prices, distances, and phone numbers appear for your business and customers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="region_country">Country</Label>
            <Select value={countryCode} onValueChange={handleCountryChange} disabled={loading}>
              <SelectTrigger id="region_country" className="bg-zinc-50">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countryOptions().map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="region_currency">Currency</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(normalizeCurrency(v))} disabled={loading}>
              <SelectTrigger id="region_currency" className="bg-zinc-50">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.toUpperCase()} — {formatMoney(100, c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="region_units">Distance units</Label>
            <Select value={distanceUnit} onValueChange={(v) => setDistanceUnit(v === "mi" ? "mi" : "km")} disabled={loading}>
              <SelectTrigger id="region_units" className="bg-zinc-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="km">Kilometres (km)</SelectItem>
                <SelectItem value="mi">Miles (mi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          Changing the country pre-fills the currency and units — adjust either if needed. Existing bookings and invoices
          keep their recorded amounts.
        </p>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || loading} className="rounded-full">
            {saving ? "Saving…" : "Save region settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

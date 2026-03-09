"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { Briefcase, GraduationCap, Hammer, Scissors, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BUSINESS_TYPES, getBusinessTypeTemplate, normalizeBusinessType } from "@/lib/businessTypeTemplates";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API = `${API_BASE}/api`;

const ICONS = {
  scissors: Scissors,
  stethoscope: Stethoscope,
  briefcase: Briefcase,
  "graduation-cap": GraduationCap,
  hammer: Hammer,
};

export default function BusinessTypeSettingsCard({ business, onUpdate }) {
  const [selected, setSelected] = useState(normalizeBusinessType(business?.business_type) || "");
  const [loading, setLoading] = useState(false);

  const currentType = useMemo(() => BUSINESS_TYPES.find((t) => t.id === selected) || null, [selected]);
  const template = useMemo(() => (selected ? getBusinessTypeTemplate(selected) : null), [selected]);

  const summary = useMemo(() => {
    if (!template) return null;
    const services = Array.isArray(template.services) ? template.services : [];
    const fields = Array.isArray(template.booking_fields) ? template.booking_fields : [];
    const addons = Array.isArray(template.addons) ? template.addons : [];
    const scheduling = template.scheduling || {};
    return {
      servicesCount: services.length,
      fieldsCount: fields.length,
      addonsCount: addons.length,
      bufferMins: Number(scheduling.buffer_mins || 0),
      advanceBookingHrs: Number(scheduling.advance_booking_hrs || 0),
      reminderHours: Array.isArray(scheduling.reminder_timing_hrs) ? scheduling.reminder_timing_hrs : [],
      allowRecurring: Boolean(scheduling.allow_recurring),
      requireDeposit: Boolean(scheduling.require_deposit),
    };
  }, [template]);

  async function applyTemplate() {
    const bt = normalizeBusinessType(selected);
    if (!bt) {
      toast.error("Please choose a business type");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("dobook_token");
      if (!token) throw new Error("Not logged in");

      const res = await axios.post(
        `${API}/business/business-type/apply`,
        { business_type: bt },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const applied = res?.data;
      if (applied?.ok) {
        toast.success("Business type defaults applied");
      } else {
        toast.success("Business type updated");
      }

      const refreshed = await axios.get(`${API}/business/profile`, { headers: { Authorization: `Bearer ${token}` } });
      onUpdate?.(refreshed?.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Failed to apply business type");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle style={{ fontFamily: "Manrope" }}>Business Type</CardTitle>
        <CardDescription>
          Choose your industry to pre-fill services, booking fields, add-ons, and scheduling defaults. You can edit everything
          afterwards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BUSINESS_TYPES.map((t) => {
            const Icon = ICONS[t.icon] || Briefcase;
            const active = selected === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                className={`p-4 rounded-2xl border text-left transition-colors ${
                  active ? "border-rose-200 bg-rose-50 hover:bg-rose-100" : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
                aria-pressed={active}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      active ? "bg-rose-600 text-white" : "bg-zinc-100 text-zinc-700"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900">{t.label}</div>
                    <div className="text-xs text-zinc-600 mt-1">{t.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {summary ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            <div className="font-semibold text-zinc-900">
              Suggested defaults for {currentType?.label || "this type"}
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>Service categories: {summary.servicesCount}</div>
              <div>Booking fields: {summary.fieldsCount}</div>
              <div>Add-ons: {summary.addonsCount}</div>
              <div>Buffer: {summary.bufferMins} mins</div>
              <div>Advance booking: {summary.advanceBookingHrs} hrs</div>
              <div>Recurring: {summary.allowRecurring ? "Enabled" : "Disabled"}</div>
              <div>Deposit required: {summary.requireDeposit ? "Yes" : "No"}</div>
              <div>
                Reminders:{" "}
                {summary.reminderHours.length ? summary.reminderHours.map((h) => `${h}h`).join(", ") : "Not set"}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-zinc-600">
              Applying defaults will not overwrite existing services, fields, add-ons, or scheduling you’ve already set up.
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          onClick={applyTemplate}
          disabled={loading || !selected}
          className="h-11 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
        >
          {loading ? "Applying..." : "Apply suggested defaults"}
        </Button>
      </CardContent>
    </Card>
  );
}


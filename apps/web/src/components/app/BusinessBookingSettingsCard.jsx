"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API = `${API_BASE}/api`;

function slugKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function parseOptions(value) {
  return String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export default function BusinessBookingSettingsCard() {
  const [loading, setLoading] = useState(false);
  const [savingFields, setSavingFields] = useState(false);
  const [savingAddons, setSavingAddons] = useState(false);

  const [fields, setFields] = useState([]);
  const [addons, setAddons] = useState([]);

  const token = useMemo(() => (typeof window === "undefined" ? "" : localStorage.getItem("dobook_token") || ""), []);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      try {
        const [f, a] = await Promise.all([
          axios.get(`${API}/business/booking-form-fields`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/business/service-addons`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setFields(Array.isArray(f?.data) ? f.data : []);
        setAddons(Array.isArray(a?.data) ? a.data : []);
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Failed to load booking settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  async function saveFields() {
    if (!token) return;
    setSavingFields(true);
    try {
      const payload = (fields || []).map((f, i) => ({
        field_key: String(f?.field_key || slugKey(f?.field_name) || "").trim(),
        field_name: String(f?.field_name || "").trim(),
        field_type: String(f?.field_type || "text"),
        required: Boolean(f?.required),
        is_private: Boolean(f?.is_private),
        sort_order: i * 10,
        field_options: Array.isArray(f?.field_options) ? f.field_options : parseOptions(f?.field_options_raw),
      }));

      const res = await axios.put(`${API}/business/booking-form-fields`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFields(Array.isArray(res?.data) ? res.data : []);
      toast.success("Booking fields saved");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save booking fields");
    } finally {
      setSavingFields(false);
    }
  }

  async function saveAddons() {
    if (!token) return;
    setSavingAddons(true);
    try {
      const payload = (addons || []).map((a, i) => ({
        name: String(a?.name || "").trim(),
        description: String(a?.description || "").trim(),
        price: Number(a?.price || 0),
        duration_extra_mins: Number(a?.duration_extra_mins || 0),
        is_active: a?.is_active === false ? false : true,
        sort_order: i * 10,
      }));

      const res = await axios.put(`${API}/business/service-addons`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAddons(Array.isArray(res?.data) ? res.data : []);
      toast.success("Add-ons saved");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save add-ons");
    } finally {
      setSavingAddons(false);
    }
  }

  return (
    <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle style={{ fontFamily: "Manrope" }}>Booking Fields & Extras</CardTitle>
        <CardDescription>
          These power the customer booking form. Private fields never show to customers (they’re stored on the booking only).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Booking form fields</div>
              <div className="text-xs text-zinc-500">Shown on the public booking page (except private fields).</div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={loading}
              onClick={() =>
                setFields([
                  ...(Array.isArray(fields) ? fields : []),
                  { field_key: "", field_name: "", field_type: "text", required: false, is_private: false, field_options: [] },
                ])
              }
            >
              Add field
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {(fields || []).length === 0 ? (
              <div className="text-sm text-zinc-500 rounded-xl border border-dashed border-zinc-200 p-4">
                No fields yet. Apply a business type template or add your first field.
              </div>
            ) : null}

            {(fields || []).map((f, idx) => {
              const type = String(f?.field_type || "text");
              return (
                <div key={`${f?.id || f?.field_key || idx}`} className="rounded-2xl border border-zinc-200 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <Label>Label</Label>
                      <Input
                        className="bg-zinc-50 mt-2 h-11"
                        value={String(f?.field_name || "")}
                        onChange={(e) => {
                          const next = [...(fields || [])];
                          next[idx] = { ...next[idx], field_name: e.target.value };
                          if (!String(next[idx].field_key || "").trim()) next[idx].field_key = slugKey(e.target.value);
                          setFields(next);
                        }}
                        placeholder="e.g. Company name"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <Label>Type</Label>
                      <Select
                        value={type}
                        onValueChange={(v) => {
                          const next = [...(fields || [])];
                          next[idx] = { ...next[idx], field_type: v };
                          setFields(next);
                        }}
                      >
                        <SelectTrigger className="bg-zinc-50 mt-2 h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="textarea">Long text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="time">Time</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                          <SelectItem value="boolean">Yes/No</SelectItem>
                          <SelectItem value="file">File upload</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-4 flex items-end gap-3">
                      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 h-11">
                        <Checkbox
                          checked={Boolean(f?.required)}
                          onCheckedChange={(v) => {
                            const next = [...(fields || [])];
                            next[idx] = { ...next[idx], required: Boolean(v) };
                            setFields(next);
                          }}
                        />
                        <div className="text-sm text-zinc-700">Required</div>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 h-11">
                        <Checkbox
                          checked={Boolean(f?.is_private)}
                          onCheckedChange={(v) => {
                            const next = [...(fields || [])];
                            next[idx] = { ...next[idx], is_private: Boolean(v) };
                            setFields(next);
                          }}
                        />
                        <div className="text-sm text-zinc-700">Private</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        onClick={() => setFields((fields || []).filter((_, i) => i !== idx))}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {type === "select" ? (
                    <div className="mt-4">
                      <Label>Options (comma separated)</Label>
                      <Input
                        className="bg-zinc-50 mt-2 h-11"
                        value={Array.isArray(f?.field_options) ? f.field_options.join(", ") : String(f?.field_options_raw || "")}
                        onChange={(e) => {
                          const next = [...(fields || [])];
                          next[idx] = { ...next[idx], field_options_raw: e.target.value, field_options: parseOptions(e.target.value) };
                          setFields(next);
                        }}
                        placeholder="e.g. Video, Phone, In-person"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={saveFields}
              disabled={loading || savingFields}
              className="h-11 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
            >
              {savingFields ? "Saving…" : "Save fields"}
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Service add-ons / extras</div>
              <div className="text-xs text-zinc-500">Optional add-ons shown as checkboxes on the booking page.</div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={loading}
              onClick={() =>
                setAddons([
                  ...(Array.isArray(addons) ? addons : []),
                  { name: "", description: "", price: 0, duration_extra_mins: 0, is_active: true },
                ])
              }
            >
              Add add-on
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {(addons || []).length === 0 ? (
              <div className="text-sm text-zinc-500 rounded-xl border border-dashed border-zinc-200 p-4">
                No add-ons yet. Apply a business type template or add your first add-on.
              </div>
            ) : null}

            {(addons || []).map((a, idx) => (
              <div key={`${a?.id || a?.name || idx}`} className="rounded-2xl border border-zinc-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4">
                    <Label>Name</Label>
                    <Input
                      className="bg-zinc-50 mt-2 h-11"
                      value={String(a?.name || "")}
                      onChange={(e) => {
                        const next = [...(addons || [])];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setAddons(next);
                      }}
                      placeholder="e.g. Extended session (+30 min)"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Price</Label>
                    <Input
                      className="bg-zinc-50 mt-2 h-11"
                      type="number"
                      step="0.01"
                      min="0"
                      value={String(a?.price ?? 0)}
                      onChange={(e) => {
                        const next = [...(addons || [])];
                        next[idx] = { ...next[idx], price: e.target.value };
                        setAddons(next);
                      }}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Extra minutes</Label>
                    <Input
                      className="bg-zinc-50 mt-2 h-11"
                      type="number"
                      step="5"
                      min="0"
                      value={String(a?.duration_extra_mins ?? 0)}
                      onChange={(e) => {
                        const next = [...(addons || [])];
                        next[idx] = { ...next[idx], duration_extra_mins: e.target.value };
                        setAddons(next);
                      }}
                    />
                  </div>
                  <div className="md:col-span-3 flex items-end gap-3">
                    <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 h-11">
                      <Checkbox
                        checked={a?.is_active === false ? false : true}
                        onCheckedChange={(v) => {
                          const next = [...(addons || [])];
                          next[idx] = { ...next[idx], is_active: Boolean(v) };
                          setAddons(next);
                        }}
                      />
                      <div className="text-sm text-zinc-700">Active</div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={() => setAddons((addons || []).filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <Label>Description</Label>
                  <Textarea
                    className="bg-zinc-50 mt-2"
                    value={String(a?.description || "")}
                    onChange={(e) => {
                      const next = [...(addons || [])];
                      next[idx] = { ...next[idx], description: e.target.value };
                      setAddons(next);
                    }}
                    placeholder="Optional details shown to customers"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={saveAddons}
              disabled={loading || savingAddons}
              className="h-11 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
            >
              {savingAddons ? "Saving…" : "Save add-ons"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


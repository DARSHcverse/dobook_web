"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BUSINESS_TYPES } from "@/lib/businessTypeTemplates";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API = `${API_BASE}/api`;

function typeLabel(id) {
  return BUSINESS_TYPES.find((t) => t.id === id)?.label || id;
}

export default function AiOnboardingCard({ onApplied = () => {} }) {
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [config, setConfig] = useState(null);

  async function handleGenerate() {
    if (description.trim().length < 10) {
      toast.error("Describe your business in a bit more detail.");
      return;
    }
    setGenerating(true);
    setConfig(null);
    try {
      const res = await axios.post(`${API}/business/ai-onboarding`, {
        action: "preview",
        description: description.trim(),
      });
      setConfig(res?.data?.config || null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not generate a setup. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleApply() {
    if (!config) return;
    setApplying(true);
    try {
      const res = await axios.post(`${API}/business/ai-onboarding`, { action: "apply", config });
      const r = res?.data || {};
      toast.success(
        `Applied: ${typeLabel(r.business_type)} — ${r.services_count} services, ${r.fields_count} fields, ${r.addons_count} add-ons.`,
      );
      setConfig(null);
      setDescription("");
      onApplied(r);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not apply the setup.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card className="border-rose-200 bg-gradient-to-b from-rose-50/60 to-white">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <CardTitle style={{ fontFamily: "Manrope" }}>Set up with AI</CardTitle>
            <CardDescription>
              Describe your business and we&apos;ll configure your booking type, services, fields, and add-ons.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. I run a mobile dog grooming service. Customers book a slot, tell me their dog's breed and size, and can add nail trimming or de-shedding."
          rows={3}
          className="bg-white resize-none"
          disabled={generating || applying}
        />

        <div className="flex justify-end">
          <Button onClick={handleGenerate} disabled={generating || applying} className="rounded-full bg-rose-600 hover:bg-rose-700">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generate setup
              </>
            )}
          </Button>
        </div>

        {config && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900">Suggested type:</span>
              <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">{typeLabel(config.business_type)}</Badge>
              {config.reasoning ? <span className="text-xs text-zinc-500">{config.reasoning}</span> : null}
            </div>

            {config.services?.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">Services</div>
                <div className="flex flex-wrap gap-1.5">
                  {config.services.map((s) => (
                    <Badge key={s} variant="secondary" className="font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {config.booking_fields?.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">Extra booking fields</div>
                <ul className="space-y-1">
                  {config.booking_fields.map((f) => (
                    <li key={f.field_key} className="flex items-center gap-2 text-sm text-zinc-700">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{f.field_name}</span>
                      <span className="text-xs text-zinc-400">({f.field_type})</span>
                      {f.required ? <span className="text-xs text-rose-500">required</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {config.addons?.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">Add-ons</div>
                <ul className="space-y-1">
                  {config.addons.map((a) => (
                    <li key={a.name} className="flex items-center gap-2 text-sm text-zinc-700">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{a.name}</span>
                      {a.duration_extra_mins ? <span className="text-xs text-zinc-400">+{a.duration_extra_mins} min</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-zinc-500">
                Applying replaces your current booking fields and add-ons. You can fine-tune everything below afterwards.
              </p>
              <Button onClick={handleApply} disabled={applying} className="rounded-full shrink-0">
                {applying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying…
                  </>
                ) : (
                  "Apply this setup"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

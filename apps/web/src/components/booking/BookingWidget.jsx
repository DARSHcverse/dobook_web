'use client';

// Extracted from App.js so /book/[businessId] — a public, customer-facing page —
// no longer ships the entire business dashboard to every person making a booking.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Building2,
  Calendar,
  CalendarDays,
  ClipboardList,
  CreditCard,
  DollarSign,
  MapPin,
  MessageSquare,
  Smartphone,
  Star,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddressAutocomplete from '@/components/app/AddressAutocomplete';
import { isValidPhone, phoneValidationHint } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { API, DOBOOK_LOGO_PNG } from '@/lib/appShared';

// ============= Public Booking Widget =============
export default function BookingWidget() {
  const { businessId } = useParams();
  const resolvedBusinessId = Array.isArray(businessId) ? businessId[0] : businessId;
  const [business, setBusiness] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_type: 'Photo Booth',
    booth_type: 'Open Booth',
    package_duration: '2 Hours',
    event_location: '',
    event_location_geo: null,
    booking_date: '',
    booking_time: '',
    duration_minutes: 120,
    parking_info: '',
    notes: '',
    company_website: '',
    price: '',
    quantity: 1,
    apply_cbd_fee: false,
    custom_fields: {},
    addon_ids: [],
  });
  const [loading, setLoading] = useState(false);
  const [uploadingFields, setUploadingFields] = useState({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.parent === window) return;

    let raf = 0;
    let last = 0;
    const send = () => {
      raf = 0;
      const height = Math.max(
        document.documentElement?.scrollHeight || 0,
        document.body?.scrollHeight || 0,
      );
      if (!height || Math.abs(height - last) < 2) return;
      last = height;
      window.parent.postMessage({ type: 'dobook:resize', height }, '*');
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(send);
    };

    schedule();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    try {
      ro?.observe(document.documentElement);
      if (document.body) ro?.observe(document.body);
    } catch {
      // ignore
    }

    window.addEventListener('load', schedule);
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      ro?.disconnect?.();
      window.removeEventListener('load', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  useEffect(() => {
    loadBusiness();
  }, [resolvedBusinessId]);

  const loadBusiness = async () => {
    try {
      const response = await axios.get(`${API}/widget/business/${resolvedBusinessId}/info`);
      setBusiness(response.data);
      const boothTypes = Array.isArray(response.data?.booth_types) && response.data.booth_types.length
        ? response.data.booth_types
        : ['Open Booth', 'Glam Booth', 'Enclosed Booth'];
      const isPhotoBooth = String(response.data?.industry || 'photobooth') === 'photobooth';
      setFormData((prev) => ({
        ...prev,
        booth_type: isPhotoBooth
          ? (boothTypes.includes(prev.booth_type) ? prev.booth_type : (boothTypes[0] || 'Open Booth'))
          : '',
        service_type: isPhotoBooth
          ? 'Photo Booth'
          : (boothTypes.includes(prev.service_type) ? prev.service_type : (boothTypes[0] || 'Service')),
        package_duration: isPhotoBooth ? (prev.package_duration || '2 Hours') : '',
        duration_minutes: isPhotoBooth ? (prev.duration_minutes || 120) : 60,
        quantity: isPhotoBooth ? (prev.quantity || 1) : 1,
        price: isPhotoBooth ? prev.price : 0,
        event_location: isPhotoBooth ? prev.event_location : '',
        event_location_geo: isPhotoBooth ? prev.event_location_geo : null,
        parking_info: isPhotoBooth ? prev.parking_info : '',
      }));
    } catch (error) {
      console.error('Failed to load business:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.customer_phone && !isValidPhone(formData.customer_phone)) {
      toast.error(phoneValidationHint());
      return;
    }
    setLoading(true);

    try {
      const isPhotoBooth = String(business?.industry || 'photobooth') === 'photobooth';
      const payload = isPhotoBooth
        ? { ...formData, service_type: 'Photo Booth', business_id: resolvedBusinessId }
        : {
            ...formData,
            service_type: formData.service_type || 'Service',
            booth_type: '',
            package_duration: '',
            business_id: resolvedBusinessId,
          };
      await axios.post(`${API}/public/bookings`, payload);
      setSuccess(true);
      toast.success('Booking confirmed! Check your email.');
    } catch (error) {
      toast.error('Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!business) {
    return (
      <div className="min-h-screen bg-[#fffaf7] px-4 py-12 sm:px-6 sm:py-16" data-testid="booking-widget-loading">
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
          <div className="w-full max-w-xl rounded-[32px] border border-white/80 bg-white/90 p-8 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-rose-100 text-rose-600 shadow-sm">
              <CalendarDays className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              Preparing your booking page
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-600" style={{ fontFamily: 'Inter' }}>
              Loading business details, booking fields, and extras so the form is ready to use.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const boothTypes = Array.isArray(business?.booth_types) && business.booth_types.length
    ? business.booth_types
    : ['Open Booth', 'Glam Booth', 'Enclosed Booth'];
  const bookingFormFields = Array.isArray(business?.booking_form_fields) ? business.booking_form_fields : [];
  const serviceAddons = Array.isArray(business?.service_addons) ? business.service_addons : [];
  const extraFields = Array.isArray(business?.booking_custom_fields) ? business.booking_custom_fields : [];
  const isPhotoBooth = String(business?.industry || 'photobooth') === 'photobooth';
  const bookingTypeKey = inferBookingTypeKey({ businessType: business?.business_type, industry: business?.industry });
  const bookingFields = BOOKING_FIELDS_BY_TYPE[bookingTypeKey] || BOOKING_FIELDS_BY_TYPE.photobooth;
  const bookingFieldKeys = new Set(bookingFields.map((f) => String(f?.key || '').trim()).filter(Boolean));
  const extraFormFields = (bookingFormFields || []).filter((f) => {
    const key = String(f?.field_key || '').trim();
    if (!key) return false;
    if (RESERVED_CUSTOM_FIELD_KEYS.has(key)) return false;
    if (bookingFieldKeys.has(key)) return false;
    return true;
  });

  const businessName = String(business?.business_name || 'DoBook');
  const hasSmsField = bookingFields.some((field) => String(field?.key || '').trim() === 'customer_phone');
  const serviceOptions = boothTypes.map((item) => String(item || '').trim()).filter(Boolean);
  const visibleServiceOptions = serviceOptions.slice(0, 4);
  const hiddenServiceCount = Math.max(0, serviceOptions.length - visibleServiceOptions.length);
  const selectedAddonIds = Array.isArray(formData.addon_ids) ? formData.addon_ids : [];
  const selectedAddonCount = selectedAddonIds.length;
  const selectedAddonTotal = serviceAddons.reduce((sum, addon) => {
    const id = String(addon?.id || '').trim();
    if (!id || !selectedAddonIds.includes(id)) return sum;
    return sum + Number(addon?.price || 0);
  }, 0);
  const hasTravelNotes =
    Boolean(business?.travel_fee_enabled) ||
    (Boolean(business?.cbd_fee_enabled) && Number(business?.cbd_fee_amount || 0) > 0);
  const bookingHeading = isPhotoBooth ? 'Reserve your event date' : 'Book your appointment';
  const bookingLead = isPhotoBooth
    ? 'Share your event details, venue, and preferred setup. Everything goes straight to the business in one polished request.'
    : 'Share your preferred service, date, and notes. The business receives everything in one clean booking request.';
  const sectionCardClassName =
    'rounded-[28px] border border-zinc-200/80 bg-[#fcfcfd]/85 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6';
  const fieldCardClassName =
    'rounded-[22px] border border-zinc-200/80 bg-white/95 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition hover:border-rose-200';
  const controlClassName =
    'mt-2 h-12 rounded-2xl border-zinc-200 bg-white px-4 text-[0.95rem] shadow-sm transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100';
  const selectTriggerClassName =
    'mt-2 h-12 rounded-2xl border-zinc-200 bg-white px-4 text-left text-[0.95rem] shadow-sm transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100';
  const textareaClassName =
    'mt-2 min-h-[120px] rounded-2xl border-zinc-200 bg-white px-4 py-3 text-[0.95rem] shadow-sm transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100';
  const labelClassName = 'text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-zinc-500';

  if (success) {
    return (
      <div className="min-h-screen bg-[#fff9f5] px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <Card
            data-testid="booking-success-card"
            className="overflow-hidden rounded-[34px] border border-white/70 bg-white/92 shadow-[0_32px_100px_rgba(15,23,42,0.12)] backdrop-blur"
          >
            <CardHeader className="relative px-6 pb-4 pt-10 text-center sm:px-10">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.16),transparent_55%)]" />
              <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-emerald-100 ring-8 ring-white shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
                <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <Badge className="mx-auto rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Booking confirmed
              </Badge>
              <CardTitle className="mt-5 text-3xl tracking-tight text-zinc-900 sm:text-4xl" style={{ fontFamily: 'Manrope' }}>
                You&apos;re all set with {businessName}
              </CardTitle>
              <CardDescription className="mx-auto mt-4 max-w-xl text-base leading-7 text-zinc-600" style={{ fontFamily: 'Inter' }}>
                Your booking request has been sent successfully. Check your inbox for the confirmation email and keep this tab open if you want to make another booking.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-10 pt-2 sm:px-10">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-zinc-200 bg-zinc-50/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <MessageSquare className="h-4 w-4 text-rose-500" />
                    Email confirmation
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Booking details have been sent to your email address.
                  </p>
                </div>
                <div className="rounded-[24px] border border-zinc-200 bg-zinc-50/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <Smartphone className="h-4 w-4 text-rose-500" />
                    SMS reminders
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {hasSmsField ? 'If you added a phone number, reminder messages can be sent there too.' : 'This booking page uses email confirmation for follow-up.'}
                  </p>
                </div>
                <div className="rounded-[24px] border border-zinc-200 bg-zinc-50/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <Calendar className="h-4 w-4 text-rose-500" />
                    Need another booking?
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Reopen the booking link any time to submit another request.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fffaf7] px-4 py-8 sm:px-6 sm:py-12" data-testid="booking-widget">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.18),transparent_34%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.16),transparent_24%)]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.09),transparent_64%)] blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.15fr] xl:gap-8">
          <section className="relative overflow-hidden rounded-[34px] border border-rose-200/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(255,247,245,0.90)_46%,rgba(255,241,237,0.98))] p-6 shadow-[0_30px_90px_rgba(244,63,94,0.12)] sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-rose-200/45 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-amber-200/45 blur-3xl" />

            <Badge className="rounded-full border border-rose-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
              Online booking portal
            </Badge>

            <div className="mt-8 flex items-start gap-4">
              <div className="rounded-[28px] bg-white/92 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-white/80">
                <img
                  src={business?.logo_src || DOBOOK_LOGO_PNG}
                  alt={`${businessName} logo`}
                  style={{ height: 78, width: 'auto', maxWidth: 210 }}
                  className="select-none"
                  draggable={false}
                  onError={(e) => { e.currentTarget.src = DOBOOK_LOGO_PNG; }}
                />
              </div>
            </div>

            <h1 className="mt-8 text-[clamp(2.1rem,4vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-zinc-950" style={{ fontFamily: 'Manrope' }}>
              {bookingHeading}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-zinc-600" style={{ fontFamily: 'Inter' }}>
              {bookingLead}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-[24px] border border-white/80 bg-white/78 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <CalendarDays className="h-4 w-4 text-rose-500" />
                  What happens next
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Submit your request, choose any extras, and receive confirmation by email{hasSmsField ? ' with optional SMS reminders' : ''}.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/80 bg-white/78 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Star className="h-4 w-4 text-rose-500" />
                  Popular options
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {visibleServiceOptions.length > 0 ? (
                    visibleServiceOptions.map((option) => (
                      <span
                        key={option}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700"
                      >
                        {option}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                      Custom service options
                    </span>
                  )}
                  {hiddenServiceCount > 0 ? (
                    <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                      +{hiddenServiceCount} more
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {(business?.phone || business?.email) ? (
              <div className="mt-8 space-y-3">
                {business?.phone ? (
                  <a
                    href={`tel:${String(business.phone).replace(/\s+/g, '')}`}
                    className="flex items-start gap-3 rounded-[22px] border border-white/80 bg-white/80 p-4 shadow-sm transition hover:border-rose-200 hover:bg-white"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">Business phone</div>
                      <div className="mt-1 text-sm text-zinc-600">{business.phone}</div>
                    </div>
                  </a>
                ) : null}

                {business?.email ? (
                  <a
                    href={`mailto:${business.email}`}
                    className="flex items-start gap-3 rounded-[22px] border border-white/80 bg-white/80 p-4 shadow-sm transition hover:border-rose-200 hover:bg-white"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">Business email</div>
                      <div className="mt-1 break-all text-sm text-zinc-600">{business.email}</div>
                    </div>
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="mt-8 rounded-[28px] bg-zinc-950 p-5 text-white shadow-[0_28px_60px_rgba(15,23,42,0.18)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold">Clear details before you submit</div>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    {selectedAddonCount > 0
                      ? `${selectedAddonCount} extra${selectedAddonCount === 1 ? '' : 's'} selected so far${selectedAddonTotal > 0 ? ` (${`$${selectedAddonTotal.toFixed(2)}`})` : ''}. `
                      : 'Optional extras can be added before you book. '}
                    {hasTravelNotes
                      ? 'Travel and logistics charges are shown clearly inside the form.'
                      : 'Booking notes and preferences are captured before you submit.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-5">
            <Card
              data-testid="booking-form-card"
              className="overflow-hidden rounded-[34px] border border-white/70 bg-white/92 shadow-[0_32px_100px_rgba(15,23,42,0.12)] backdrop-blur"
            >
              <CardHeader className="border-b border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,248,246,0.85))] px-6 py-6 sm:px-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                    Booking form
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                    {hasSmsField ? 'Email + SMS reminders' : 'Email confirmation'}
                  </Badge>
                </div>
                <CardTitle className="mt-5 text-[clamp(1.9rem,2.8vw,2.8rem)] tracking-[-0.04em] text-zinc-950" style={{ fontFamily: 'Manrope' }}>
                  Tell us about your booking
                </CardTitle>
                <CardDescription className="mt-3 max-w-2xl text-base leading-7 text-zinc-600" style={{ fontFamily: 'Inter' }}>
                  Share your preferred date, contact details, and any specifics we should know. Required fields are marked with an asterisk.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="company_website">Company website</label>
                    <input
                      id="company_website"
                      name="company_website"
                      type="text"
                      value={formData.company_website}
                      onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                      autoComplete="off"
                      tabIndex="-1"
                    />
                  </div>

                  <section className={sectionCardClassName}>
                    <div className="mb-5 flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-rose-100 text-rose-600 shadow-sm">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-zinc-950" style={{ fontFamily: 'Manrope' }}>
                          Booking details
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-zinc-500">
                          Contact info, preferred date, service details, and anything important for this booking.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {bookingFields.map((field) => {
                        const key = String(field?.key || '').trim();
                        if (!key) return null;
                        const type = String(field?.type || 'text').trim();
                        const label = String(field?.label || key).trim();
                        const required = Boolean(field?.required);
                        const placeholder = String(field?.placeholder || '').trim();
                        const isLongText = type === 'textarea' || key === 'notes';
                        const column = field?.column;
                        const value = column
                          ? formData?.[column]
                          : (formData.custom_fields?.[key] ?? '');

                        const setValue = (nextValue) => {
                          if (column) {
                            setFormData({ ...formData, [column]: nextValue });
                            return;
                          }
                          setFormData({
                            ...formData,
                            custom_fields: { ...(formData.custom_fields || {}), [key]: nextValue },
                          });
                        };

                        if (type === 'address') {
                          return (
                            <div key={key} className={`${fieldCardClassName} md:col-span-2`}>
                              <Label htmlFor={key} className={labelClassName}>
                                {label}
                                {required ? <span className="text-rose-500"> *</span> : null}
                              </Label>
                              <AddressAutocomplete
                                value={String(formData.event_location || '')}
                                onChange={(val, item) =>
                                  setFormData({ ...formData, event_location: val, event_location_geo: item || null })
                                }
                                placeholder={placeholder || 'Enter venue or address'}
                                className={controlClassName}
                                inputProps={{ id: key, required, 'data-testid': 'widget-location-input' }}
                              />
                            </div>
                          );
                        }

                        if (type === 'select_services') {
                          const selected = column ? String(formData?.[column] || '') : String(value || '');
                          return (
                            <div key={key} className={fieldCardClassName}>
                              <Label htmlFor={key} className={labelClassName}>
                                {label}
                                {required ? <span className="text-rose-500"> *</span> : null}
                              </Label>
                              <Select value={selected} onValueChange={(val) => setValue(val)}>
                                <SelectTrigger data-testid="widget-booth-select" className={selectTriggerClassName}>
                                  <SelectValue placeholder={placeholder || 'Select an option'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {boothTypes.map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }

                        if (type === 'package_duration') {
                          return (
                            <div key={key} className={fieldCardClassName}>
                              <Label htmlFor={key} className={labelClassName}>
                                {label}
                                {required ? <span className="text-rose-500"> *</span> : null}
                              </Label>
                              <Select
                                value={String(formData.package_duration || '')}
                                onValueChange={(val) => {
                                  const hours = parseInt(String(val || '').replaceAll(/\D+/g, ''), 10);
                                  setFormData({
                                    ...formData,
                                    package_duration: val,
                                    duration_minutes: Number.isFinite(hours) ? hours * 60 : formData.duration_minutes,
                                  });
                                }}
                              >
                                <SelectTrigger data-testid="widget-package-select" className={selectTriggerClassName}>
                                  <SelectValue placeholder="Choose a duration" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1 Hour">1 Hour</SelectItem>
                                  <SelectItem value="2 Hours">2 Hours</SelectItem>
                                  <SelectItem value="3 Hours">3 Hours</SelectItem>
                                  <SelectItem value="4 Hours">4 Hours</SelectItem>
                                  <SelectItem value="5 Hours">5 Hours</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }

                        if (type === 'time_window') {
                          const options = Array.isArray(field?.options) ? field.options : [];
                          return (
                            <div key={key} className={fieldCardClassName}>
                              <Label htmlFor={key} className={labelClassName}>
                                {label}
                                {required ? <span className="text-rose-500"> *</span> : null}
                              </Label>
                              <Select
                                value={String(value || '')}
                                onValueChange={(val) => {
                                  const selected = options.find((o) => String(o?.value) === String(val));
                                  setFormData({
                                    ...formData,
                                    booking_time: String(selected?.booking_time || '09:00'),
                                    custom_fields: { ...(formData.custom_fields || {}), [key]: val },
                                  });
                                }}
                              >
                                <SelectTrigger className={selectTriggerClassName}>
                                  <SelectValue placeholder="Select a time window" />
                                </SelectTrigger>
                                <SelectContent>
                                  {options.map((opt) => (
                                    <SelectItem key={`${key}-${String(opt?.value)}`} value={String(opt?.value)}>
                                      {String(opt?.label || opt?.value)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }

                        const inputType =
                          type === 'email' || type === 'tel' || type === 'date' || type === 'time'
                            ? type
                            : (type === 'number' || type === 'money')
                              ? 'number'
                              : 'text';

                        return (
                          <div key={key} className={cn(fieldCardClassName, isLongText && 'md:col-span-2')}>
                            <Label htmlFor={key} className={labelClassName}>
                              {label}
                              {required ? <span className="text-rose-500"> *</span> : null}
                            </Label>
                            {isLongText ? (
                              <Textarea
                                id={key}
                                value={String(value ?? '')}
                                onChange={(e) => setValue(e.target.value)}
                                className={textareaClassName}
                                rows={4}
                                placeholder={placeholder || 'Add any helpful details'}
                              />
                            ) : (
                              <Input
                                id={key}
                                data-testid={key === 'customer_phone' ? 'widget-phone-input' : undefined}
                                type={inputType}
                                step={type === 'money' ? '0.01' : undefined}
                                min={type === 'money' || type === 'number' ? '0' : undefined}
                                value={String(value ?? '')}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder={placeholder || undefined}
                                required={required}
                                inputMode={type === 'tel' ? 'tel' : undefined}
                                className={controlClassName}
                              />
                            )}
                            {key === 'customer_phone' ? (
                              <p className="mt-2 text-xs leading-5 text-zinc-500">
                                0400 000 000 or +61400000000. Add a mobile number if you want SMS confirmations and reminders.
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {extraFormFields.length > 0 ? (
                    <section className={sectionCardClassName}>
                      <div className="mb-5 flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-amber-100 text-amber-700 shadow-sm">
                          <ClipboardList className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-zinc-950" style={{ fontFamily: 'Manrope' }}>
                            Additional details
                          </h2>
                          <p className="mt-1 text-sm leading-6 text-zinc-500">
                            A few extra questions so {businessName} has everything needed before confirming.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {extraFormFields.map((f) => {
                          const key = String(f?.field_key || '').trim();
                          if (!key) return null;
                          const type = String(f?.field_type || 'text').trim();
                          const label = String(f?.field_name || key).trim();
                          const required = Boolean(f?.required);
                          const isPrivate = Boolean(f?.is_private);
                          const value = formData.custom_fields?.[key];

                          const setValue = (nextValue) =>
                            setFormData({
                              ...formData,
                              custom_fields: { ...(formData.custom_fields || {}), [key]: nextValue },
                            });

                          if (type === 'textarea') {
                            return (
                              <div key={key} className={`${fieldCardClassName} md:col-span-2`}>
                                <Label className={labelClassName}>
                                  {label}
                                  {required ? <span className="text-rose-500"> *</span> : null}
                                </Label>
                                {isPrivate ? (
                                  <div className="mt-2 text-[11px] leading-5 text-zinc-500">
                                    {key === 'health_notes'
                                      ? 'Private notes only visible to the practitioner. They are not included in emails.'
                                      : 'Private information is stored for the business only and not included in emails.'}
                                  </div>
                                ) : null}
                                <Textarea
                                  value={String(value ?? '')}
                                  onChange={(e) => setValue(e.target.value)}
                                  className={textareaClassName}
                                  rows={4}
                                />
                              </div>
                            );
                          }

                          if (type === 'select') {
                            const options = Array.isArray(f?.field_options) ? f.field_options : [];
                            return (
                              <div key={key} className={fieldCardClassName}>
                                <Label className={labelClassName}>
                                  {label}
                                  {required ? <span className="text-rose-500"> *</span> : null}
                                </Label>
                                {isPrivate ? (
                                  <div className="mt-2 text-[11px] leading-5 text-zinc-500">
                                    Private information is stored for the business only and not included in emails.
                                  </div>
                                ) : null}
                                <Select value={String(value ?? '')} onValueChange={(v) => setValue(v)}>
                                  <SelectTrigger className={selectTriggerClassName}>
                                    <SelectValue placeholder="Select an option" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {options.map((opt) => (
                                      <SelectItem key={`${key}-${String(opt)}`} value={String(opt)}>
                                        {String(opt)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          }

                          if (type === 'boolean') {
                            return (
                              <div key={key} className={`${fieldCardClassName} md:col-span-2`}>
                                <div className="flex items-center gap-3 rounded-[20px] border border-zinc-200 bg-zinc-50/80 p-4">
                                  <Checkbox checked={Boolean(value)} onCheckedChange={(v) => setValue(Boolean(v))} />
                                  <div className="text-sm font-medium text-zinc-800">
                                    {label}
                                    {required ? <span className="text-rose-500"> *</span> : null}
                                  </div>
                                </div>
                                {isPrivate ? (
                                  <div className="mt-2 text-[11px] leading-5 text-zinc-500">
                                    Private information is stored for the business only and not included in emails.
                                  </div>
                                ) : null}
                              </div>
                            );
                          }

                          if (type === 'file') {
                            const isUploading = Boolean(uploadingFields?.[key]);
                            const filesValue = Array.isArray(value) ? value : [];
                            return (
                              <div key={key} className={`${fieldCardClassName} md:col-span-2`}>
                                <Label className={labelClassName}>
                                  {label}
                                  {required ? <span className="text-rose-500"> *</span> : null}
                                </Label>
                                {isPrivate ? (
                                  <div className="mt-2 text-[11px] leading-5 text-zinc-500">
                                    Private information is stored for the business only and not included in emails.
                                  </div>
                                ) : null}
                                <Input
                                  type="file"
                                  multiple
                                  className={`${controlClassName} h-auto py-3 file:mr-3 file:rounded-full file:border-0 file:bg-rose-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-rose-700`}
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (!files.length) return;
                                    try {
                                      setUploadingFields((prev) => ({ ...(prev || {}), [key]: true }));
                                      const fd = new FormData();
                                      fd.append('business_id', String(resolvedBusinessId || ''));
                                      for (const file of files) fd.append('files', file);
                                      const res = await axios.post(`${API}/public/booking-uploads`, fd);
                                      const urls = (res?.data?.files || []).map((x) => x?.url).filter(Boolean);
                                      if (urls.length) setValue(urls);
                                      toast.success('Upload complete');
                                    } catch (err) {
                                      toast.error(err?.response?.data?.detail || 'Upload failed');
                                    } finally {
                                      setUploadingFields((prev) => ({ ...(prev || {}), [key]: false }));
                                    }
                                  }}
                                />
                                <div className="mt-2 text-xs text-zinc-500">
                                  {isUploading ? 'Uploading…' : filesValue.length ? `${filesValue.length} file(s) uploaded` : 'Optional'}
                                </div>
                              </div>
                            );
                          }

                          const inputType = (type === 'number' || type === 'date' || type === 'time') ? type : 'text';
                          return (
                            <div key={key} className={fieldCardClassName}>
                              <Label className={labelClassName}>
                                {label}
                                {required ? <span className="text-rose-500"> *</span> : null}
                              </Label>
                              {isPrivate ? (
                                <div className="mt-2 text-[11px] leading-5 text-zinc-500">
                                  Private information is stored for the business only and not included in emails.
                                </div>
                              ) : null}
                              <Input
                                type={inputType}
                                value={String(value ?? '')}
                                onChange={(e) => setValue(e.target.value)}
                                className={controlClassName}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : extraFields.length > 0 ? (
                    <section className={sectionCardClassName}>
                      <div className="mb-5 flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-amber-100 text-amber-700 shadow-sm">
                          <ClipboardList className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-zinc-950" style={{ fontFamily: 'Manrope' }}>
                            Additional details
                          </h2>
                          <p className="mt-1 text-sm leading-6 text-zinc-500">
                            A few extra fields to help the business prepare properly.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {extraFields.map((f) => {
                          const key = f?.key;
                          if (!key) return null;
                          const type = String(f?.type || 'text');
                          const label = f?.label || key;
                          const value = formData.custom_fields?.[key] ?? '';

                          if (type === 'textarea') {
                            return (
                              <div key={key} className={`${fieldCardClassName} md:col-span-2`}>
                                <Label className={labelClassName}>{label}</Label>
                                <Textarea
                                  value={String(value)}
                                  onChange={(e) => setFormData({ ...formData, custom_fields: { ...(formData.custom_fields || {}), [key]: e.target.value } })}
                                  className={textareaClassName}
                                  rows={4}
                                />
                              </div>
                            );
                          }

                          const inputType = (type === 'number' || type === 'date' || type === 'time') ? type : 'text';
                          return (
                            <div key={key} className={fieldCardClassName}>
                              <Label className={labelClassName}>{label}</Label>
                              <Input
                                type={inputType}
                                value={String(value)}
                                onChange={(e) => setFormData({ ...formData, custom_fields: { ...(formData.custom_fields || {}), [key]: e.target.value } })}
                                className={controlClassName}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  {serviceAddons.length > 0 && (
                    <section className={sectionCardClassName}>
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-fuchsia-100 text-fuchsia-700 shadow-sm">
                            <Star className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-zinc-950" style={{ fontFamily: 'Manrope' }}>
                              Optional extras
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-zinc-500">
                              Choose any add-ons you want included with this booking.
                            </p>
                          </div>
                        </div>
                        {selectedAddonCount > 0 ? (
                          <div className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700">
                            {selectedAddonCount} selected{selectedAddonTotal > 0 ? ` • $${selectedAddonTotal.toFixed(2)}` : ''}
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        {serviceAddons.map((a) => {
                          const id = String(a?.id || '').trim();
                          if (!id) return null;
                          const checked = selectedAddonIds.includes(id);
                          const price = Number(a?.price || 0);
                          const desc = String(a?.description || '').trim();
                          return (
                            <div
                              key={id}
                              className={cn(
                                'flex items-start gap-3 rounded-[22px] border p-4 transition',
                                checked
                                  ? 'border-rose-200 bg-rose-50/70 shadow-[0_12px_30px_rgba(244,63,94,0.10)]'
                                  : 'border-zinc-200 bg-white/90 shadow-sm hover:border-rose-200 hover:bg-rose-50/30'
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  setFormData((prev) => {
                                    const next = new Set(Array.isArray(prev.addon_ids) ? prev.addon_ids : []);
                                    if (Boolean(v)) next.add(id);
                                    else next.delete(id);
                                    return { ...prev, addon_ids: Array.from(next) };
                                  });
                                }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-medium text-zinc-900">{String(a?.name || 'Extra')}</div>
                                  <div className="text-sm font-semibold text-zinc-900">{price ? `$${price.toFixed(2)}` : 'Included'}</div>
                                </div>
                                {desc ? <div className="mt-1 text-sm leading-6 text-zinc-500">{desc}</div> : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {hasTravelNotes ? (
                    <section className={sectionCardClassName}>
                      <div className="mb-5 flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-sky-100 text-sky-700 shadow-sm">
                          <DollarSign className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-zinc-950" style={{ fontFamily: 'Manrope' }}>
                            Travel & logistics
                          </h2>
                          <p className="mt-1 text-sm leading-6 text-zinc-500">
                            Extra charges that may apply depending on the address and logistics of the booking.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {Boolean(business?.travel_fee_enabled) && (
                          <div className="rounded-[22px] border border-sky-200 bg-sky-50/70 p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                                <MapPin className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium text-zinc-900">{String(business?.travel_fee_label || 'Travel charge')}</div>
                                <div className="mt-1 text-sm leading-6 text-zinc-600">
                                  Travel charges apply when the address is more than <strong>{Number(business?.travel_fee_free_km || 40)} km</strong> away. Rate: <strong>${Number(business?.travel_fee_rate_per_km || 0.4).toFixed(2)}/km</strong> for the distance above that threshold.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {Boolean(business?.cbd_fee_enabled) && Number(business?.cbd_fee_amount || 0) > 0 && (
                          <div className="rounded-[22px] border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
                                  <Building2 className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="font-medium text-zinc-900">{String(business?.cbd_fee_label || 'CBD logistics')}</div>
                                  <div className="mt-1 text-sm leading-6 text-zinc-600">
                                    Applied automatically when the booking address postcode is <strong>3000</strong>.
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-full border border-amber-200 bg-white px-3 py-1 text-sm font-semibold text-zinc-800">
                                +${Number(business?.cbd_fee_amount || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-[30px] bg-zinc-950 p-5 text-white shadow-[0_28px_60px_rgba(15,23,42,0.18)] sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="max-w-xl">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                          Ready to send
                        </div>
                        <p className="mt-3 text-sm leading-7 text-white/72">
                          Your booking request goes directly to {businessName}. {hasSmsField ? 'Add a phone number if you want text reminders as well as email confirmation.' : 'You’ll receive confirmation by email after submitting.'}
                        </p>
                      </div>
                      <Button
                        data-testid="widget-submit-btn"
                        type="submit"
                        disabled={loading}
                        className="h-14 min-w-[220px] rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-orange-500 px-6 text-base font-semibold text-white shadow-[0_20px_45px_rgba(244,63,94,0.35)] transition hover:scale-[1.01] hover:from-rose-600 hover:via-rose-600 hover:to-orange-500 active:scale-[0.99]"
                      >
                        {loading ? 'Booking...' : 'Book Appointment'}
                      </Button>
                    </div>
                  </section>
                </form>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <a className="rounded-full border border-zinc-200 bg-white/85 px-3 py-2 transition hover:border-zinc-300 hover:text-zinc-700" href="/terms">
                Terms
              </a>
              <a className="rounded-full border border-zinc-200 bg-white/85 px-3 py-2 transition hover:border-zinc-300 hover:text-zinc-700" href="/privacy">
                Privacy
              </a>
              <a className="rounded-full border border-zinc-200 bg-white/85 px-3 py-2 transition hover:border-zinc-300 hover:text-zinc-700" href="/policies/cancellation">
                Cancellation Policy
              </a>
              <a className="rounded-full border border-zinc-200 bg-white/85 px-3 py-2 transition hover:border-zinc-300 hover:text-zinc-700" href="/">
                Powered by DoBook
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

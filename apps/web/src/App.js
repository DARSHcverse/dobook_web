'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import '@/App.css';
import { Toaster, toast } from 'sonner';
import { Calendar, Clock, FileText, Home, List, LogOut, Plus, Settings, Upload, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { addDays, addMinutes, addMonths, addWeeks, format, getDay, parse, parseISO, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import jsPDF from 'jspdf';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { isValidPhone, phoneValidationHint } from '@/lib/phone';
import { minimizeBusinessForStorage } from '@/lib/businessStorage';
import { Checkbox } from '@/components/ui/checkbox';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const API = `${API_BASE}/api`;

const DOBOOK_LOGO_PNG = '/brand/dobook-logo.png';
const DOBOOK_LOGO_SVG = '/brand/dobook-logo.svg';

function BrandLogo({ size = 'md', className = '' }) {
  const [src, setSrc] = useState(DOBOOK_LOGO_PNG);

  const heightClass =
    size === 'lg' ? 'h-[114px]' :
    size === 'sm' ? 'h-[90px]' :
    'h-[102px]';

  return (
    <img
      src={src}
      alt="DoBook"
      className={`${heightClass} w-auto object-contain ${className}`}
      draggable={false}
      onError={() => {
        if (src !== DOBOOK_LOGO_SVG) setSrc(DOBOOK_LOGO_SVG);
      }}
    />
  );
}

const calendarLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
});

const DEMO_BOOKINGS_FEB_2026 = [
  {
    id: 'demo-1',
    customer_name: 'Testing',
    booth_type: 'openbooth',
    service_type: 'Photo Booth',
    booking_date: '2026-02-11',
    booking_time: '12:30',
    end_time: '',
    duration_minutes: 120,
    price: 0,
    status: 'confirmed',
    customer_email: 'demo@dobook.local',
  },
  {
    id: 'demo-2',
    customer_name: 'testing2',
    booth_type: 'Glam Booth',
    service_type: 'Photo Booth',
    booking_date: '2026-02-13',
    booking_time: '13:30',
    end_time: '',
    duration_minutes: 120,
    price: 550,
    status: 'confirmed',
    customer_email: 'demo@dobook.local',
  },
  {
    id: 'demo-3',
    customer_name: 't',
    booth_type: 'rthdh',
    service_type: 'Photo Booth',
    booking_date: '2026-02-14',
    booking_time: '13:30',
    end_time: '',
    duration_minutes: 60,
    price: 800,
    status: 'confirmed',
    customer_email: 'demo@dobook.local',
  },
  {
    id: 'demo-4',
    customer_name: 'testIMG',
    booth_type: 'Glam Booth',
    service_type: 'Photo Booth',
    booking_date: '2026-02-14',
    booking_time: '16:00',
    end_time: '',
    duration_minutes: 60,
    price: 550,
    status: 'confirmed',
    customer_email: 'demo@dobook.local',
  },
  {
    id: 'demo-5',
    customer_name: 'Darsh',
    booth_type: 'Glam Booth',
    service_type: 'Photo Booth',
    booking_date: '2026-02-18',
    booking_time: '13:30',
    end_time: '15:30',
    duration_minutes: 120,
    price: 550,
    status: 'confirmed',
    customer_email: 'demo@dobook.local',
  },
  {
    id: 'demo-6',
    customer_name: 'testing logo',
    booth_type: 'Enclosed Booth',
    service_type: 'Photo Booth',
    booking_date: '2026-02-21',
    booking_time: '12:00',
    end_time: '',
    duration_minutes: 120,
    price: 900,
    status: 'confirmed',
    customer_email: 'demo@dobook.local',
  },
];

function bookingDateTime(booking, which) {
  const dateStr = String(booking?.booking_date || '').trim();
  const timeStr = String(booking?.booking_time || '').trim();

  let baseDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) baseDate = parseISO(dateStr);
  else baseDate = new Date(dateStr);

  if (Number.isNaN(baseDate.getTime())) return null;

  if (!timeStr) return baseDate;
  const [h, m] = timeStr.split(':').map((n) => Number(n));
  if (Number.isFinite(h) && Number.isFinite(m)) {
    const d = new Date(baseDate);
    d.setHours(h, m, 0, 0);
    return d;
  }
  return baseDate;
}

function bookingToEvent(booking) {
  const start = bookingDateTime(booking, 'start') || new Date();
  const end = addMinutes(start, Number(booking?.duration_minutes || 60));

  const booth = booking?.booth_type || booking?.service_type || 'Booking';
  const customer = booking?.customer_name || 'Customer';
  const isCancelled = String(booking?.status || 'confirmed').trim().toLowerCase() === 'cancelled';
  return {
    id: booking.id,
    title: `${customer} - ${booth}${isCancelled ? ' (Cancelled)' : ''}`,
    start,
    end,
    resource: booking,
  };
}

function bookingTotalAmount(booking) {
  const qty = Math.max(1, Number(booking?.quantity || 1));
  const unit = Number(booking?.price || 0);
  const totalRaw =
    booking?.total_amount !== undefined && booking?.total_amount !== null && booking?.total_amount !== ''
      ? Number(booking.total_amount || 0)
      : unit * qty;
  return Number.isFinite(totalRaw) ? totalRaw : 0;
}

function splitAddressLines(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  if (raw.includes('\n')) return raw.split('\n').map((l) => l.trim()).filter(Boolean);
  return raw.split(',').map((l) => l.trim()).filter(Boolean);
}

function formatAUDate(date) {
  return format(date, 'dd.MM.yyyy');
}

function imageFormatFromDataUri(dataUri) {
  if (typeof dataUri !== 'string') return null;
  if (dataUri.startsWith('data:image/png')) return 'PNG';
  if (dataUri.startsWith('data:image/jpeg') || dataUri.startsWith('data:image/jpg')) return 'JPEG';
  return null;
}

function loadImage(dataUri) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUri;
  });
}

async function normalizeToSupportedPngDataUri(dataUri) {
  const fmt = imageFormatFromDataUri(dataUri);
  if (fmt === 'PNG' || fmt === 'JPEG') return dataUri;

  // Convert to PNG using canvas (handles webp/heic when browser can decode).
  const img = await loadImage(dataUri);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

async function addLogoToPdf(doc, dataUri, box) {
  if (!dataUri) return;

  const supportedDataUri = await normalizeToSupportedPngDataUri(dataUri);
  const fmt = imageFormatFromDataUri(supportedDataUri) || 'PNG';
  const img = await loadImage(supportedDataUri);

  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  const scale = Math.min(box.w / iw, box.h / ih);
  const w = iw * scale;
  const h = ih * scale;
  const x = box.x + (box.w - w) / 2;
  const y = box.y + (box.h - h) / 2;

  doc.addImage(supportedDataUri, fmt, x, y, w, h);
}

async function downloadInvoicePdf({ booking, business, template }) {
  if (!booking) return;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 72;

  const logoUrl = String(template?.logo_url || business?.logo_url || '').trim();

  const brand = {
    name: business?.business_name || 'DoBook',
    email: business?.email || '',
    phone: business?.phone || '',
    address: business?.business_address || '',
    abn: business?.abn || '',
    bank_name: business?.bank_name || '',
    account_name: business?.account_name || '',
    bsb: business?.bsb || '',
    account_number: business?.account_number || '',
    payment_link: business?.payment_link || '',
  };

  const invoiceNumber = booking?.invoice_id || `PB-${format(new Date(), 'yyyyMMdd')}-001`;
  const invoiceDate = booking?.invoice_date ? parseISO(booking.invoice_date) : new Date();
  const dueDate = booking?.booking_date
    ? parseISO(booking.booking_date)
    : (booking?.due_date ? parseISO(booking.due_date) : invoiceDate);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(80);
  doc.text('INVOICE', marginX, 112);

  // Logo (uploaded in Account Settings)
  await addLogoToPdf(doc, logoUrl, {
    x: pageW - marginX - 140,
    y: 70,
    w: 140,
    h: 70,
  });

  // Left business block (matches sample)
  const leftBlockY = 180;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120);
  doc.text('ABN:', marginX, leftBlockY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70);
  const businessLines = [
    String(brand.name || '').toUpperCase(),
    brand.abn || '',
    ...splitAddressLines(brand.address),
  ].filter(Boolean);
  businessLines.forEach((line, idx) => {
    doc.text(line, marginX, leftBlockY + 18 + idx * 14);
  });

  // Issued to
  const issuedToY = 270;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('ISSUED TO:', marginX, issuedToY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70);
  const issuedLines = [
    booking.customer_name,
    booking.event_location,
    booking.customer_email,
  ].filter(Boolean);
  issuedLines.forEach((line, idx) => {
    doc.text(String(line), marginX, issuedToY + 18 + idx * 14);
  });

  // Invoice meta (right)
  const metaX = pageW - marginX - 170;
  const metaRight = pageW - marginX;
  const metaY = 270;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('INVOICE NO:', metaX, metaY);
  doc.text('DATE:', metaX, metaY + 18);
  doc.text('DUE DATE:', metaX, metaY + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(invoiceNumber, metaRight, metaY, { align: 'right' });
  doc.text(formatAUDate(invoiceDate), metaRight, metaY + 18, { align: 'right' });
  doc.text(formatAUDate(dueDate), metaRight, metaY + 36, { align: 'right' });

  // Table (DESCRIPTION / RATE / QTY / TOTAL)
  const tableTopY = 395;
  const lineX1 = marginX;
  const lineX2 = pageW - marginX;

  doc.setDrawColor(220);
  doc.setLineWidth(1);
  doc.line(lineX1, tableTopY - 20, lineX2, tableTopY - 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('DESCRIPTION', marginX, tableTopY);
  doc.text('RATE', 340, tableTopY);
  doc.text('QTY', 430, tableTopY);
  doc.text('TOTAL', lineX2, tableTopY, { align: 'right' });

  doc.line(lineX1, tableTopY + 12, lineX2, tableTopY + 12);

  // Row
  const qty = Math.max(1, Number(booking.quantity || 1));
  const unit = Number(booking.price || 0);
  const total = unit * qty;

  const hours = booking?.duration_minutes ? Math.round((Number(booking.duration_minutes) / 60) * 10) / 10 : null;
  const description =
    `${(hours && Number.isFinite(hours) && hours > 0 ? hours : 1)} ${(hours === 1 ? 'Hour' : 'Hours')} ${String(booking?.booth_type || booking?.service_type || 'Booking').trim() || 'Booking'}`;

  const rowY = tableTopY + 44;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(String(description), marginX, rowY);
  doc.text(String(Number.isFinite(unit) ? unit.toFixed(0) : '0'), 340, rowY);
  doc.text(String(qty), 430, rowY);
  doc.text(`$${total.toFixed(0)}`, lineX2, rowY, { align: 'right' });

  // Totals block
  const totalsY = 585;
  doc.setDrawColor(230);
  doc.line(lineX1, totalsY - 20, lineX2, totalsY - 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('SUBTOTAL', marginX, totalsY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(`$${total.toFixed(0)}`, lineX2, totalsY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('TOTAL', lineX2 - 90, totalsY + 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(`$${total.toFixed(0)}`, lineX2, totalsY + 26, { align: 'right' });

  // Payment info
  const payY = 690;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('PAYMENT INFO:', marginX, payY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70);
  const payLines = [
    brand.account_name || '',
    brand.bank_name || '',
    brand.bsb ? `BSB: ${brand.bsb}` : '',
    brand.account_number ? `Account number: ${brand.account_number}` : '',
  ].filter(Boolean);
  payLines.forEach((line, idx) => {
    doc.text(line, marginX, payY + 16 + idx * 14);
  });

  if (brand.payment_link) {
    const orY = payY + 16 + payLines.length * 14 + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('OR', marginX, orY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(70);
    doc.text(brand.payment_link, marginX, orY + 18);
  }

  // Signature (stylized text, like sample's signature area)
  doc.setFont('times', 'italic');
  doc.setFontSize(34);
  doc.setTextColor(60);
  doc.text(brand.account_name || brand.name, lineX2, 780, { align: 'right' });

  doc.save(`${invoiceNumber}.pdf`);
}

const BookingDetailsDialog = ({ booking, business, onClose }) => {
  const [requestingReview, setRequestingReview] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  return (
    <Dialog open={!!booking} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent data-testid="booking-detail-dialog" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{fontFamily: 'Manrope'}}>Booking Details</DialogTitle>
          <DialogDescription>Complete booking information</DialogDescription>
        </DialogHeader>

        {booking && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-600">Customer Name</Label>
                <p className="font-semibold">{booking.customer_name}</p>
              </div>
              <div>
                <Label className="text-zinc-600">Email</Label>
                <p className="font-semibold">{booking.customer_email}</p>
              </div>
              <div>
                <Label className="text-zinc-600">Booth Type</Label>
                <p className="font-semibold">{booking.booth_type || booking.service_type}</p>
              </div>
              <div>
                <Label className="text-zinc-600">Price</Label>
                <p className="font-semibold text-emerald-600">${bookingTotalAmount(booking).toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-zinc-600">Date</Label>
                <p className="font-semibold">{booking.booking_date}</p>
              </div>
              <div>
                <Label className="text-zinc-600">Time</Label>
                <p className="font-semibold">{booking.booking_time}</p>
              </div>
              <div>
                <Label className="text-zinc-600">Duration</Label>
                <p className="font-semibold">{Math.round((Number(booking.duration_minutes) || 60) / 60 * 10) / 10} hours</p>
              </div>
              <div>
                <Label className="text-zinc-600">Status</Label>
                <span
                  className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                    String(booking.status || 'confirmed').toLowerCase() === 'cancelled'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {booking.status || 'confirmed'}
                </span>
              </div>
            </div>

            {booking.notes && (
              <div>
                <Label className="text-zinc-600">Notes</Label>
                <p className="mt-1 text-sm">{booking.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-zinc-600">Invoice</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={updatingStatus}
                    className={`h-9 ${String(booking.status || '').toLowerCase() === 'cancelled' ? '' : 'border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800'}`}
                    onClick={async () => {
                      const isCancelled = String(booking.status || 'confirmed').toLowerCase() === 'cancelled';
                      const next = isCancelled ? 'confirmed' : 'cancelled';
                      const ok = window.confirm(
                        isCancelled
                          ? 'Mark this booking as confirmed again?'
                          : 'Mark this booking as cancelled?',
                      );
                      if (!ok) return;
                      setUpdatingStatus(true);
                      try {
                        const token = localStorage.getItem('dobook_token');
                        await axios.put(
                          `${API}/bookings/${booking.id}`,
                          { status: next },
                          { headers: { Authorization: `Bearer ${token}` } },
                        );
                        toast.success(isCancelled ? 'Booking restored' : 'Booking cancelled');
                        onClose?.();
                      } catch (e) {
                        toast.error(e.response?.data?.detail || 'Failed to update booking');
                      } finally {
                        setUpdatingStatus(false);
                      }
                    }}
                  >
                    {String(booking.status || 'confirmed').toLowerCase() === 'cancelled' ? 'Restore' : 'Cancel'}
                  </Button>

                  {String(booking?.customer_email || '').trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9"
                      disabled={requestingReview}
                      onClick={async () => {
                        setRequestingReview(true);
                        try {
                          const token = localStorage.getItem('dobook_token');
                          const res = await axios.post(
                            `${API}/reviews/request`,
                            { booking_id: booking.id },
                            { headers: { Authorization: `Bearer ${token}` } },
                          );
                          const url = res?.data?.url;
                          const skipped = Boolean(res?.data?.email?.skipped);
                          if (skipped && url) {
                            try {
                              await navigator.clipboard.writeText(url);
                              toast.success('Review link copied (email not sent)');
                            } catch {
                              toast.success('Review link created');
                            }
                          } else {
                            toast.success('Review request sent');
                          }
                        } catch (e) {
                          toast.error(e.response?.data?.detail || 'Failed to request review');
                        } finally {
                          setRequestingReview(false);
                        }
                      }}
                    >
                      {requestingReview ? 'Sending…' : 'Request review'}
                    </Button>
                  )}

                  <Button
                    data-testid="download-invoice-btn"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('dobook_token');
                        if (!token) throw new Error('Not logged in');
                        const res = await axios.get(`${API}/invoices/pdf/${booking.id}`, {
                          headers: { Authorization: `Bearer ${token}` },
                          responseType: 'blob',
                        });
                        const blob = res?.data;
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${booking.invoice_id || `INV-${String(booking?.id || '').slice(0, 8).toUpperCase()}`}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                        toast.success('Invoice downloaded!');
                      } catch (e) {
                        toast.error('Failed to generate invoice PDF');
                      }
                    }}
                    size="sm"
                    className="h-9 bg-rose-600 hover:bg-rose-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-zinc-50 rounded-lg">
                <p className="text-sm text-zinc-600">
                  Invoice: {booking.invoice_id || `INV-${String(booking?.id || '').slice(0, 8).toUpperCase()}`}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Generated locally (no backend required)
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ============= Landing Page =============
const LandingPage = ({
  heroPrefix = 'Online Booking System',
  heroAccent = 'for Businesses',
  heroDescription = 'DoBook is an all-in-one booking platform for businesses. Manage appointments, automatic invoices, reminders, and emails — free or Pro plans available.',
  getStartedHref = '/auth',
  startFreeHref = '/auth?plan=free',
} = {}) => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
          </div>
          <div className="flex items-center gap-3">
            <Button
              data-testid="login-btn"
              variant="outline"
              onClick={() => router.push("/auth")}
              className="h-12 px-6 rounded-full border-zinc-200"
            >
              Login
            </Button>
            <Button 
              data-testid="get-started-btn"
              onClick={() => router.push(getStartedHref)}
              className="h-12 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
          <div className="md:col-span-7">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6" style={{fontFamily: 'Manrope'}}>
              {heroPrefix}
              <span className="text-rose-600"> {heroAccent}</span>
            </h1>
            <p className="text-lg text-zinc-600 mb-8" style={{fontFamily: 'Inter'}}>
              {heroDescription}
            </p>
            <div className="flex gap-4">
              <Button 
                data-testid="hero-get-started-btn"
                onClick={() => router.push(startFreeHref)}
                className="h-14 px-10 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                Start Free
              </Button>
            </div>
          </div>
          <div className="md:col-span-5">
            <img 
              src="https://images.unsplash.com/photo-1765366417046-f46361a7f26f?crop=entropy&cs=srgb&fm=jpg&q=85" 
              alt="Calendar Preview"
              className="rounded-xl shadow-xl w-full"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{fontFamily: 'Manrope'}}>Everything You Need</h2>
          <p className="text-zinc-600" style={{fontFamily: 'Inter'}}>Powerful features for modern booking management</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card data-testid="feature-calendar-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl hover:border-rose-200 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 bg-rose-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-rose-600" />
              </div>
              <CardTitle style={{fontFamily: 'Manrope'}}>Smart Calendar</CardTitle>
              <CardDescription style={{fontFamily: 'Inter'}}>Flexible time slots with configurable durations</CardDescription>
            </CardHeader>
          </Card>

          <Card data-testid="feature-invoice-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl hover:border-rose-200 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-emerald-600" />
              </div>
              <CardTitle style={{fontFamily: 'Manrope'}}>Auto Invoicing</CardTitle>
              <CardDescription style={{fontFamily: 'Inter'}}>Generate PDF invoices automatically on booking</CardDescription>
            </CardHeader>
          </Card>

          <Card data-testid="feature-embed-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl hover:border-rose-200 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 bg-rose-100 rounded-lg flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-rose-600" />
              </div>
              <CardTitle style={{fontFamily: 'Manrope'}}>Embed Anywhere</CardTitle>
              <CardDescription style={{fontFamily: 'Inter'}}>Widget for your website with one line of code</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{fontFamily: 'Manrope'}}>Simple pricing</h2>
          <p className="text-zinc-600" style={{fontFamily: 'Inter'}}>Start free, upgrade when you’re ready</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle style={{fontFamily: 'Manrope'}}>Free</CardTitle>
              <CardDescription style={{fontFamily: 'Inter'}}>$0</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="text-sm text-zinc-700 space-y-2" style={{fontFamily: 'Inter'}}>
                <li>• Up to 10 bookings / month</li>
                <li>• Booking confirmation emails</li>
                <li>• Calendar view + revenue dashboard</li>
                <li>• No invoice PDFs or automated reminders</li>
              </ul>
              <Button
                onClick={() => router.push(startFreeHref)}
                className="w-full h-12 bg-rose-600 hover:bg-rose-700 rounded-full"
              >
                Get started free
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border border-rose-200 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle style={{fontFamily: 'Manrope'}}>Pro</CardTitle>
              <CardDescription style={{fontFamily: 'Inter'}}>$30 AUD / month</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="text-sm text-zinc-700 space-y-2" style={{fontFamily: 'Inter'}}>
                <li>• Unlimited bookings</li>
                <li>• Unlimited invoice templates</li>
                <li>• Booking confirmation emails + invoice PDF</li>
                <li>• Client reminders (5 days + 1 day)</li>
              </ul>
              <Button
                onClick={() => router.push("/auth?plan=pro")}
                className="w-full h-12 bg-rose-600 hover:bg-rose-700 rounded-full"
              >
                Choose Pro
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-rose-600 py-20">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-4xl font-bold text-white mb-6" style={{fontFamily: 'Manrope'}}>
            Ready to Streamline Your Bookings?
          </h2>
          <p className="text-rose-100 text-lg mb-8" style={{fontFamily: 'Inter'}}>
            Join businesses using DoBook to manage appointments effortlessly
          </p>
          <Button 
            data-testid="cta-get-started-btn"
            onClick={() => router.push(startFreeHref)}
            className="h-14 px-10 bg-white text-rose-600 hover:bg-zinc-50 rounded-full font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" />
              <div className="text-sm text-zinc-600">© {new Date().getFullYear()} DoBook</div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <a className="text-zinc-600 hover:text-zinc-900" href="/terms">
                Terms
              </a>
              <a className="text-zinc-600 hover:text-zinc-900" href="/privacy">
                Privacy
              </a>
              <a className="text-zinc-600 hover:text-zinc-900" href="/policies/cancellation">
                Cancellation Policy
              </a>
              <a className="text-zinc-600 hover:text-zinc-900" href="mailto:support@do-book.com">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Note: auth flow is handled by /auth and ClientShell redirects.

// ============= Dashboard =============
const Dashboard = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [business, setBusiness] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const storedBusiness = localStorage.getItem('dobook_business');
    if (storedBusiness) {
      setBusiness(JSON.parse(storedBusiness));
    }
    refreshBusiness();
    loadBookings();
  }, []);

  useEffect(() => {
    if (searchParams?.get('upgraded') === '1') {
      toast.success('Thanks! Your subscription is being activated.');
      refreshBusiness();
    }
  }, [searchParams]);

  const refreshBusiness = async () => {
    try {
      const token = localStorage.getItem('dobook_token');
      if (!token) return;
      const response = await axios.get(`${API}/business/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.setItem('dobook_business', JSON.stringify(minimizeBusinessForStorage(response.data)));
      setBusiness(response.data);
    } catch {
      // ignore
    }
  };

  const loadBookings = async () => {
    try {
      const token = localStorage.getItem('dobook_token');
      if (!token) {
        setBookings([]);
        setLoading(false);
        return;
      }
      const response = await axios.get(`${API}/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = Array.isArray(response.data) ? response.data : [];
      const normalized = list.map((b) => ({
        ...b,
        price: b?.price !== undefined && b?.price !== null && b?.price !== '' ? Number(b.price) : 0,
        total_amount:
          b?.total_amount !== undefined && b?.total_amount !== null && b?.total_amount !== ''
            ? Number(b.total_amount)
            : null,
        quantity: b?.quantity !== undefined && b?.quantity !== null && b?.quantity !== '' ? Number(b.quantity) : 1,
        duration_minutes:
          b?.duration_minutes !== undefined && b?.duration_minutes !== null && b?.duration_minutes !== ''
            ? Number(b.duration_minutes)
            : 60,
      }));
      setBookings(normalized);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dobook_token');
    localStorage.removeItem('dobook_business');
    router.push('/');
    toast.success('Logged out successfully');
  };

  const activeBookings = useMemo(
    () => bookings.filter((b) => String(b?.status || 'confirmed').trim().toLowerCase() !== 'cancelled'),
    [bookings],
  );

  const stats = {
    totalBookings: activeBookings.length,
    upcomingBookings: activeBookings.filter((b) => new Date(b.booking_date) >= new Date()).length,
    revenue: activeBookings.reduce((sum, b) => sum + bookingTotalAmount(b), 0),
  };

  const monthlyTrends = useMemo(() => {
    const now = new Date();
    const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const months = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = addMonths(monthStartUtc, -i);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      months.push({
        key,
        month: format(d, 'MMM yyyy'),
        bookings: 0,
        revenue: 0,
      });
    }

    const byKey = new Map(months.map((m) => [m.key, m]));
    const list = Array.isArray(bookings) ? bookings : [];
    for (const b of list) {
      if (String(b?.status || 'confirmed').trim().toLowerCase() === 'cancelled') continue;
      const dateStr = String(b?.booking_date || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
      const [y, m] = dateStr.split('-');
      const bucket = byKey.get(`${y}-${m}`);
      if (!bucket) continue;
      bucket.bookings += 1;
      bucket.revenue += bookingTotalAmount(b);
    }

    return months.map((m) => ({ ...m, revenue: Math.round(m.revenue * 100) / 100 }));
  }, [bookings]);

  return (
    <div className="min-h-screen bg-zinc-50" data-testid="dashboard">
      <Toaster position="top-center" richColors />

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={DOBOOK_LOGO_PNG}
              alt="DoBook"
              className="h-9 w-auto object-contain select-none"
              draggable={false}
              onError={(e) => {
                e.currentTarget.src = DOBOOK_LOGO_SVG;
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-zinc-200"
              onClick={() => setMobileMenuOpen(true)}
            >
              <List className="h-4 w-4 mr-2" />
              Menu
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-10 p-0 rounded-full border-zinc-200"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Sidebar */}
      <div className="hidden md:block fixed left-0 top-0 h-full w-64 bg-white border-r border-zinc-200 p-6">
        <div className="flex items-center gap-3 mb-8">
          <BrandLogo size="md" />
        </div>

        <nav className="space-y-2">
          <button
            data-testid="overview-tab"
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
          >
            <Home className="h-5 w-5" />
            <span className="font-medium">Overview</span>
          </button>

          <button
            data-testid="bookings-tab"
            onClick={() => setActiveTab('bookings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'bookings' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
          >
            <Users className="h-5 w-5" />
            <span className="font-medium">Bookings</span>
          </button>

          <button
            data-testid="calendar-view-tab"
            onClick={() => setActiveTab('calendar')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'calendar' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
          >
            <Calendar className="h-5 w-5" />
            <span className="font-medium">Calendar View</span>
          </button>

          <button
            data-testid="invoice-templates-tab"
            onClick={() => setActiveTab('invoices')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'invoices' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
          >
            <FileText className="h-5 w-5" />
            <span className="font-medium">Invoice Templates</span>
          </button>

          <button
            data-testid="pdf-upload-tab"
            onClick={() => setActiveTab('pdf')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'pdf' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
          >
            <Upload className="h-5 w-5" />
            <span className="font-medium">PDF Upload</span>
          </button>

          <button
            data-testid="widget-tab"
            onClick={() => setActiveTab('widget')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'widget' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Embed Widget</span>
          </button>

          <button
            data-testid="account-settings-tab"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Account Settings</span>
          </button>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <Button
            data-testid="logout-btn"
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center gap-2 border-zinc-200 rounded-lg"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope' }}>Menu</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
            >
              <Home className="h-5 w-5" />
              <span className="font-medium">Overview</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('bookings'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'bookings' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">Bookings</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('calendar'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'calendar' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
            >
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Calendar View</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('invoices'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'invoices' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
            >
              <FileText className="h-5 w-5" />
              <span className="font-medium">Invoice Templates</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('pdf'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'pdf' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
            >
              <Upload className="h-5 w-5" />
              <span className="font-medium">PDF Upload</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('widget'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'widget' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium">Embed Widget</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-rose-50 text-rose-600' : 'hover:bg-zinc-50'}`}
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium">Account Settings</span>
            </button>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              variant="outline"
              className="w-full flex items-center gap-2 border-zinc-200 rounded-lg"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white">
        <div className="grid grid-cols-5 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            aria-current={activeTab === 'overview' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors ${activeTab === 'overview' ? 'text-rose-600 bg-rose-50' : 'text-zinc-600 hover:bg-zinc-50'}`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[11px] font-medium">Home</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            aria-current={activeTab === 'bookings' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors ${activeTab === 'bookings' ? 'text-rose-600 bg-rose-50' : 'text-zinc-600 hover:bg-zinc-50'}`}
          >
            <Users className="h-5 w-5" />
            <span className="text-[11px] font-medium">Bookings</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            aria-current={activeTab === 'calendar' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors ${activeTab === 'calendar' ? 'text-rose-600 bg-rose-50' : 'text-zinc-600 hover:bg-zinc-50'}`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[11px] font-medium">Calendar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors ${activeTab === 'settings' ? 'text-rose-600 bg-rose-50' : 'text-zinc-600 hover:bg-zinc-50'}`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[11px] font-medium">Settings</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-zinc-600 hover:bg-zinc-50 transition-colors"
            aria-label="More"
          >
            <List className="h-5 w-5" />
            <span className="text-[11px] font-medium">More</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:ml-64 p-4 md:p-8 pb-28 md:pb-8">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2" style={{fontFamily: 'Manrope'}}>
              {business?.business_name}
            </h1>
            <p className="text-zinc-600" style={{fontFamily: 'Inter'}}>{business?.email}</p>
          </div>
          
          {/* Circular Profile Button */}
          <button
            data-testid="profile-button"
            onClick={() => setActiveTab('settings')}
            className="group relative"
          >
            {business?.logo_url ? (
              <div className="h-11 w-11 md:h-14 md:w-14 rounded-full overflow-hidden border-2 border-zinc-200 hover:border-rose-600 transition-colors shadow-sm">
                <img 
                  src={business.logo_url} 
                  alt="Profile" 
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-11 w-11 md:h-14 md:w-14 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white text-base md:text-lg font-bold border-2 border-white shadow-md transition-colors">
                {business?.business_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'B'}
              </div>
            )}
            <div className="hidden md:block absolute -bottom-8 right-0 bg-zinc-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Account Settings
            </div>
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card data-testid="total-bookings-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
                <CardHeader>
                  <CardDescription style={{fontFamily: 'Inter'}}>Total Bookings</CardDescription>
                  <CardTitle className="text-3xl font-bold" style={{fontFamily: 'Manrope'}}>{stats.totalBookings}</CardTitle>
                </CardHeader>
              </Card>

              <Card data-testid="upcoming-bookings-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
                <CardHeader>
                  <CardDescription style={{fontFamily: 'Inter'}}>Upcoming</CardDescription>
                  <CardTitle className="text-3xl font-bold text-emerald-600" style={{fontFamily: 'Manrope'}}>{stats.upcomingBookings}</CardTitle>
                </CardHeader>
              </Card>

              <Card data-testid="revenue-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
                <CardHeader>
                  <CardDescription style={{fontFamily: 'Inter'}}>Total Revenue</CardDescription>
                  <CardTitle className="text-3xl font-bold text-emerald-600" style={{fontFamily: 'Manrope'}}>${stats.revenue.toFixed(2)}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card data-testid="monthly-trends-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl mb-8">
              <CardHeader>
                <CardTitle style={{fontFamily: 'Manrope'}}>Monthly Trends</CardTitle>
                <CardDescription style={{fontFamily: 'Inter'}}>Bookings and revenue for the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyTrends.every((m) => m.bookings === 0 && m.revenue === 0) ? (
                  <p className="text-zinc-500 text-center py-10">No booking data yet</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="border border-zinc-200 rounded-xl p-4">
                      <p className="text-sm font-semibold mb-3" style={{fontFamily: 'Manrope'}}>Bookings</p>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyTrends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip
                              formatter={(value) => [value, 'Bookings']}
                              labelStyle={{ fontWeight: 600 }}
                            />
                            <Bar dataKey="bookings" fill="#e11d48" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="border border-zinc-200 rounded-xl p-4">
                      <p className="text-sm font-semibold mb-3" style={{fontFamily: 'Manrope'}}>Revenue</p>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyTrends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                            <Tooltip
                              formatter={(value) => [`$${Number(value || 0).toFixed(2)}`, 'Revenue']}
                              labelStyle={{ fontWeight: 600 }}
                            />
                            <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="recent-bookings-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle style={{fontFamily: 'Manrope'}}>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {activeBookings.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">No bookings yet</p>
                ) : (
                  <div className="space-y-4">
                    {activeBookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                        <div>
                          <p className="font-semibold">{booking.customer_name}</p>
                          <p className="text-sm text-zinc-600">{booking.service_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{booking.booking_date}</p>
                          <p className="text-sm text-zinc-600">{booking.booking_time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'bookings' && <BookingsTab business={business} bookings={bookings} onRefresh={loadBookings} />}
        {activeTab === 'calendar' && <CalendarViewTab business={business} bookings={bookings} onRefresh={loadBookings} />}
        {activeTab === 'invoices' && business && <InvoiceTemplatesTab businessId={business.id} />}
        {activeTab === 'settings' && business && <AccountSettingsTab business={business} bookings={bookings} onUpdate={(updated) => setBusiness(updated)} />}
        {activeTab === 'pdf' && business && <PDFUploadTab businessId={business.id} onBookingCreated={loadBookings} />}
        {activeTab === 'widget' && business && <WidgetTab businessId={business.id} />}
      </div>
    </div>
  );
};

// ============= Account Settings Tab =============
const AccountSettingsTab = ({ business, bookings, onUpdate }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    business_name: business?.business_name || '',
    phone: business?.phone || '',
    business_address: business?.business_address || '',
    abn: business?.abn || '',
    logo_url: business?.logo_url || '',
    bank_name: business?.bank_name || '',
    account_name: business?.account_name || '',
    bsb: business?.bsb || '',
    account_number: business?.account_number || '',
    payment_link: business?.payment_link || '',
    travel_fee_enabled: Boolean(business?.travel_fee_enabled),
    travel_fee_label: business?.travel_fee_label || 'Travel fee',
    travel_fee_amount: business?.travel_fee_amount !== undefined && business?.travel_fee_amount !== null ? String(business.travel_fee_amount) : '0',
    cbd_fee_enabled: Boolean(business?.cbd_fee_enabled),
    cbd_fee_label: business?.cbd_fee_label || 'CBD logistics',
    cbd_fee_amount: business?.cbd_fee_amount !== undefined && business?.cbd_fee_amount !== null ? String(business.cbd_fee_amount) : '0',
    industry: business?.industry || 'photobooth',
    booth_types: Array.isArray(business?.booth_types) ? business.booth_types : ['Open Booth', 'Glam Booth', 'Enclosed Booth'],
    booking_custom_fields: Array.isArray(business?.booking_custom_fields) ? business.booking_custom_fields : []
  });
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSending, setSupportSending] = useState(false);

  useEffect(() => {
    if (business) {
      setFormData({
        business_name: business.business_name || '',
        phone: business.phone || '',
        business_address: business.business_address || '',
        abn: business.abn || '',
        logo_url: business.logo_url || '',
        bank_name: business.bank_name || '',
        account_name: business.account_name || '',
        bsb: business.bsb || '',
        account_number: business.account_number || '',
        payment_link: business.payment_link || '',
        travel_fee_enabled: Boolean(business?.travel_fee_enabled),
        travel_fee_label: business?.travel_fee_label || 'Travel fee',
        travel_fee_amount: business?.travel_fee_amount !== undefined && business?.travel_fee_amount !== null ? String(business.travel_fee_amount) : '0',
        cbd_fee_enabled: Boolean(business?.cbd_fee_enabled),
        cbd_fee_label: business?.cbd_fee_label || 'CBD logistics',
        cbd_fee_amount: business?.cbd_fee_amount !== undefined && business?.cbd_fee_amount !== null ? String(business.cbd_fee_amount) : '0',
        industry: business?.industry || 'photobooth',
        booth_types: Array.isArray(business?.booth_types) ? business.booth_types : ['Open Booth', 'Glam Booth', 'Enclosed Booth'],
        booking_custom_fields: Array.isArray(business?.booking_custom_fields) ? business.booking_custom_fields : []
      });
      setSubscriptionInfo({
        plan: business.subscription_plan || 'free',
        booking_count: business.booking_count || 0
      });
    }
  }, [business]);

  const isOwner = String(business?.account_role || '').trim().toLowerCase() === 'owner';
  const plan = String(subscriptionInfo?.plan || business?.subscription_plan || 'free');
  const effectivePlan = isOwner ? 'pro' : plan;
  const subscriptionStatus = String(business?.subscription_status || 'inactive');
  const bookingsThisMonth = useMemo(() => {
    const list = Array.isArray(bookings) ? bookings : [];
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    return list.filter((b) => {
      const raw = b?.created_at || b?.createdAt;
      if (!raw) return false;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return false;
      return d.getUTCFullYear() === y && d.getUTCMonth() === m;
    }).length;
  }, [bookings]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const token = localStorage.getItem('dobook_token');
      const formDataUpload = new FormData();
      const type = String(file.type || '').toLowerCase();
      let uploadFile = file;
      if (type && type !== 'image/png' && type !== 'image/jpeg') {
        try {
          const asDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const img = await loadImage(asDataUrl);
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 1;
          canvas.height = img.naturalHeight || img.height || 1;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const pngDataUrl = canvas.toDataURL('image/png');
          const blob = await (await fetch(pngDataUrl)).blob();
          uploadFile = new File([blob], `${String(file.name || 'logo').replace(/\.[^.]+$/, '')}.png`, {
            type: 'image/png',
          });
        } catch {
          // If the browser can't decode/convert (common for HEIC in Chrome),
          // upload as-is and let the server store it; email PDF may not render it.
          uploadFile = file;
        }
      }

      formDataUpload.append('file', uploadFile);

      const response = await axios.post(`${API}/business/upload-logo`, formDataUpload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setFormData({...formData, logo_url: response.data.logo_url});
      
      // Update business in parent
      const updatedBusiness = {...business, logo_url: response.data.logo_url};
      localStorage.setItem('dobook_business', JSON.stringify(minimizeBusinessForStorage(updatedBusiness)));
      onUpdate(updatedBusiness);
      
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('dobook_token');
      const slugKey = (label) =>
        String(label || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 40) || 'field';

      const booth_types = Array.isArray(formData.booth_types)
        ? formData.booth_types.map((t) => String(t || '').trim()).filter(Boolean)
        : [];

      const defsRaw = Array.isArray(formData.booking_custom_fields) ? formData.booking_custom_fields : [];
      const used = new Set();
      const booking_custom_fields = defsRaw
        .map((f) => ({
          label: String(f?.label || '').trim(),
          type: String(f?.type || 'text'),
        }))
        .filter((f) => f.label)
        .map((f) => {
          let key = slugKey(f.label);
          let i = 2;
          while (used.has(key)) {
            key = `${slugKey(f.label)}_${i}`;
            i += 1;
          }
          used.add(key);
          return { key, label: f.label, type: f.type };
        });

      const payload = { ...formData, booth_types, booking_custom_fields };

      const response = await axios.put(`${API}/business/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      localStorage.setItem('dobook_business', JSON.stringify(minimizeBusinessForStorage(response.data)));
      onUpdate(response.data);
      toast.success('Account settings updated!');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setBillingLoading(true);
    try {
      const token = localStorage.getItem('dobook_token');
      const response = await axios.post(
        `${API}/stripe/checkout`,
        { plan: 'pro' },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const url = response?.data?.url;
      if (!url) throw new Error('Missing checkout URL');
      window.location.href = url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start checkout');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    try {
      const token = localStorage.getItem('dobook_token');
      const response = await axios.post(
        `${API}/stripe/portal`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const url = response?.data?.url;
      if (!url) throw new Error('Missing portal URL');
      window.location.href = url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to open billing portal');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('dobook_token');
      await axios.delete(`${API}/business/delete`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      localStorage.removeItem('dobook_token');
      localStorage.removeItem('dobook_business');
      toast.success('Account deleted');
      router.push('/');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete account');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const resetDeleteDialog = () => {
    setDeleteReason('');
    setDeleteConfirmText('');
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    resetDeleteDialog();
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Subscription Info Card */}
      <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle style={{fontFamily: 'Manrope'}}>Subscription Plan</CardTitle>
          <CardDescription>Current plan and usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
            <div>
              <p className="font-semibold text-lg">{isOwner ? 'Owner access' : `${effectivePlan.charAt(0).toUpperCase()}${effectivePlan.slice(1)} Plan`}</p>
              <p className="text-sm text-zinc-600 mt-1">
                {effectivePlan === 'free'
                  ? `${bookingsThisMonth} / 10 bookings this month • Confirmation emails only • No reminders`
                  : 'Unlimited bookings • Invoice PDFs • Automated reminders'}
                {!isOwner && effectivePlan !== 'free' && subscriptionStatus && subscriptionStatus !== 'active' && (
                  <span className="ml-2 text-zinc-500">
                    • Status: {subscriptionStatus}
                  </span>
                )}
              </p>
            </div>
            {effectivePlan === 'free' && (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 h-10 px-6 rounded-lg"
                onClick={handleUpgrade}
                disabled={billingLoading}
              >
                {billingLoading ? 'Redirecting…' : 'Upgrade to Pro - $30 AUD/month'}
              </Button>
            )}
            {!isOwner && effectivePlan !== 'free' && (
              <Button
                variant="outline"
                className="h-10 px-6 rounded-lg border-zinc-200"
                onClick={handleManageBilling}
                disabled={billingLoading}
              >
                {billingLoading ? 'Opening…' : 'Manage billing'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card data-testid="business-info-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle style={{fontFamily: 'Manrope'}}>Business Information</CardTitle>
          <CardDescription>Update your business details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload Section */}
          <div className="flex items-center gap-6 p-4 bg-zinc-50 rounded-lg">
            <div className="relative">
              {formData.logo_url ? (
                <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <img 
                    src={formData.logo_url} 
                    alt="Business Logo" 
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-24 w-24 rounded-full bg-rose-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                  {getInitials(formData.business_name || 'B')}
                </div>
              )}
              <label 
                htmlFor="logo-upload"
                className="absolute bottom-0 right-0 h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-zinc-50 transition-colors border-2 border-zinc-200"
              >
                <Upload className="h-4 w-4 text-zinc-600" />
              </label>
              <input
                id="logo-upload"
                data-testid="logo-upload-input"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-semibold mb-1">Business Logo</p>
              <p className="text-sm text-zinc-600 mb-2">
                {uploadingLogo ? 'Uploading...' : 'Click the upload icon to change your logo'}
              </p>
              <p className="text-xs text-zinc-500">Recommended: Square image, at least 200x200px</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                data-testid="business-name-input"
                value={formData.business_name}
                onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                className="bg-zinc-50 mt-2"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                data-testid="phone-input"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="bg-zinc-50 mt-2"
              />
            </div>

            <div>
              <Label>Industry</Label>
              <Select
                value={String(formData.industry || 'photobooth')}
                onValueChange={(val) => setFormData({ ...formData, industry: val })}
              >
                <SelectTrigger className="bg-zinc-50 mt-2 h-11">
                  <SelectValue />
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

            <div className="col-span-2">
              <Label htmlFor="business_address">Business Address</Label>
              <Input
                id="business_address"
                data-testid="address-input"
                value={formData.business_address}
                onChange={(e) => setFormData({...formData, business_address: e.target.value})}
                className="bg-zinc-50 mt-2"
              />
            </div>

            <div>
              <Label htmlFor="abn">ABN (Australian Business Number)</Label>
              <Input
                id="abn"
                data-testid="abn-input"
                value={formData.abn}
                onChange={(e) => setFormData({...formData, abn: e.target.value})}
                placeholder="XX XXX XXX XXX"
                className="bg-zinc-50 mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card data-testid="payment-details-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle style={{fontFamily: 'Manrope'}}>Payment Details</CardTitle>
          <CardDescription>Bank details for invoice payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                data-testid="bank-name-input"
                value={formData.bank_name}
                onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                placeholder="Commonwealth Bank"
                className="bg-zinc-50 mt-2"
              />
            </div>

            <div>
              <Label htmlFor="account_name">Account Name</Label>
              <Input
                id="account_name"
                data-testid="account-name-input"
                value={formData.account_name}
                onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                className="bg-zinc-50 mt-2"
              />
            </div>

            <div>
              <Label htmlFor="bsb">BSB</Label>
              <Input
                id="bsb"
                data-testid="bsb-input"
                value={formData.bsb}
                onChange={(e) => setFormData({...formData, bsb: e.target.value})}
                placeholder="XXX-XXX"
                maxLength={7}
                className="bg-zinc-50 mt-2"
              />
            </div>

            <div>
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                data-testid="account-number-input"
                value={formData.account_number}
                onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                className="bg-zinc-50 mt-2"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="payment_link">Payment Link (Optional)</Label>
              <Input
                id="payment_link"
                data-testid="payment-link-input"
                value={formData.payment_link}
                onChange={(e) => setFormData({...formData, payment_link: e.target.value})}
                placeholder="https://yourwebsite.com/pay"
                className="bg-zinc-50 mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Charges */}
      <Card data-testid="surcharges-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle style={{fontFamily: 'Manrope'}}>Additional Charges</CardTitle>
          <CardDescription>
            Optional surcharges your customers can select in the booking widget (and they’ll be included on invoices).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={Boolean(formData.travel_fee_enabled)}
                onCheckedChange={(v) => setFormData({ ...formData, travel_fee_enabled: Boolean(v) })}
              />
              <div className="font-semibold">Travel charge</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="travel_fee_label">Label</Label>
                <Input
                  id="travel_fee_label"
                  value={formData.travel_fee_label}
                  onChange={(e) => setFormData({ ...formData, travel_fee_label: e.target.value })}
                  placeholder="Travel fee"
                  className="bg-zinc-50 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="travel_fee_amount">Amount ($)</Label>
                <Input
                  id="travel_fee_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.travel_fee_amount}
                  onChange={(e) => setFormData({ ...formData, travel_fee_amount: e.target.value })}
                  className="bg-zinc-50 mt-2"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              Your customer will see this as an optional add-on checkbox in the booking link.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={Boolean(formData.cbd_fee_enabled)}
                onCheckedChange={(v) => setFormData({ ...formData, cbd_fee_enabled: Boolean(v) })}
              />
              <div className="font-semibold">CBD logistics charge</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="cbd_fee_label">Label</Label>
                <Input
                  id="cbd_fee_label"
                  value={formData.cbd_fee_label}
                  onChange={(e) => setFormData({ ...formData, cbd_fee_label: e.target.value })}
                  placeholder="CBD logistics"
                  className="bg-zinc-50 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="cbd_fee_amount">Amount ($)</Label>
                <Input
                  id="cbd_fee_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cbd_fee_amount}
                  onChange={(e) => setFormData({ ...formData, cbd_fee_amount: e.target.value })}
                  className="bg-zinc-50 mt-2"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              Enable this if you sometimes need extra logistics for city/CBD events.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Booking Editor Configuration */}
      <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle style={{fontFamily: 'Manrope'}}>Booking Editor</CardTitle>
          <CardDescription>Customize booth types and extra fields</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-zinc-700">
              {String(formData.industry || 'photobooth') === 'photobooth' ? 'Booth Types' : 'Service Types'}
            </Label>
            <div className="space-y-2">
              {(formData.booth_types || []).map((t, idx) => (
                <div key={`booth-${idx}`} className="flex items-center gap-2">
                  <Input
                    value={t}
                    onChange={(e) => {
                      const next = [...(formData.booth_types || [])];
                      next[idx] = e.target.value;
                      setFormData({ ...formData, booth_types: next });
                    }}
                    className="bg-zinc-50"
                    placeholder="Booth type"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    onClick={() => {
                      const next = (formData.booth_types || []).filter((_, i) => i !== idx);
                      setFormData({ ...formData, booth_types: next.length ? next : ['Open Booth'] });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => setFormData({ ...formData, booth_types: [...(formData.booth_types || []), ''] })}
            >
              {String(formData.industry || 'photobooth') === 'photobooth' ? 'Add Booth Type' : 'Add Service Type'}
            </Button>
          </div>

          <div className="space-y-3">
            <Label className="text-zinc-700">Additional Booking Fields</Label>
            <div className="space-y-2">
              {(formData.booking_custom_fields || []).map((f, idx) => (
                <div key={`${f?.key || f?.label || 'field'}-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-7">
                    <Input
                      value={f?.label || ''}
                      onChange={(e) => {
                        const next = [...(formData.booking_custom_fields || [])];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setFormData({ ...formData, booking_custom_fields: next });
                      }}
                      className="bg-zinc-50"
                      placeholder="Field label (e.g. Company Name)"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Select
                      value={String(f?.type || 'text')}
                      onValueChange={(val) => {
                        const next = [...(formData.booking_custom_fields || [])];
                        next[idx] = { ...next[idx], type: val };
                        setFormData({ ...formData, booking_custom_fields: next });
                      }}
                    >
                      <SelectTrigger className="bg-zinc-50 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="textarea">Long Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="time">Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full"
                      onClick={() => {
                        const next = (formData.booking_custom_fields || []).filter((_, i) => i !== idx);
                        setFormData({ ...formData, booking_custom_fields: next });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => setFormData({ ...formData, booking_custom_fields: [...(formData.booking_custom_fields || []), { label: '', type: 'text' }] })}
            >
              Add Field
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button 
        data-testid="save-settings-btn"
        onClick={handleSave}
        disabled={loading}
        className="w-full h-12 bg-rose-600 hover:bg-rose-700 rounded-lg"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>

      <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle style={{fontFamily: 'Manrope'}}>Contact support</CardTitle>
          <CardDescription>Reach us if you’re having an issue with the software</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="support_subject">Subject</Label>
            <Input
              id="support_subject"
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
              placeholder="What can we help with?"
              className="bg-zinc-50 mt-2"
            />
          </div>
          <div>
            <Label htmlFor="support_message">Message</Label>
            <Textarea
              id="support_message"
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Describe the issue, and include steps to reproduce if possible."
              className="bg-zinc-50 mt-2 min-h-[120px]"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={async () => {
                const subject = supportSubject.trim();
                const message = supportMessage.trim();
                if (!subject || !message) {
                  toast.error('Please enter a subject and message');
                  return;
                }
                setSupportSending(true);
                try {
                  const token = localStorage.getItem('dobook_token');
                  await axios.post(
                    `${API}/support/contact`,
                    { subject, message },
                    { headers: { Authorization: `Bearer ${token}` } },
                  );
                  toast.success('Message sent. We’ll get back to you soon.');
                  setSupportSubject('');
                  setSupportMessage('');
                } catch (error) {
                  toast.error(error.response?.data?.detail || 'Failed to send message');
                } finally {
                  setSupportSending(false);
                }
              }}
              disabled={supportSending}
              className="h-10 px-6 bg-rose-600 hover:bg-rose-700 rounded-lg"
            >
              {supportSending ? 'Sending…' : 'Send message'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-red-200 bg-red-50/40 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle style={{fontFamily: 'Manrope'}}>Danger zone</CardTitle>
          <CardDescription>
            Delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-6">
          <div className="text-sm text-zinc-700">
            If you delete your account, your bookings, templates, and business data may be lost permanently.
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={deleting}
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete account
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) resetDeleteDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              We’re sorry to see you go. Please tell us why you’re leaving, then confirm account deletion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="delete-reason">Why are you leaving us? (optional)</Label>
              <Textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Your feedback helps us improve."
                className="mt-2 bg-zinc-50"
              />
            </div>

            <div>
              <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="mt-2 bg-zinc-50"
              />
              <p className="mt-2 text-xs text-zinc-500">
                This will permanently delete your account and data (bookings, templates, and business settings).
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeDeleteDialog} disabled={deleting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={async () => {
                  const ok = await handleDeleteAccount();
                  if (ok) closeDeleteDialog();
                }}
              >
                {deleting ? 'Deleting...' : 'Delete account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============= Bookings Tab =============
const BookingsTab = ({ business, bookings, onRefresh }) => {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const isPhotoBooth = String(business?.industry || 'photobooth') === 'photobooth';

  const boothTypes = Array.isArray(business?.booth_types) && business.booth_types.length
    ? business.booth_types
    : ['Open Booth', 'Glam Booth', 'Enclosed Booth'];

  const [createData, setCreateData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_type: isPhotoBooth ? 'Photo Booth' : (boothTypes[0] || 'Service'),
    booth_type: isPhotoBooth ? (boothTypes[0] || '') : '',
    package_duration: isPhotoBooth ? '2 Hours' : '',
    event_location: '',
    booking_date: '',
    booking_time: '',
    duration_minutes: isPhotoBooth ? 120 : 60,
    parking_info: '',
    notes: '',
    price: '',
    quantity: 1,
  });

  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
  };

  const openCreate = () => {
    setCreateData((prev) => ({
      ...prev,
      service_type: isPhotoBooth
        ? 'Photo Booth'
        : (boothTypes.includes(prev.service_type) ? prev.service_type : (boothTypes[0] || 'Service')),
      booth_type: isPhotoBooth ? (boothTypes.includes(prev.booth_type) ? prev.booth_type : (boothTypes[0] || '')) : '',
      package_duration: isPhotoBooth ? (prev.package_duration || '2 Hours') : '',
      duration_minutes: isPhotoBooth ? (Number(prev.duration_minutes) || 120) : (Number(prev.duration_minutes) || 60),
    }));
    setCreateOpen(true);
  };

  return (
    <>
      <Card data-testid="bookings-list-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle style={{fontFamily: 'Manrope'}}>All Bookings</CardTitle>
              <CardDescription>Manage your appointments</CardDescription>
            </div>
            <Button
              type="button"
              onClick={openCreate}
              className="h-10 px-4 bg-rose-600 hover:bg-rose-700 rounded-lg"
            >
              <Plus className="h-4 w-4" />
              Add booking
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No bookings found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="text-left py-3 px-4 font-semibold">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold">Service</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Time</th>
                    <th className="text-left py-3 px-4 font-semibold">Price</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{booking.customer_name}</p>
                          <p className="text-sm text-zinc-600">{booking.customer_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">{booking.booth_type || booking.service_type}</td>
                      <td className="py-3 px-4">{booking.booking_date}</td>
                      <td className="py-3 px-4">{booking.booking_time}</td>
                      <td className="py-3 px-4">${bookingTotalAmount(booking).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                            String(booking.status || 'confirmed').toLowerCase() === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {booking.status || 'confirmed'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          data-testid={`view-booking-${booking.id}`}
                          onClick={() => handleViewBooking(booking)}
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(open) => setCreateOpen(open)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create booking</DialogTitle>
            <DialogDescription>
              Create a booking on behalf of a customer.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!business?.id) {
                toast.error('Business not loaded yet');
                return;
              }
              if (!createData.customer_name.trim()) {
                toast.error('Customer name is required');
                return;
              }
              if (!createData.booking_date || !createData.booking_time) {
                toast.error('Booking date and start time are required');
                return;
              }
              if (createData.customer_phone && !isValidPhone(createData.customer_phone)) {
                toast.error(phoneValidationHint());
                return;
              }

              setCreating(true);
              try {
                await axios.post(`${API}/bookings`, {
                  ...createData,
                  business_id: business.id,
                });
                toast.success('Booking created');
                setCreateOpen(false);
                setCreateData((prev) => ({
                  ...prev,
                  customer_name: '',
                  customer_email: '',
                  customer_phone: '',
                  event_location: '',
                  booking_date: '',
                  booking_time: '',
                  notes: '',
                  price: '',
                  quantity: 1,
                }));
                onRefresh?.();
              } catch (error) {
                toast.error(error.response?.data?.detail || 'Failed to create booking');
              } finally {
                setCreating(false);
              }
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cb_customer_name">Customer name *</Label>
                <Input
                  id="cb_customer_name"
                  value={createData.customer_name}
                  onChange={(e) => setCreateData({ ...createData, customer_name: e.target.value })}
                  className="bg-zinc-50 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="cb_customer_email">Customer email</Label>
                <Input
                  id="cb_customer_email"
                  type="email"
                  value={createData.customer_email}
                  onChange={(e) => setCreateData({ ...createData, customer_email: e.target.value })}
                  className="bg-zinc-50 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="cb_customer_phone">Customer phone</Label>
                <Input
                  id="cb_customer_phone"
                  type="tel"
                  inputMode="tel"
                  value={createData.customer_phone}
                  onChange={(e) => setCreateData({ ...createData, customer_phone: e.target.value })}
                  className="bg-zinc-50 mt-2"
                />
                <p className="text-xs text-zinc-500 mt-1">{phoneValidationHint()}</p>
              </div>
              <div>
                <Label htmlFor="cb_event_location">Event location</Label>
                <Input
                  id="cb_event_location"
                  value={createData.event_location}
                  onChange={(e) => setCreateData({ ...createData, event_location: e.target.value })}
                  className="bg-zinc-50 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="cb_booking_date">Date *</Label>
                <Input
                  id="cb_booking_date"
                  type="date"
                  value={createData.booking_date}
                  onChange={(e) => setCreateData({ ...createData, booking_date: e.target.value })}
                  className="bg-zinc-50 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="cb_booking_time">Start time *</Label>
                <Input
                  id="cb_booking_time"
                  type="time"
                  value={createData.booking_time}
                  onChange={(e) => setCreateData({ ...createData, booking_time: e.target.value })}
                  className="bg-zinc-50 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="cb_service_type">{isPhotoBooth ? 'Booth type' : 'Service type'}</Label>
                <Select
                  value={isPhotoBooth ? createData.booth_type : createData.service_type}
                  onValueChange={(val) => {
                    if (isPhotoBooth) setCreateData({ ...createData, booth_type: val });
                    else setCreateData({ ...createData, service_type: val, booth_type: '' });
                  }}
                >
                  <SelectTrigger className="bg-zinc-50 mt-2 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {boothTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isPhotoBooth ? (
                <div>
                  <Label htmlFor="cb_package_duration">Package duration</Label>
                  <Select
                    value={createData.package_duration}
                    onValueChange={(val) => {
                      const hours = parseInt(val);
                      const minutes = Number.isFinite(hours) ? hours * 60 : createData.duration_minutes;
                      setCreateData({ ...createData, package_duration: val, duration_minutes: minutes });
                    }}
                  >
                    <SelectTrigger className="bg-zinc-50 mt-2 h-11">
                      <SelectValue />
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
              ) : (
                <div>
                  <Label htmlFor="cb_duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="cb_duration_minutes"
                    type="number"
                    min="15"
                    step="15"
                    value={createData.duration_minutes}
                    onChange={(e) => setCreateData({ ...createData, duration_minutes: parseInt(e.target.value) || 60 })}
                    className="bg-zinc-50 mt-2"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="cb_quantity">Quantity</Label>
                <Input
                  id="cb_quantity"
                  type="number"
                  min="1"
                  value={createData.quantity}
                  onChange={(e) => setCreateData({ ...createData, quantity: parseInt(e.target.value) || 1 })}
                  className="bg-zinc-50 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="cb_price">Price ($)</Label>
                <Input
                  id="cb_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={createData.price}
                  onChange={(e) => setCreateData({ ...createData, price: e.target.value })}
                  className="bg-zinc-50 mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cb_notes">Notes</Label>
              <Textarea
                id="cb_notes"
                value={createData.notes}
                onChange={(e) => setCreateData({ ...createData, notes: e.target.value })}
                className="bg-zinc-50 mt-2 min-h-[96px]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="bg-rose-600 hover:bg-rose-700">
                {creating ? 'Creating…' : 'Create booking'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <BookingDetailsDialog
        booking={selectedBooking}
        business={business}
        onClose={() => {
          setSelectedBooking(null);
          onRefresh?.();
        }}
      />
    </>
  );
};

// ============= Calendar View Tab =============
const CalendarViewTab = ({ business, bookings, onRefresh }) => {
  const [displayMode, setDisplayMode] = useState('calendar'); // calendar | list
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date(2026, 1, 1)); // February 2026
  const [selectedBooking, setSelectedBooking] = useState(null);

  const hasRealBookings = Array.isArray(bookings) && bookings.length > 0;
  const displayBookings = hasRealBookings ? bookings : DEMO_BOOKINGS_FEB_2026;

  const events = displayBookings.map(bookingToEvent);

  const sortedBookings = [...displayBookings].sort((a, b) => {
    const ad = bookingDateTime(a, 'start')?.getTime?.() ?? 0;
    const bd = bookingDateTime(b, 'start')?.getTime?.() ?? 0;
    return ad - bd;
  });

  const navigate = (action) => {
    if (action === 'TODAY') {
      setDate(new Date());
      return;
    }

    const direction = action === 'PREV' ? -1 : 1;
    setDate((current) => {
      if (view === Views.MONTH) return addMonths(current, direction);
      if (view === Views.WEEK) return addWeeks(current, direction);
      if (view === Views.DAY) return addDays(current, direction);
      if (view === Views.AGENDA) return addWeeks(current, direction);
      return addMonths(current, direction);
    });
  };

  const title = format(date, view === Views.MONTH ? 'MMMM yyyy' : 'PPPP');

  const viewButton = (label, nextView) => (
    <button
      type="button"
      onClick={() => setView(nextView)}
      className={`h-10 px-5 rounded-full text-sm font-semibold transition-colors border ${
        view === nextView
          ? 'bg-rose-600 text-white border-rose-600'
          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Card data-testid="calendar-view-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-6">
        <div>
          <CardTitle style={{fontFamily: 'Manrope'}}>Calendar View</CardTitle>
          <CardDescription style={{fontFamily: 'Inter'}}>
            View your bookings in calendar or list format
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDisplayMode('calendar')}
            className={`h-11 px-6 rounded-lg border flex items-center gap-2 text-sm font-semibold transition-colors ${
              displayMode === 'calendar'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('list')}
            className={`h-11 px-6 rounded-lg border flex items-center gap-2 text-sm font-semibold transition-colors ${
              displayMode === 'list'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasRealBookings && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800">
            Showing demo bookings for February 2026. Create a booking to see your real data here.
          </div>
        )}

        {displayMode === 'calendar' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('TODAY')}
                  className="h-10 px-4 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-sm font-semibold"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => navigate('PREV')}
                  className="h-10 px-5 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-sm font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => navigate('NEXT')}
                  className="h-10 px-5 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-sm font-semibold"
                >
                  Next
                </button>
              </div>

              <div className="text-base font-semibold text-zinc-800" style={{fontFamily: 'Manrope'}}>
                {title}
              </div>

              <div className="flex items-center gap-2">
                {viewButton('Month', Views.MONTH)}
                {viewButton('Week', Views.WEEK)}
                {viewButton('Day', Views.DAY)}
                {viewButton('Agenda', Views.AGENDA)}
              </div>
            </div>

            <div className="h-[700px]">
              <BigCalendar
                localizer={calendarLocalizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                toolbar={false}
                date={date}
                view={view}
                onNavigate={(nextDate) => setDate(nextDate)}
                onView={(nextView) => setView(nextView)}
                onSelectEvent={(event) => setSelectedBooking(event.resource)}
                eventPropGetter={(event) => {
                  const isCancelled =
                    String(event?.resource?.status || 'confirmed').trim().toLowerCase() === 'cancelled';
                  if (!isCancelled) return {};
                  return {
                    style: {
                      backgroundColor: '#fee2e2',
                      borderColor: '#fecaca',
                      color: '#b91c1c',
                      textDecoration: 'line-through',
                    },
                  };
                }}
                popup
                selectable
                dayLayoutAlgorithm="no-overlap"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedBookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => setSelectedBooking(booking)}
                className="w-full text-left rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors"
              >
                <div className="p-5 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        String(booking.status || 'confirmed').toLowerCase() === 'cancelled'
                          ? 'bg-red-100'
                          : 'bg-rose-100'
                      }`}
                    >
                      <Calendar
                        className={`h-6 w-6 ${
                          String(booking.status || 'confirmed').toLowerCase() === 'cancelled'
                            ? 'text-red-600'
                            : 'text-rose-600'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{fontFamily: 'Manrope'}}>
                        {booking.customer_name}
                      </p>
                      <p className="text-sm text-zinc-600 truncate" style={{fontFamily: 'Inter'}}>
                        {booking.booth_type || booking.service_type || 'Booking'}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-zinc-700 text-center whitespace-nowrap">
                    <div className="font-semibold">{format(bookingDateTime(booking, 'start') || new Date(), 'MMM d, yyyy')}</div>
                    <div className="text-zinc-500">
                      {booking.booking_time || 'N/A'}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 whitespace-nowrap">
                    <div className="text-emerald-700 font-semibold">
                      ${bookingTotalAmount(booking).toFixed(2)}
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                        String(booking.status || 'confirmed').toLowerCase() === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {booking.status || 'confirmed'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <BookingDetailsDialog
          booking={selectedBooking}
          business={business}
          onClose={() => {
            setSelectedBooking(null);
            onRefresh?.();
          }}
        />
      </CardContent>
    </Card>
  );
};

// ============= Invoice Templates Tab =============
const InvoiceTemplatesTab = ({ businessId }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('Classic');
  const [customColor, setCustomColor] = useState('#e11d48');
  const [logoUrl, setLogoUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const allowedTemplateNames = ['Classic', 'Clean', 'Gradient', 'Navy', 'Elegant', 'Sidebar'];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('dobook_token');
      const response = await axios.get(`${API}/invoices/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(response.data);
      const active = Array.isArray(response.data) ? response.data[0] : null;
      if (active) {
        const nextName = allowedTemplateNames.includes(active.template_name) ? active.template_name : 'Classic';
        setSelectedTemplate(nextName);
        setCustomColor(active.primary_color || '#e11d48');
        setLogoUrl(active.logo_url || '');
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const token = localStorage.getItem('dobook_token');
      await axios.post(`${API}/invoices/templates`, {
        template_name: selectedTemplate,
        logo_url: logoUrl || null,
        primary_color: customColor
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Invoice template saved and set as active!');
      loadTemplates();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const templatePreviews = {
    Classic: {
      description: 'Traditional invoice with formal layout (current default)',
      features: ['Company header', 'Itemized details', 'Payment info', 'Signature'],
      thumbnail: (
        <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
          <div className="h-10" style={{backgroundColor: customColor}}></div>
          <div className="p-3 space-y-2">
            <div className="h-3 w-2/3 bg-zinc-200 rounded"></div>
            <div className="h-2 w-1/2 bg-zinc-100 rounded"></div>
            <div className="h-16 bg-zinc-50 rounded border border-zinc-100"></div>
            <div className="flex justify-end">
              <div className="h-4 w-24 rounded" style={{backgroundColor: customColor}}></div>
            </div>
          </div>
        </div>
      ),
      preview: (
        <div className="border border-zinc-300 rounded-lg p-6 bg-white" style={{fontFamily: 'serif'}}>
          <div className="h-16 rounded-t-lg mb-4" style={{backgroundColor: customColor}}></div>
          <div className="text-2xl font-bold mb-4 text-white -mt-12 ml-4" style={{textShadow: '0 2px 4px rgba(0,0,0,0.2)'}}>INVOICE</div>
          <div className="mt-8 space-y-2">
            <p className="font-bold text-lg">Your Business Name</p>
            <p className="text-sm text-zinc-600">business@email.com</p>
          </div>
          <div className="mt-6 space-y-1">
            <p className="font-bold text-sm">BILL TO:</p>
            <p className="text-sm">Customer Name</p>
            <p className="text-sm text-zinc-600">customer@email.com</p>
          </div>
          <div className="mt-6 border-t pt-4">
            <p className="font-bold mb-2">SERVICE DETAILS</p>
            <div className="space-y-1 text-sm">
              <p>Service: Glam Booth</p>
              <p>Date: 2026-02-17</p>
              <p>Time: 10:00 AM</p>
              <p>Duration: 3 hours</p>
            </div>
          </div>
          <div className="mt-6 p-3 rounded" style={{backgroundColor: customColor}}>
            <p className="font-bold text-white text-lg">TOTAL: $600.00</p>
          </div>
        </div>
      ),
    },
    Clean: {
      description: 'Clean, spacious layout with light background',
      features: ['Business details left', 'Invoice details right', 'Full item table', 'Subtotal/tax/total'],
      thumbnail: (
        <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
          <div className="p-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="h-3 w-24 bg-zinc-200 rounded"></div>
                <div className="h-2 w-32 bg-zinc-100 rounded"></div>
                <div className="h-2 w-28 bg-zinc-100 rounded"></div>
              </div>
              <div className="text-right space-y-1">
                <div className="h-3 w-16 bg-zinc-200 rounded ml-auto"></div>
                <div className="h-2 w-20 bg-zinc-100 rounded ml-auto"></div>
                <div className="h-2 w-16 bg-zinc-100 rounded ml-auto"></div>
              </div>
            </div>
            <div className="h-px bg-zinc-200 my-3"></div>
            <div className="h-12 bg-zinc-50 rounded border border-zinc-100"></div>
            <div className="flex justify-end mt-3">
              <div className="h-3 w-20 bg-zinc-200 rounded"></div>
            </div>
          </div>
        </div>
      ),
      preview: (
        <div className="border border-zinc-300 rounded-lg p-6 bg-white" style={{fontFamily: 'Arial, sans-serif'}}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Your Business Name</h2>
              <p className="text-sm text-zinc-600">123 Business St, City</p>
              <p className="text-sm text-zinc-600">business@email.com</p>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold">INVOICE</h1>
              <p className="text-sm font-semibold">#INV-001</p>
              <p className="text-sm">Date: 2026-02-17</p>
              <p className="text-sm">Due: 2026-03-03</p>
            </div>
          </div>
          <div className="h-px bg-zinc-200 my-6"></div>
          <div className="mb-4">
            <p className="text-sm font-bold mb-1">Bill To:</p>
            <p className="text-sm">Customer Name</p>
            <p className="text-xs text-zinc-600">customer@email.com</p>
          </div>
          <div className="mt-6">
            <div className="grid grid-cols-4 gap-2 text-xs font-semibold bg-zinc-100 p-2 rounded">
              <div className="col-span-2">Description</div>
              <div className="text-center">Qty</div>
              <div className="text-right">Total</div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs p-2 border-b">
              <div className="col-span-2">3 Hours Glam Booth</div>
              <div className="text-center">1</div>
              <div className="text-right">$600.00</div>
            </div>
          </div>
          <div className="text-right mt-6">
            <p className="text-sm">Subtotal: $600.00</p>
            <p className="text-sm">Tax: $0.00</p>
            <p className="text-xl font-bold">Total: $600.00</p>
          </div>
        </div>
      ),
    },
    Gradient: {
      description: 'Bold gradient header with modern layout',
      features: ['Gradient header', 'Simple table', 'Strong total', 'Modern feel'],
      thumbnail: (
        <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
          <div className="h-12" style={{background: 'linear-gradient(90deg,#e11d48,#9333ea)'}}></div>
          <div className="p-3 space-y-2">
            <div className="h-3 w-1/2 bg-zinc-200 rounded"></div>
            <div className="h-12 bg-zinc-50 rounded border border-zinc-100"></div>
            <div className="flex justify-end">
              <div className="h-4 w-20 bg-zinc-200 rounded"></div>
            </div>
          </div>
        </div>
      ),
      preview: (
        <div className="border border-zinc-300 rounded-lg overflow-hidden bg-white" style={{fontFamily: 'Arial, sans-serif'}}>
          <div style={{background: 'linear-gradient(90deg,#e11d48,#9333ea)'}} className="p-6 text-white">
            <h1 className="text-3xl font-bold mb-1">INVOICE</h1>
            <p className="text-sm">#INV-001</p>
          </div>
          <div className="p-6">
            <div className="flex justify-between gap-6">
              <div>
                <p className="font-bold text-lg">Your Business Name</p>
                <p className="text-sm text-zinc-600">123 Business St, City</p>
              </div>
              <div className="text-sm text-zinc-700">
                <p>Date: 2026-02-17</p>
                <p>Due: 2026-03-03</p>
              </div>
            </div>
            <div className="h-px bg-zinc-200 my-6"></div>
            <p className="font-semibold mb-2">Bill To:</p>
            <p>Customer Name</p>
            <div className="mt-4 border rounded overflow-hidden">
              <div className="grid grid-cols-2 bg-zinc-100 text-xs font-semibold p-2">
                <div>Description</div>
                <div className="text-right">Amount</div>
              </div>
              <div className="grid grid-cols-2 text-xs p-2 border-t">
                <div>3 Hours Glam Booth</div>
                <div className="text-right">$600.00</div>
              </div>
            </div>
            <div className="text-right mt-6">
              <h2 className="text-2xl font-bold">$600.00</h2>
            </div>
          </div>
        </div>
      ),
    },
    Navy: {
      description: 'Corporate navy header and structured table',
      features: ['Navy header', 'Qty/rate table', 'Strong total', 'Clean blocks'],
      thumbnail: (
        <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
          <div className="h-12" style={{backgroundColor: '#1e3a8a'}}></div>
          <div className="p-3 space-y-2">
            <div className="h-3 w-2/3 bg-zinc-200 rounded"></div>
            <div className="h-12 bg-zinc-50 rounded border border-zinc-100"></div>
            <div className="flex justify-end">
              <div className="h-4 w-20 rounded" style={{backgroundColor: '#1e3a8a'}}></div>
            </div>
          </div>
        </div>
      ),
      preview: (
        <div className="border border-zinc-300 rounded-lg overflow-hidden bg-white" style={{fontFamily: 'Arial, sans-serif'}}>
          <div className="p-6 text-white" style={{backgroundColor: '#1e3a8a'}}>
            <h1 className="text-3xl font-bold">INVOICE</h1>
          </div>
          <div className="p-6">
            <div className="flex justify-between gap-6">
              <div>
                <p className="font-bold text-lg">Your Business Name</p>
                <p className="text-sm text-zinc-600">123 Business St, City</p>
              </div>
              <div className="text-right text-sm">
                <p><span className="font-semibold">Invoice #:</span> INV-001</p>
                <p><span className="font-semibold">Date:</span> 2026-02-17</p>
              </div>
            </div>
            <div className="h-px bg-zinc-200 my-6"></div>
            <p className="font-semibold mb-2">Customer Details</p>
            <p>Customer Name</p>
            <div className="mt-4 border rounded overflow-hidden">
              <div className="grid grid-cols-4 bg-zinc-100 text-xs font-semibold p-2">
                <div className="col-span-2">Service</div>
                <div className="text-center">Qty</div>
                <div className="text-right">Total</div>
              </div>
              <div className="grid grid-cols-4 text-xs p-2 border-t">
                <div className="col-span-2">3 Hours Glam Booth</div>
                <div className="text-center">1</div>
                <div className="text-right">$600.00</div>
              </div>
            </div>
            <div className="text-right mt-6">
              <h2 className="text-2xl font-bold" style={{color: '#1e3a8a'}}>Total: $600.00</h2>
            </div>
          </div>
        </div>
      ),
    },
    Elegant: {
      description: 'Elegant serif design with centered title',
      features: ['Centered header', 'Serif typography', 'Minimal chrome', 'Print-friendly'],
      thumbnail: (
        <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
          <div className="p-3 space-y-2">
            <div className="h-3 w-24 bg-zinc-200 rounded mx-auto"></div>
            <div className="h-2 w-16 bg-zinc-100 rounded mx-auto"></div>
            <div className="h-px bg-zinc-200 my-2"></div>
            <div className="h-12 bg-zinc-50 rounded border border-zinc-100"></div>
            <div className="flex justify-end">
              <div className="h-3 w-24 bg-zinc-200 rounded"></div>
            </div>
          </div>
        </div>
      ),
      preview: (
        <div className="border border-zinc-300 rounded-lg p-8 bg-white" style={{fontFamily: 'Georgia, serif'}}>
          <div className="text-center">
            <h1 className="text-3xl tracking-widest">INVOICE</h1>
            <p className="text-sm text-zinc-600">#INV-001</p>
          </div>
          <div className="mt-8">
            <p className="text-lg font-semibold">Your Business Name</p>
            <p className="text-sm text-zinc-600">123 Business St, City</p>
          </div>
          <div className="h-px bg-zinc-200 my-8"></div>
          <p className="font-semibold mb-2">Bill To:</p>
          <p>Customer Name</p>
          <div className="mt-6 border rounded overflow-hidden">
            <div className="grid grid-cols-2 text-xs font-semibold p-2 bg-white">
              <div>Description</div>
              <div className="text-right">Total</div>
            </div>
            <div className="grid grid-cols-2 text-xs p-2 border-t">
              <div>3 Hours Glam Booth</div>
              <div className="text-right">$600.00</div>
            </div>
          </div>
          <div className="text-right mt-8">
            <h2 className="text-2xl font-semibold">Total Due: $600.00</h2>
          </div>
        </div>
      ),
    },
    Sidebar: {
      description: 'Dark sidebar brand block with modern content area',
      features: ['Left sidebar branding', 'Clean right content', 'Great for logos', 'Modern feel'],
      thumbnail: (
        <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden flex">
          <div className="w-1/3" style={{backgroundColor: '#111827'}}></div>
          <div className="flex-1 p-3 space-y-2">
            <div className="h-3 w-20 bg-zinc-200 rounded"></div>
            <div className="h-10 bg-zinc-50 rounded border border-zinc-100"></div>
            <div className="flex justify-end">
              <div className="h-4 w-16 bg-zinc-200 rounded"></div>
            </div>
          </div>
        </div>
      ),
      preview: (
        <div className="border border-zinc-300 rounded-lg overflow-hidden bg-white" style={{fontFamily: 'Arial, sans-serif'}}>
          <div className="flex">
            <div className="w-64 p-6 text-white" style={{backgroundColor: '#111827'}}>
              <p className="text-lg font-bold">Your Business Name</p>
              <p className="text-sm text-zinc-300 mt-2">123 Business St, City</p>
              <p className="text-sm text-zinc-300">business@email.com</p>
            </div>
            <div className="flex-1 p-6">
              <div className="flex justify-between items-start">
                <h1 className="text-3xl font-bold">INVOICE</h1>
                <div className="text-sm text-zinc-700 text-right">
                  <p>#INV-001</p>
                  <p>2026-02-17</p>
                </div>
              </div>
              <div className="h-px bg-zinc-200 my-6"></div>
              <p className="font-semibold mb-2">Customer</p>
              <p>Customer Name</p>
              <div className="mt-4 border rounded overflow-hidden">
                <div className="grid grid-cols-2 bg-zinc-100 text-xs font-semibold p-2">
                  <div>Description</div>
                  <div className="text-right">Amount</div>
                </div>
                <div className="grid grid-cols-2 text-xs p-2 border-t">
                  <div>3 Hours Glam Booth</div>
                  <div className="text-right">$600.00</div>
                </div>
              </div>
              <div className="text-right mt-6">
                <h2 className="text-2xl font-bold">Total: $600.00</h2>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  };

  const templateKeys = Object.keys(templatePreviews);
  const activeTemplate = Array.isArray(templates) && templates.length ? templates[0] : null;

  return (
    <div className="space-y-6">
      <Card data-testid="invoice-template-editor" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle style={{fontFamily: 'Manrope'}}>Invoice Templates</CardTitle>
          <CardDescription>Choose one template, then save to set it as the only active invoice template</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Choose Template</Label>
                <p className="text-xs text-zinc-500 mt-1">Only one can be active at a time.</p>
              </div>
              {activeTemplate && (
                <div className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1">
                  Active: <span className="font-semibold">{activeTemplate.template_name}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templateKeys.map((name) => {
                const selected = name === selectedTemplate;
                const meta = templatePreviews[name];
                return (
                  <button
                    key={name}
                    type="button"
                    data-testid={`template-card-${name}`}
                    onClick={() => setSelectedTemplate(name)}
                    className={`text-left rounded-xl border transition-all overflow-hidden bg-white hover:shadow-md ${
                      selected ? 'border-rose-300 ring-2 ring-rose-100' : 'border-zinc-200'
                    }`}
                  >
                    <div className="p-3">
                      {meta.thumbnail}
                    </div>
                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold" style={{fontFamily: 'Manrope'}}>{name}</p>
                        {selected && (
                          <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 mt-1">{meta.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 bg-zinc-50 rounded-lg border border-zinc-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">{selectedTemplate} Template</h4>
              <Button
                data-testid="preview-template-btn"
                onClick={() => setShowPreview(true)}
                size="sm"
                variant="outline"
                className="h-8"
              >
                <FileText className="h-4 w-4 mr-1" />
                Preview
              </Button>
            </div>
            <p className="text-sm text-zinc-600 mb-4">{templatePreviews[selectedTemplate].description}</p>
            <div className="grid grid-cols-2 gap-2">
              {templatePreviews[selectedTemplate].features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 bg-emerald-600 rounded-full"></div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="primary-color"
                  data-testid="template-color-input"
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="h-11 w-20"
                />
                <Input
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#e11d48"
                  className="bg-zinc-50"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="logo-url">Logo URL (Optional)</Label>
              <Input
                id="logo-url"
                data-testid="template-logo-input"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="bg-zinc-50 mt-2"
              />
            </div>
          </div>

          <Button 
            data-testid="save-template-btn"
            onClick={handleSaveTemplate}
            className="w-full h-12 bg-rose-600 hover:bg-rose-700 rounded-lg"
          >
            Save & Set Active
          </Button>
        </CardContent>
      </Card>

      {/* Template Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent data-testid="template-preview-dialog" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{fontFamily: 'Manrope'}}>{selectedTemplate} Template Preview</DialogTitle>
            <DialogDescription>Sample invoice with your customizations</DialogDescription>
          </DialogHeader>
          <div className="max-h-[600px] overflow-y-auto">
            {templatePreviews[selectedTemplate].preview}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============= Calendar Tab =============
const CalendarTab = ({ businessId }) => {
  // Deprecated - keeping for compatibility
  return null;
};

// ============= PDF Upload Tab =============
const PDFUploadTab = ({ businessId, onBookingCreated }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extractionId, setExtractionId] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    let interval;
    if (extractionId && polling) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API}/upload/extraction/${extractionId}`);
          if (response.data.processing_status === 'success') {
            setExtractedData(response.data.extracted_data);
            setPolling(false);
          } else if (response.data.processing_status === 'failed') {
            toast.error('PDF processing failed');
            setPolling(false);
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [extractionId, polling]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload/pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExtractionId(response.data.extraction_id);
      setPolling(true);
      toast.success('PDF uploaded! Extracting data...');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!extractedData) return;

    try {
      const combinedNotes = [
        extractedData.message || extractedData.notes,
        extractedData.invoice_number ? `Invoice Number: ${extractedData.invoice_number}` : null,
      ]
        .filter(Boolean)
        .join('\n')
        .trim();

      const bookingData = {
        business_id: businessId,
        customer_name: extractedData.customer_name || 'Guest',
        customer_email: extractedData.customer_email || 'guest@example.com',
        customer_phone: extractedData.customer_phone,
        service_type: extractedData.service_type || 'Service',
        booth_type: extractedData.booth_type,
        package_duration: extractedData.package_duration,
        event_location: extractedData.event_location,
        booking_date: extractedData.booking_date || new Date().toISOString().split('T')[0],
        booking_time: extractedData.booking_time || '10:00',
        duration_minutes: extractedData.duration_minutes || 60,
        notes: combinedNotes,
        price: extractedData.price || 0
      };

      await axios.post(`${API}/bookings`, bookingData);
      toast.success('Booking created successfully!');
      setExtractedData(null);
      setExtractionId(null);
      setFile(null);
      onBookingCreated();
    } catch (error) {
      toast.error('Failed to create booking');
    }
  };

  return (
    <div className="space-y-6">
      <Card data-testid="pdf-upload-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle style={{fontFamily: 'Manrope'}}>Upload Booking PDF</CardTitle>
          <CardDescription>Extract booking details automatically from PDF files</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label htmlFor="pdf-file">Select PDF File</Label>
              <Input
                id="pdf-file"
                data-testid="pdf-file-input"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="cursor-pointer"
              />
            </div>

            <Button 
              data-testid="upload-pdf-btn"
              type="submit" 
              disabled={!file || uploading || polling}
              className="w-full h-12 bg-rose-600 hover:bg-rose-700 rounded-lg"
            >
              {uploading ? 'Uploading...' : polling ? 'Processing...' : 'Upload & Extract'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {extractedData && (
        <Card data-testid="extracted-data-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle style={{fontFamily: 'Manrope'}}>Extracted Booking Data</CardTitle>
            <CardDescription>Review and confirm the details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name</Label>
                <Input value={extractedData.customer_name || ''} readOnly className="bg-zinc-50" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={extractedData.customer_email || ''} readOnly className="bg-zinc-50" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={extractedData.customer_phone || ''} readOnly className="bg-zinc-50" />
              </div>
              <div>
                <Label>Service</Label>
                <Input value={extractedData.service_type || ''} readOnly className="bg-zinc-50" />
              </div>
              <div>
                <Label>Booth Type</Label>
                <Input value={extractedData.booth_type || ''} readOnly className="bg-zinc-50" />
              </div>
              <div>
                <Label>Package Duration</Label>
                <Input value={extractedData.package_duration || ''} readOnly className="bg-zinc-50" />
              </div>
              <div>
                <Label>Date</Label>
                <Input value={extractedData.booking_date || ''} readOnly className="bg-zinc-50" />
              </div>
              <div>
                <Label>Time</Label>
                <Input value={extractedData.booking_time || ''} readOnly className="bg-zinc-50" />
              </div>
              <div>
                <Label>Event Location</Label>
                <Input value={extractedData.event_location || ''} readOnly className="bg-zinc-50" />
              </div>
              <div>
                <Label>Price</Label>
                <Input value={`$${extractedData.price || 0}`} readOnly className="bg-zinc-50" />
              </div>
            </div>
            <div>
              <Label>Message</Label>
              <Input value={extractedData.message || extractedData.notes || ''} readOnly className="bg-zinc-50" />
            </div>

            <div className="flex gap-3">
              <Button 
                data-testid="confirm-extracted-booking-btn"
                onClick={handleConfirmBooking}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Confirm Booking
              </Button>
              <Button 
                onClick={() => { setExtractedData(null); setExtractionId(null); }}
                variant="outline"
                className="flex-1 h-12 rounded-lg"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============= Widget Tab =============
const WidgetTab = ({ businessId }) => {
  const widgetUrl = `${window.location.origin}/book/${businessId}`;
  const embedCode = [
    `<iframe`,
    `  src="${widgetUrl}"`,
    `  title="DoBook booking widget"`,
    `  loading="lazy"`,
    `  style="width:100%; border:0; display:block; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.12); min-height:720px;"`,
    `  height="720"`,
    `></iframe>`,
  ].join("\n");

  return (
    <Card data-testid="widget-config-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle style={{fontFamily: 'Manrope'}}>Embed Widget</CardTitle>
        <CardDescription>Add DoBook to your website</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Direct Booking Link</Label>
          <div className="flex gap-2 mt-2">
            <Input value={widgetUrl} readOnly className="bg-zinc-50" />
            <Button 
              data-testid="copy-link-btn"
              onClick={() => { navigator.clipboard.writeText(widgetUrl); toast.success('Link copied!'); }}
              className="bg-rose-600 hover:bg-rose-700 px-6"
            >
              Copy
            </Button>
          </div>
        </div>

        <div>
          <Label>Embed Code (iframe)</Label>
          <div className="mt-2">
            <Textarea 
              value={embedCode} 
              readOnly 
              className="bg-zinc-50 font-mono text-sm h-28"
            />
            <Button 
              data-testid="copy-embed-btn"
              onClick={() => { navigator.clipboard.writeText(embedCode); toast.success('Code copied!'); }}
              className="mt-2 bg-rose-600 hover:bg-rose-700 w-full h-12 rounded-lg"
            >
              Copy Embed Code
            </Button>
          </div>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-800">
            <strong>Tip:</strong> Paste this iframe where you want the widget. If it looks cut off, increase the{" "}
            <code>height</code> and <code>min-height</code> values.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// ============= Public Booking Widget =============
const BookingWidget = () => {
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
    booking_date: '',
    booking_time: '',
    duration_minutes: 120,
    parking_info: '',
    notes: '',
    price: '',
    quantity: 1,
    apply_travel_fee: false,
    apply_cbd_fee: false,
    custom_fields: {}
  });
  const [loading, setLoading] = useState(false);

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
  const [success, setSuccess] = useState(false);

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
        booth_type: boothTypes.includes(prev.booth_type) ? prev.booth_type : (boothTypes[0] || 'Open Booth'),
        service_type: isPhotoBooth ? 'Photo Booth' : (boothTypes.includes(prev.service_type) ? prev.service_type : (boothTypes[0] || 'Service')),
        package_duration: isPhotoBooth ? (prev.package_duration || '2 Hours') : '',
        duration_minutes: isPhotoBooth ? (prev.duration_minutes || 120) : (prev.duration_minutes || 60),
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
      await axios.post(`${API}/bookings`, payload);
      setSuccess(true);
      toast.success('Booking confirmed! Check your email.');
    } catch (error) {
      toast.error('Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!business) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <Card data-testid="booking-success-card" className="max-w-md w-full bg-white border border-zinc-200 shadow-xl rounded-xl">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl" style={{fontFamily: 'Manrope'}}>Booking Confirmed!</CardTitle>
            <CardDescription style={{fontFamily: 'Inter'}}>You'll receive a confirmation email shortly</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const boothTypes = Array.isArray(business?.booth_types) && business.booth_types.length
    ? business.booth_types
    : ['Open Booth', 'Glam Booth', 'Enclosed Booth'];
  const extraFields = Array.isArray(business?.booking_custom_fields) ? business.booking_custom_fields : [];
  const isPhotoBooth = String(business?.industry || 'photobooth') === 'photobooth';

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-6" data-testid="booking-widget">
      <Toaster position="top-center" richColors />
      
      <div className="max-w-2xl mx-auto">
	        <div className="text-center mb-8">
	          <div className="inline-flex items-center gap-3 mb-4">
	            <BrandLogo size="lg" />
	          </div>
	          <h1 className="text-3xl font-bold mb-2" style={{fontFamily: 'Manrope'}}>{business.business_name}</h1>
	          <p className="text-zinc-600" style={{fontFamily: 'Inter'}}>Book your appointment</p>
	        </div>

        <Card data-testid="booking-form-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle style={{fontFamily: 'Manrope'}}>Booking Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Full Name *</Label>
                  <Input
                    id="customer_name"
                    data-testid="widget-name-input"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    required
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="customer_email">Email *</Label>
                  <Input
                    id="customer_email"
                    data-testid="widget-email-input"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                    required
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="customer_phone">Phone Number</Label>
                  <Input
                    id="customer_phone"
                    data-testid="widget-phone-input"
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                    inputMode="tel"
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                  />
                  <p className="text-xs text-zinc-500 mt-1">{phoneValidationHint()}</p>
                </div>

                <div>
                  <Label htmlFor="booking_date">Event Date *</Label>
                  <Input
                    id="booking_date"
                    data-testid="widget-date-input"
                    type="date"
                    value={formData.booking_date}
                    onChange={(e) => setFormData({...formData, booking_date: e.target.value})}
                    required
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="event_location">Event Location *</Label>
                  <Input
                    id="event_location"
                    data-testid="widget-location-input"
                    value={formData.event_location}
                    onChange={(e) => setFormData({...formData, event_location: e.target.value})}
                    placeholder="Enter venue or address"
                    required
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="booth_type">
                    {isPhotoBooth ? 'Select Booth Type *' : 'Select Service Type *'}
                  </Label>
                  <Select 
                    value={isPhotoBooth ? formData.booth_type : formData.service_type}
                    onValueChange={(val) => {
                      if (isPhotoBooth) setFormData({ ...formData, booth_type: val });
                      else setFormData({ ...formData, service_type: val, booth_type: '' });
                    }}
                  >
                    <SelectTrigger data-testid="widget-booth-select" className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {boothTypes.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isPhotoBooth ? (
                  <div>
                    <Label htmlFor="package_duration">Select Package Duration *</Label>
                    <Select 
                      value={formData.package_duration} 
                      onValueChange={(val) => {
                        const hours = parseInt(val);
                        setFormData({...formData, package_duration: val, duration_minutes: hours * 60});
                      }}
                    >
                      <SelectTrigger data-testid="widget-package-select" className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11">
                        <SelectValue />
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
                ) : (
                  <div>
                    <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
                    <Input
                      id="duration_minutes"
                      type="number"
                      min="15"
                      step="15"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 60})}
                      className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    data-testid="widget-quantity-input"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="price">Agreed Price ($) *</Label>
                  <Input
                    id="price"
                    data-testid="widget-price-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || ''})}
                    placeholder="0.00"
                    required
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="booking_time">Start Time *</Label>
                  <Input
                    id="booking_time"
                    data-testid="widget-start-time-input"
                    type="time"
                    value={formData.booking_time}
                    onChange={(e) => setFormData({...formData, booking_time: e.target.value})}
                    required
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="parking_info">Parking Information</Label>
                  <Input
                    id="parking_info"
                    data-testid="widget-parking-input"
                    value={formData.parking_info}
                    onChange={(e) => setFormData({...formData, parking_info: e.target.value})}
                    placeholder="Street parking, garage, etc."
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    data-testid="widget-notes-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Any special requests"
                    className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                  />
                </div>
              </div>

              {extraFields.length > 0 && (
                <div className="pt-2">
                  <div className="text-sm font-semibold mb-2 text-zinc-800">Additional Details</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {extraFields.map((f) => {
                      const key = f?.key;
                      if (!key) return null;
                      const type = String(f?.type || 'text');
                      const label = f?.label || key;
                      const value = formData.custom_fields?.[key] ?? '';

                      if (type === 'textarea') {
                        return (
                          <div key={key} className="md:col-span-2">
                            <Label>{label}</Label>
                            <Textarea
                              value={String(value)}
                              onChange={(e) => setFormData({ ...formData, custom_fields: { ...(formData.custom_fields || {}), [key]: e.target.value } })}
                              className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg mt-2"
                              rows={3}
                            />
                          </div>
                        );
                      }

                      const inputType = (type === 'number' || type === 'date' || type === 'time') ? type : 'text';
                      return (
                        <div key={key}>
                          <Label>{label}</Label>
                          <Input
                            type={inputType}
                            value={String(value)}
                            onChange={(e) => setFormData({ ...formData, custom_fields: { ...(formData.custom_fields || {}), [key]: e.target.value } })}
                            className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11 mt-2"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(Boolean(business?.travel_fee_enabled) && Number(business?.travel_fee_amount || 0) > 0) ||
              (Boolean(business?.cbd_fee_enabled) && Number(business?.cbd_fee_amount || 0) > 0) ? (
                <div className="pt-2 border-t">
                  <div className="text-sm font-semibold mb-2 text-zinc-800">Optional add-ons</div>
                  <div className="space-y-3">
                    {Boolean(business?.travel_fee_enabled) && Number(business?.travel_fee_amount || 0) > 0 && (
                      <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-zinc-200 bg-white">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={Boolean(formData.apply_travel_fee)}
                            onCheckedChange={(v) => setFormData({ ...formData, apply_travel_fee: Boolean(v) })}
                          />
                          <div>
                            <div className="font-medium">
                              {String(business?.travel_fee_label || 'Travel fee')}
                            </div>
                            <div className="text-xs text-zinc-500">Add travel charges if required</div>
                          </div>
                        </div>
                        <div className="font-semibold text-zinc-800">
                          +${Number(business?.travel_fee_amount || 0).toFixed(2)}
                        </div>
                      </label>
                    )}

                    {Boolean(business?.cbd_fee_enabled) && Number(business?.cbd_fee_amount || 0) > 0 && (
                      <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-zinc-200 bg-white">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={Boolean(formData.apply_cbd_fee)}
                            onCheckedChange={(v) => setFormData({ ...formData, apply_cbd_fee: Boolean(v) })}
                          />
                          <div>
                            <div className="font-medium">
                              {String(business?.cbd_fee_label || 'CBD logistics')}
                            </div>
                            <div className="text-xs text-zinc-500">Extra logistics for city/CBD events</div>
                          </div>
                        </div>
                        <div className="font-semibold text-zinc-800">
                          +${Number(business?.cbd_fee_amount || 0).toFixed(2)}
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              ) : null}

              <Button 
                data-testid="widget-submit-btn"
                type="submit" 
                disabled={loading}
                className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                {loading ? 'Booking...' : 'Book Appointment'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-500">
          <a className="hover:text-zinc-700" href="/terms">
            Terms
          </a>
          <a className="hover:text-zinc-700" href="/privacy">
            Privacy
          </a>
          <a className="hover:text-zinc-700" href="/policies/cancellation">
            Cancellation Policy
          </a>
          <a className="hover:text-zinc-700" href="/">
            Powered by DoBook
          </a>
        </div>
      </div>
    </div>
  );
};

export { LandingPage, Dashboard, BookingWidget };

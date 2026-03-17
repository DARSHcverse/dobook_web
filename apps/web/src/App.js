'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import '@/App.css';
import { toast } from 'sonner';
import {
  ArrowUpDown,
  BarChart3,
  Bell,
  Calendar,
  CalendarDays,
  Clock,
  Code,
  CreditCard,
  FileText,
  Globe,
  LayoutDashboard,
  Link2,
  List,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Smartphone,
  Upload,
  User,
  UserCheck,
  Users,
  Users2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { addDays, addMinutes, addMonths, addWeeks, format, getDay, parse, parseISO, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import jsPDF from 'jspdf';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { isValidPhone, phoneValidationHint } from '@/lib/phone';
import { minimizeBusinessForStorage } from '@/lib/businessStorage';
import { PRO_PRICE_AUD } from '@/lib/pricing';
import { Checkbox } from '@/components/ui/checkbox';
import AddressAutocomplete from '@/components/app/AddressAutocomplete';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BusinessTour from '@/components/tour/BusinessTour';
import ThemeModeToggle from "@/components/app/ThemeModeToggle";
import BusinessTypeSettingsCard from '@/components/app/BusinessTypeSettingsCard';
import BusinessBookingSettingsCard from '@/components/app/BusinessBookingSettingsCard';
import { BOOKING_FIELDS_BY_TYPE, inferBookingTypeKey, RESERVED_CUSTOM_FIELD_KEYS } from "@/lib/bookingFieldsByType";
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const API = `${API_BASE}/api`;
axios.defaults.withCredentials = true;

const DOBOOK_LOGO_PNG = '/brand/dobook-logo.png';
const DOBOOK_LOGO_SVG = '/brand/dobook-logo.svg';

const bookingStatusBadgeClass = (status) =>
  cn(
    "rounded-full px-3 py-0.5 text-xs font-medium capitalize",
    status === 'confirmed' && "border-green-200 bg-green-50 text-green-700",
    status === 'cancelled' && "border-red-200 bg-red-50 text-red-700",
    status === 'pending' && "border-yellow-200 bg-yellow-50 text-yellow-700",
    status === 'completed' && "border-gray-200 bg-gray-50 text-gray-600",
  );

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
  const staffName =
    booking?.staff?.name
    || booking?.staff_name
    || booking?.assigned_staff_name
    || '';
  const staffSuffix = staffName ? ` (${staffName})` : '';
  const isCancelled = String(booking?.status || 'confirmed').trim().toLowerCase() === 'cancelled';
  return {
    id: booking.id,
    title: `${customer} - ${booth}${staffSuffix}${isCancelled ? ' (Cancelled)' : ''}`,
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
  const [bookingFieldDefs, setBookingFieldDefs] = useState([]);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    booking_date: '',
    booking_time: '',
    booth_type: '',
    service_type: '',
    price: '',
    notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [assigningStaff, setAssigningStaff] = useState(false);
  const [staffSelection, setStaffSelection] = useState('');
  const [backdropNotes, setBackdropNotes] = useState('');

  useEffect(() => {
    setCurrentBooking(booking || null);
    setIsEditing(false);
    setEditData({
      booking_date: booking?.booking_date || '',
      booking_time: booking?.booking_time || '',
      booth_type: booking?.booth_type || '',
      service_type: booking?.service_type || '',
      price: booking?.price ?? '',
      notes: booking?.notes || '',
    });
    setStaffSelection(booking?.staff_id || '');
    setBackdropNotes(booking?.backdrop_notes || '');
  }, [booking]);

  useEffect(() => {
    if (!booking) return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await axios.get(`${API}/business/booking-form-fields`);
        if (cancelled) return;
        setBookingFieldDefs(Array.isArray(res?.data) ? res.data : []);
      } catch {
        if (!cancelled) setBookingFieldDefs([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [booking]);

  useEffect(() => {
    if (!booking) return;
    let cancelled = false;
    const run = async () => {
      setStaffLoading(true);
      try {
        const res = await axios.get(`${API}/staff`);
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.staff) ? res.data.staff : [];
        setStaffList(list);
      } catch {
        if (!cancelled) setStaffList([]);
      } finally {
        if (!cancelled) setStaffLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [booking]);

  const isPhotoBooth = String(business?.industry || 'photobooth') === 'photobooth';
  const boothTypes = Array.isArray(business?.booth_types) && business.booth_types.length
    ? business.booth_types
    : ['Open Booth', 'Glam Booth', 'Enclosed Booth'];

  const paymentStatusOptions = [
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'deposit_paid', label: 'Deposit Paid' },
    { value: 'paid_in_full', label: 'Paid in Full' },
  ];

  const paymentMethodOptions = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'online', label: 'Online' },
    { value: 'other', label: 'Other' },
  ];

  const activeStaff = staffList.filter((member) => member?.is_active !== false);
  const assignedStaff = staffList.find((member) => String(member?.id || '') === String(currentBooking?.staff_id || ''));
  const staffOptions = assignedStaff && assignedStaff.is_active === false
    ? [...activeStaff, assignedStaff]
    : activeStaff;

  const updateBooking = async (updates, { successMessage } = {}) => {
    if (!currentBooking?.id) return null;
    try {
      const res = await axios.put(`${API}/bookings/${currentBooking.id}`, updates);
      const next = res?.data || null;
      if (next) setCurrentBooking(next);
      if (successMessage) toast.success(successMessage);
      return next;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update booking');
      return null;
    }
  };

  const handleEditSave = async () => {
    if (!currentBooking?.id) return;
    const updates = {
      booking_date: editData.booking_date || '',
      booking_time: editData.booking_time || '',
      price: editData.price === '' ? '' : Number(editData.price || 0),
      notes: editData.notes || '',
      ...(isPhotoBooth
        ? { booth_type: editData.booth_type || '' }
        : { service_type: editData.service_type || '' }),
    };

    setSavingEdit(true);
    const next = await updateBooking(updates, { successMessage: 'Booking updated' });
    if (next) {
      setIsEditing(false);
      setEditData({
        booking_date: next?.booking_date || '',
        booking_time: next?.booking_time || '',
        booth_type: next?.booth_type || '',
        service_type: next?.service_type || '',
        price: next?.price ?? '',
        notes: next?.notes || '',
      });
    }
    setSavingEdit(false);
  };

  const handlePaymentUpdate = async (updates) => {
    setSavingPayment(true);
    await updateBooking(updates);
    setSavingPayment(false);
  };

  const handleSendInvoice = async () => {
    if (!currentBooking?.id) return;
    setSendingInvoice(true);
    try {
      await axios.post(`${API}/bookings/${currentBooking.id}/send-invoice`);
      toast.success(`Invoice sent to ${currentBooking.customer_email}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send invoice');
    } finally {
      setSendingInvoice(false);
    }
  };

  const handleAssignStaff = async () => {
    if (!currentBooking?.id) return;
    setAssigningStaff(true);
    const updates = {
      staff_id: staffSelection || null,
      backdrop_notes: backdropNotes || '',
    };
    const successMessage = staffSelection ? 'Staff assigned' : 'Staff updated';
    const next = await updateBooking(updates, { successMessage });
    if (next) {
      setStaffSelection(next?.staff_id || '');
      setBackdropNotes(next?.backdrop_notes || '');
    }
    setAssigningStaff(false);
  };

  const handleRemoveStaff = async () => {
    if (!currentBooking?.id) return;
    setAssigningStaff(true);
    const next = await updateBooking({ staff_id: null }, { successMessage: 'Staff removed' });
    if (next) {
      setStaffSelection('');
    }
    setAssigningStaff(false);
  };

  const lineItems = Array.isArray(currentBooking?.line_items) ? currentBooking.line_items : [];
  const baseItem = lineItems.length ? lineItems[0] : null;
  const travelLabel = String(business?.travel_fee_label || 'Travel charge').trim().toLowerCase();
  const cbdLabel = String(business?.cbd_fee_label || 'CBD logistics').trim().toLowerCase();
  const travelItem = lineItems.find((item, idx) =>
    idx !== 0 && String(item?.description || '').toLowerCase().includes(travelLabel),
  );
  const cbdItem = lineItems.find((item, idx) =>
    idx !== 0 && String(item?.description || '').toLowerCase().includes(cbdLabel),
  );
  const addonItems = lineItems.filter((item, idx) =>
    item && idx !== 0 && item !== travelItem && item !== cbdItem,
  );

  const lineItemTotal = (item) => {
    if (!item) return 0;
    const raw =
      item?.total !== undefined && item?.total !== null
        ? Number(item.total)
        : item?.amount !== undefined && item?.amount !== null
          ? Number(item.amount)
          : Number(item?.unit_price || 0) * Math.max(1, Number(item?.qty || 1));
    return Number.isFinite(raw) ? raw : 0;
  };

  const bookingStatus = String(currentBooking?.status || 'confirmed').toLowerCase();
  const invoiceNumber =
    currentBooking?.invoice_id || `INV-${String(currentBooking?.id || '').slice(0, 8).toUpperCase()}`;
  const totalAmount = Number(currentBooking?.total_amount ?? bookingTotalAmount(currentBooking)).toFixed(2);

  return (
    <Dialog open={!!booking} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent
        data-testid="booking-detail-dialog"
        className="max-w-lg max-h-[85vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{currentBooking?.customer_name || 'Booking Details'}</DialogTitle>
          <p className="text-sm text-muted-foreground">{invoiceNumber}</p>
        </DialogHeader>

        {currentBooking && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-end gap-2 mt-4">
              {!isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditData({
                        booking_date: currentBooking?.booking_date || '',
                        booking_time: currentBooking?.booking_time || '',
                        booth_type: currentBooking?.booth_type || '',
                        service_type: currentBooking?.service_type || '',
                        price: currentBooking?.price ?? '',
                        notes: currentBooking?.notes || '',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingEdit}
                    onClick={handleEditSave}
                  >
                    {savingEdit ? 'Saving…' : 'Save'}
                  </Button>
                </>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Booking Details
              </p>
              <div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Service</span>
                  {isEditing ? (
                    isPhotoBooth ? (
                      <Select
                        value={editData.booth_type || ''}
                        onValueChange={(val) => setEditData((prev) => ({ ...prev, booth_type: val }))}
                      >
                        <SelectTrigger className="h-9 w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {boothTypes.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={editData.service_type}
                        onChange={(e) => setEditData((prev) => ({ ...prev, service_type: e.target.value }))}
                        className="h-9 w-[200px]"
                      />
                    )
                  ) : (
                    <span className="text-sm font-medium">{currentBooking.booth_type || currentBooking.service_type}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Date</span>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editData.booking_date}
                      onChange={(e) => setEditData((prev) => ({ ...prev, booking_date: e.target.value }))}
                      className="h-9 w-[200px]"
                    />
                  ) : (
                    <span className="text-sm font-medium">{currentBooking.booking_date}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Time</span>
                  {isEditing ? (
                    <Input
                      type="time"
                      value={editData.booking_time}
                      onChange={(e) => setEditData((prev) => ({ ...prev, booking_time: e.target.value }))}
                      className="h-9 w-[200px]"
                    />
                  ) : (
                    <span className="text-sm font-medium">{currentBooking.booking_time}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Price</span>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editData.price}
                      onChange={(e) => setEditData((prev) => ({ ...prev, price: e.target.value }))}
                      className="h-9 w-[200px]"
                    />
                  ) : (
                    <span className="text-sm font-medium text-primary">
                      ${bookingTotalAmount(currentBooking).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="text-sm font-medium">
                    {Math.round((Number(currentBooking.duration_minutes) || 60) / 60 * 10) / 10} hours
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="outline" className={bookingStatusBadgeClass(bookingStatus)}>
                    {bookingStatus}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{currentBooking.customer_email}</span>
                </div>
                {currentBooking.customer_phone ? (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Phone</span>
                    <span className="text-sm font-medium">{currentBooking.customer_phone}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <Separator className="my-4" />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Payment
              </p>
              <div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-sm font-medium text-primary">${totalAmount}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Payment status</span>
                  <Select
                    value={String(currentBooking?.payment_status || 'unpaid').toLowerCase()}
                    onValueChange={(val) => handlePaymentUpdate({ payment_status: val })}
                    disabled={savingPayment}
                  >
                    <SelectTrigger className="h-9 w-[200px]">
                      <SelectValue placeholder="Payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentStatusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Payment method</span>
                  <Select
                    value={currentBooking?.payment_method ? String(currentBooking.payment_method).toLowerCase() : undefined}
                    onValueChange={(val) => handlePaymentUpdate({ payment_method: val })}
                    disabled={savingPayment}
                  >
                    <SelectTrigger className="h-9 w-[200px]">
                      <SelectValue placeholder="Payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Staff
              </p>
              <div>
                {assignedStaff ? (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Assigned to</span>
                    <span className="text-sm font-medium text-foreground">{assignedStaff.name}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Assigned to</span>
                    <span className="text-sm font-medium text-foreground">No staff assigned yet.</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Select staff</span>
                  <Select
                    value={staffSelection || ''}
                    onValueChange={(val) => setStaffSelection(val)}
                    disabled={staffLoading}
                  >
                    <SelectTrigger className="h-9 w-[200px]">
                      <SelectValue placeholder="Select staff member (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffOptions.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} {member.email ? `(${member.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={assigningStaff || staffLoading}
                    onClick={handleAssignStaff}
                  >
                    {assigningStaff ? 'Saving...' : 'Assign'}
                  </Button>
                  {currentBooking?.staff_id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRemoveStaff}
                      disabled={assigningStaff}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                {staffLoading ? (
                  <div className="text-xs text-muted-foreground mt-2">Loading staff members...</div>
                ) : staffOptions.length === 0 ? (
                  <div className="text-xs text-muted-foreground mt-2">No active staff members yet.</div>
                ) : null}
                <div className="grid gap-2 mb-4">
                  <Label className="text-sm">Backdrop / Setup Details (optional)</Label>
                  <Textarea
                    value={backdropNotes}
                    onChange={(e) => setBackdropNotes(e.target.value)}
                    className="min-h-[96px]"
                    placeholder="e.g. White floral backdrop, gold frame, fairy lights"
                  />
                </div>
              </div>
            </div>

            {(currentBooking.notes || isEditing) && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Notes
                  </p>
                  {isEditing ? (
                    <Textarea
                      value={editData.notes}
                      onChange={(e) => setEditData((prev) => ({ ...prev, notes: e.target.value }))}
                      className="min-h-[96px]"
                    />
                  ) : (
                    <p className="text-sm">{currentBooking.notes}</p>
                  )}
                </div>
              </>
            )}

            <Separator className="my-4" />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Charges
              </p>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between p-3 text-sm">
                    <span className="text-muted-foreground">
                      {baseItem?.description || currentBooking.booth_type || currentBooking.service_type || 'Service'}
                    </span>
                    <span className="font-medium">
                      ${lineItemTotal(baseItem || {
                        unit_price: currentBooking?.price || 0,
                        qty: currentBooking?.quantity || 1,
                        total: (Number(currentBooking?.price || 0) * Math.max(1, Number(currentBooking?.quantity || 1))),
                      }).toFixed(2)}
                    </span>
                  </div>
                  {travelItem ? (
                    <div className="flex items-center justify-between p-3 text-sm">
                      <span className="text-muted-foreground">{travelItem.description || 'Travel fee'}</span>
                      <span className="font-medium">${lineItemTotal(travelItem).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {cbdItem ? (
                    <div className="flex items-center justify-between p-3 text-sm">
                      <span className="text-muted-foreground">{cbdItem.description || 'CBD logistics fee'}</span>
                      <span className="font-medium">${lineItemTotal(cbdItem).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {addonItems.map((item, idx) => (
                    <div key={`${item?.description || 'addon'}-${idx}`} className="flex items-center justify-between p-3 text-sm">
                      <span className="text-muted-foreground">{item?.description || 'Add-on'}</span>
                      <span className="font-medium">${lineItemTotal(item).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 text-sm font-semibold">
                    <span>Total amount</span>
                    <span>${totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>

            {currentBooking?.custom_fields && typeof currentBooking.custom_fields === "object" && Object.keys(currentBooking.custom_fields).length ? (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Custom Fields
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="divide-y divide-border">
                      {Object.entries(currentBooking.custom_fields || {}).map(([k, v]) => {
                        const key = String(k || "").trim();
                        if (!key) return null;
                        const def = (bookingFieldDefs || []).find((d) => String(d?.field_key || "").trim() === key);
                        const label = String(def?.field_name || "")
                          ? String(def.field_name)
                          : key.replaceAll(/[_-]+/g, " ").replaceAll(/\s+/g, " ").trim();
                        const isPrivate = Boolean(def?.is_private);
                        const value =
                          Array.isArray(v) ? `${v.filter(Boolean).length} file(s)` : (v === true ? "Yes" : v === false ? "No" : String(v ?? ""));
                        return (
                          <div key={key} className="p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold">
                                {label}
                              </div>
                              {isPrivate ? (
                                <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                  Private
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground break-words">{value}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            <Separator className="my-4" />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Actions
              </p>
              <div className="space-y-2">
                <Button
                  data-testid="download-invoice-btn"
                  onClick={async () => {
                    try {
                      const res = await axios.get(`${API}/invoices/pdf/${currentBooking.id}`, {
                        responseType: 'blob',
                      });
                      const blob = res?.data;
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${invoiceNumber}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                      toast.success('Invoice downloaded!');
                    } catch (e) {
                      toast.error('Failed to generate invoice PDF');
                    }
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Download PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={sendingInvoice}
                  onClick={handleSendInvoice}
                >
                  {sendingInvoice ? 'Sending…' : 'Send Invoice'}
                </Button>
                {String(currentBooking?.customer_email || '').trim() && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={requestingReview}
                    onClick={async () => {
                      setRequestingReview(true);
                      try {
                        const res = await axios.post(
                          `${API}/reviews/request`,
                          { booking_id: currentBooking.id },
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
                        if (e?.response?.status === 409) {
                          const url = e?.response?.data?.url;
                          const skipped = Boolean(e?.response?.data?.email?.skipped);
                          if (skipped && url) {
                            try {
                              await navigator.clipboard.writeText(url);
                              toast.success('Review link copied (email not sent)');
                            } catch {
                              toast.success('Review link created');
                            }
                          } else {
                            toast.success('Review request already sent');
                          }
                          return;
                        }
                        toast.error(e.response?.data?.detail || 'Failed to request review');
                      } finally {
                        setRequestingReview(false);
                      }
                    }}
                  >
                    {requestingReview ? 'Sending…' : 'Request Review'}
                  </Button>
                )}
                <Button
                  type="button"
                  variant={bookingStatus === 'cancelled' ? 'outline' : 'destructive'}
                  className="w-full"
                  disabled={updatingStatus}
                  onClick={async () => {
                    const isCancelled = bookingStatus === 'cancelled';
                    const next = isCancelled ? 'confirmed' : 'cancelled';
                    const ok = window.confirm(
                      isCancelled
                        ? 'Mark this booking as confirmed again?'
                        : 'Mark this booking as cancelled?',
                    );
                    if (!ok) return;
                    setUpdatingStatus(true);
                    try {
                      await axios.put(
                        `${API}/bookings/${currentBooking.id}`,
                        { status: next },
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
                  {bookingStatus === 'cancelled' ? 'Restore Booking' : 'Cancel Booking'}
                </Button>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Invoice: {invoiceNumber}
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
  heroDescription = 'DoBook is an all-in-one online booking system and appointment scheduling software for service businesses. Manage appointments, clients, invoices, reminders, and payments — free or Pro plans available.',
  getStartedHref = '/auth',
  startFreeHref = '/auth?mode=signup&plan=free',
  customerHref = '/discover',
} = {}) => {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState({ authed: false, business: null });
  const [heroPreviewTab, setHeroPreviewTab] = useState('bookings');
  const [productPreviewTab, setProductPreviewTab] = useState('bookings');
  const [platformReviews, setPlatformReviews] = useState([]);

  const isAuthed = authReady && Boolean(session?.authed);
  const businessName = String(session?.business?.business_name || session?.business?.email || '').trim();
  const avatarUrl = String(session?.business?.logo_url || '').trim();

  const initials = useMemo(() => {
    const value = String(businessName || '').trim();
    if (!value) return 'DB';
    const parts = value.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || '';
    const b = parts.length > 1 ? parts[1]?.[0] || '' : parts[0]?.[1] || '';
    const out = `${a}${b}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return out || 'DB';
  }, [businessName]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET", credentials: "include" });
        if (cancelled) return;
        if (!res.ok) {
          setSession({ authed: false, business: null });
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setSession({ authed: true, business: data?.business || null });
      } catch {
        if (!cancelled) setSession({ authed: false, business: null });
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const uiPreviewTabs = [
    { id: 'bookings', label: 'Bookings' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'invoices', label: 'Invoices' },
  ];

  const tabClass = (active) =>
    `h-9 px-3 rounded-full text-xs font-semibold border transition-colors ${
      active
        ? 'bg-rose-600 border-rose-600 text-white'
        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
    }`;


  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(`${API}/public/platform-reviews`, { method: 'GET' });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setPlatformReviews(Array.isArray(json) ? json : []);
      } catch {
        // ignore
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  function UiPreviewContent({ tab }) {
    const normalizedTab = new Set(['bookings', 'calendar', 'invoices']).has(tab) ? tab : 'bookings';
    const Sidebar = () => (
      <div className="hidden sm:block w-44 shrink-0 border-r border-zinc-200 bg-white">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-rose-600" aria-hidden="true" />
            <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              DoBook
            </div>
          </div>
        </div>
        <div className="px-3 pb-4 space-y-1 text-xs" style={{ fontFamily: 'Inter' }}>
          {[
            { id: 'bookings', label: 'Bookings' },
            { id: 'calendar', label: 'Calendar View' },
            { id: 'invoices', label: 'Invoice Templates' },
          ].map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
                normalizedTab === item.id
                  ? 'bg-rose-50 border-rose-100 text-rose-700'
                  : 'bg-white border-transparent text-zinc-700'
              }`}
            >
              <span className="font-medium">{item.label}</span>
              {normalizedTab === item.id ? <span className="text-[10px] font-semibold">Active</span> : null}
            </div>
          ))}
        </div>
      </div>
    );

    if (normalizedTab === 'bookings') {
      return (
        <div className="flex min-h-[22rem]">
          <Sidebar />
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                  All bookings
                </div>
                <div className="text-xs text-zinc-500" style={{ fontFamily: 'Inter' }}>
                  Manage appointments in one list
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-9 w-24 rounded-full bg-rose-600 text-white text-xs font-semibold flex items-center justify-center">
                  + Add booking
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
              <div className="grid grid-cols-6 gap-2 px-4 py-3 text-[11px] font-semibold text-zinc-500 border-b border-zinc-200">
                <div className="col-span-2">Customer</div>
                <div className="col-span-2">Service</div>
                <div>Date</div>
                <div>Status</div>
              </div>
              {[
                { name: 'Alex Morgan', service: 'Consultation', date: '2026-03-26', tone: 'success', status: 'confirmed' },
                { name: 'Priya Singh', service: 'Follow-up', date: '2026-03-07', tone: 'success', status: 'confirmed' },
                { name: 'Chris Lee', service: 'Session', date: '2026-02-21', tone: 'danger', status: 'cancelled' },
                { name: 'Jordan Park', service: 'Initial', date: '2026-02-17', tone: 'success', status: 'confirmed' },
              ].map((row) => (
                <div key={`${row.name}-${row.date}`} className="grid grid-cols-6 gap-2 px-4 py-3 text-xs text-zinc-700 border-b border-zinc-100 last:border-b-0">
                  <div className="col-span-2">
                    <div className="font-semibold text-zinc-900">{row.name}</div>
                    <div className="text-[11px] text-zinc-500">client@email.com</div>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <div className="font-medium">{row.service}</div>
                  </div>
                  <div className="flex items-center text-[11px] text-zinc-600">{row.date}</div>
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className={bookingStatusBadgeClass(String(row.status || 'confirmed').toLowerCase())}
                    >
                      {String(row.status || 'confirmed').toLowerCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (normalizedTab === 'calendar') {
      return (
        <div className="flex min-h-[22rem]">
          <Sidebar />
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                  Calendar view
                </div>
                <div className="text-xs text-zinc-500" style={{ fontFamily: 'Inter' }}>
                  Month / week / day scheduling
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-9 w-24 rounded-full bg-rose-600 text-white text-xs font-semibold flex items-center justify-center">
                  Month
                </div>
                <div className="h-9 w-24 rounded-full border border-zinc-200 bg-white text-zinc-700 text-xs font-semibold flex items-center justify-center">
                  Week
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="grid grid-cols-7 gap-2 text-[10px] font-semibold text-zinc-500 px-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-center">{d}</div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {Array.from({ length: 28 }).map((_, i) => {
                  const day = i + 1;
                  const hasEvent = day === 17 || day === 19 || day === 20 || day === 28;
                  return (
                    <div
                      key={day}
                      className={`h-16 rounded-xl border border-zinc-200 bg-zinc-50 p-2 ${
                        day === 22 ? 'bg-rose-50 border-rose-100' : ''
                      }`}
                    >
                      <div className="text-[10px] font-semibold text-zinc-600">{String(day).padStart(2, '0')}</div>
                      {hasEvent ? (
                        <div className="mt-2 h-4 rounded-full bg-rose-600/90" aria-hidden="true" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (normalizedTab === 'invoices') {
      return (
        <div className="flex min-h-[22rem]">
          <Sidebar />
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                  Invoice templates
                </div>
                <div className="text-xs text-zinc-500" style={{ fontFamily: 'Inter' }}>
                  Choose a style that fits your brand
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-9 w-28 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center justify-center">
                  Active: Sidebar
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { name: 'Classic', accent: 'bg-zinc-900' },
                { name: 'Clean', accent: 'bg-zinc-200' },
                { name: 'Gradient', accent: 'bg-gradient-to-r from-rose-600 to-violet-600' },
                { name: 'Sidebar', accent: 'bg-zinc-800 ring-2 ring-rose-200' },
              ].map((t) => (
                <div key={t.name} className="rounded-2xl border border-zinc-200 bg-white p-3">
                  <div className={`h-8 rounded-xl ${t.accent}`} aria-hidden="true" />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>{t.name}</div>
                    {t.name === 'Sidebar' ? (
                      <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">
                        Selected
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 h-10 rounded-xl bg-zinc-50 border border-zinc-200" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <style>{`html{scroll-behavior:smooth} @media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}}`}</style>
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-3 flex items-center justify-between gap-3">
          <a
            href="/"
            className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200"
            aria-label="DoBook home"
            onClick={(e) => {
              if (typeof window !== 'undefined' && window.location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              e.preventDefault();
              router.push('/');
            }}
          >
            <img
              src={DOBOOK_LOGO_PNG}
              alt="DoBook"
              className="h-[68px] md:h-[76px] w-auto object-contain select-none"
              draggable={false}
              onError={(e) => {
                e.currentTarget.src = DOBOOK_LOGO_SVG;
              }}
            />
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-700 dark:text-zinc-200" aria-label="Primary">
            <a className="hover:text-zinc-900 dark:hover:text-white" href="#features">Features</a>
            <a className="hover:text-zinc-900 dark:hover:text-white" href="#how">How it works</a>
            <a className="hover:text-zinc-900 dark:hover:text-white" href="#pricing">Pricing</a>
            <a className="hover:text-zinc-900 dark:hover:text-white" href="#faq">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <ThemeModeToggle
              showLabel={false}
              className="h-11 w-11 p-0 rounded-full border-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(customerHref)}
              className="h-11 px-4 rounded-lg text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/50"
            >
              Find services
            </Button>

            {authReady ? (
              isAuthed ? (
                <>
                  <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5">
                    <Avatar className="h-9 w-9">
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt={businessName || 'DoBook profile'} /> : null}
                      <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="max-w-[14rem]">
                      <div className="text-xs font-semibold text-zinc-900 truncate" style={{ fontFamily: 'Manrope' }}>
                        {businessName || 'Your account'}
                      </div>
                      <div className="text-[11px] text-zinc-500">Logged in</div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    Open dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    data-testid="login-btn"
                    type="button"
                    variant="outline"
                    onClick={() => router.push(getStartedHref)}
                    className="h-11 px-5 rounded-lg border-zinc-200"
                  >
                    Login
                  </Button>
                  <Button
                    data-testid="get-started-btn"
                    type="button"
                    onClick={() => router.push(startFreeHref)}
                    className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    Start Free (Business)
                  </Button>
                </>
              )
            ) : null}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeModeToggle
              showLabel={false}
              className="h-11 w-11 p-0 rounded-full border-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
            />
            <details className="relative">
              <summary className="list-none cursor-pointer">
                <span className="sr-only">Open menu</span>
                <div className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 dark:border-zinc-800/60 dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-zinc-800/50">
                  <List className="h-4 w-4" />
                  Menu
                </div>
              </summary>
              <div className="absolute right-0 mt-2 w-[min(92vw,22rem)] rounded-2xl border border-zinc-200 bg-white shadow-lg p-3 dark:border-zinc-800/60 dark:bg-zinc-950">
                <div className="grid gap-1">
                  <a className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50" href="#features">
                    Features
                  </a>
                  <a className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50" href="#how">
                    How it works
                  </a>
                  <a className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50" href="#pricing">
                    Pricing
                  </a>
                  <a className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50" href="#faq">
                    FAQ
                  </a>
                </div>
                <div className="mt-2 grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
                    onClick={() => router.push(customerHref)}
                  >
                    Find services near me
                  </Button>
                  {authReady ? (
                    isAuthed ? (
                      <Button
                        type="button"
                        className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                        onClick={() => router.push('/dashboard')}
                      >
                        Open dashboard
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
                          onClick={() => router.push(getStartedHref)}
                        >
                          Business login
                        </Button>
                        <Button
                          type="button"
                          className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                          onClick={() => router.push(startFreeHref)}
                        >
                          Start Free (Business)
                        </Button>
                      </>
                    )
                  ) : null}
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-14 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
              <span className="inline-flex h-2 w-2 rounded-full bg-rose-600" aria-hidden="true" />
              Online booking system · appointment scheduling software
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              {heroPrefix} <span className="text-rose-600">{heroAccent}</span>
            </h1>

            <p className="mt-4 text-lg text-zinc-600" style={{ fontFamily: 'Inter' }}>
              {heroDescription}
            </p>

            <ul className="mt-6 grid gap-3 text-sm text-zinc-700" style={{ fontFamily: 'Inter' }} aria-label="Key benefits">
              <li className="flex gap-3"><span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span>Fill your calendar with <strong className="text-zinc-900">24/7 online bookings</strong>.</li>
              <li className="flex gap-3"><span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span>Reduce no‑shows with <strong className="text-zinc-900">email & SMS reminders</strong>.</li>
              <li className="flex gap-3"><span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span>Get paid faster with <strong className="text-zinc-900">online payments</strong>.</li>
              <li className="flex gap-3"><span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span>Look professional with <strong className="text-zinc-900">invoice PDFs</strong>.</li>
            </ul>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button
                data-testid="hero-get-started-btn"
                type="button"
                onClick={() => router.push(isAuthed ? '/dashboard' : startFreeHref)}
                className="h-14 px-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                {isAuthed ? 'Open dashboard' : 'Start Free (Business)'}
              </Button>
              <Button
                data-testid="hero-customer-btn"
                type="button"
                variant="outline"
                onClick={() => router.push(customerHref)}
                className="h-14 px-10 rounded-xl border-zinc-200"
              >
                Find services near me
              </Button>
            </div>

            <div className="mt-3 text-xs text-zinc-500" style={{ fontFamily: 'Inter' }}>
              No credit card required for Free. Upgrade anytime.
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div>
                <div className="text-xs font-medium text-zinc-500">Trust</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">Used by 1,000+ businesses</div>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500">Built for</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">Local service teams</div>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500">Setup</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">~5 minutes</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
                <div className="flex items-center gap-2" aria-hidden="true">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs font-medium text-zinc-500">UI preview</div>
                  <span className="hidden sm:inline text-[11px] text-zinc-400">·</span>
                  <div className="hidden sm:flex items-center gap-2" role="tablist" aria-label="UI preview tabs">
                    {uiPreviewTabs.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={heroPreviewTab === t.id}
                        className={tabClass(heroPreviewTab === t.id)}
                        onClick={() => setHeroPreviewTab(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 bg-zinc-50">
                <div className="sm:hidden flex flex-wrap gap-2 mb-4" role="tablist" aria-label="UI preview tabs">
                  {uiPreviewTabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={heroPreviewTab === t.id}
                      className={tabClass(heroPreviewTab === t.id)}
                      onClick={() => setHeroPreviewTab(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                  <UiPreviewContent tab={heroPreviewTab} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      {/* Social proof section removed */}

      {/* Features Section */}
      <section id="who-for" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
            Who DoBook is for
          </h2>
          <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
            Built for small to medium service businesses that want a booking system for small business needs—fast setup, clear schedules, and happier customers.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Salons', desc: 'Appointments, staff schedules, repeat clients, and add‑on services—organized.' },
            { title: 'Medical / Wellness', desc: 'Reduce no‑shows with reminders and keep client history at your fingertips.' },
            { title: 'Consultants', desc: 'Share a link, book paid sessions, and send invoice PDFs automatically.' },
            { title: 'Education / Tutoring', desc: 'Run recurring sessions, manage families, and stay on top of payments.' },
            { title: 'Home services', desc: 'Capture job details, route bookings, and keep a clean calendar.' },
            { title: 'Freelancers', desc: 'Look professional from day one with client-friendly booking and invoices.' },
          ].map((item) => (
            <Card key={item.title} className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
              <CardContent className="p-6 space-y-2">
                <div className="text-base font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>{item.title}</div>
                <div className="text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>{item.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="features" className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              Key features that drive bookings (and reduce admin)
            </h2>
            <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
              Everything you expect from modern appointment scheduling software—plus the essentials service businesses need day to day.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Calendar, title: 'Smart calendar & scheduling', desc: 'Availability rules, buffers, and clean views that prevent double bookings.' },
              { icon: FileText, title: 'Automatic invoicing (PDF)', desc: 'Generate invoices from bookings and share professional PDF invoices in seconds.' },
              { icon: Bell, title: 'Email & SMS reminders', desc: 'Reduce no‑shows with confirmations, reminders, and follow-ups automatically.' },
              { icon: CreditCard, title: 'Online payments', desc: 'Accept deposits or full payment at booking so cash flow stays predictable.' },
              { icon: Users, title: 'Client management', desc: 'Keep customer history, notes, and contact details organized for better service.' },
              { icon: BarChart3, title: 'Analytics dashboard', desc: 'See revenue trends, top services, and booking patterns at a glance.' },
              { icon: Link2, title: 'Embed booking widget', desc: 'Add “Book now” to your website so clients can schedule without leaving your brand.' },
              { icon: Smartphone, title: 'Mobile‑friendly booking', desc: 'A fast booking flow designed for phones—where most customers book.' },
              { icon: MessageSquare, title: 'Multi‑staff support', desc: 'Assign services to staff and manage schedules as you grow.' },
            ].map((f) => (
              <Card key={f.title} className="bg-white border border-zinc-200 shadow-sm rounded-2xl hover:border-rose-200 transition-colors">
                <CardHeader className="space-y-3">
                  <div className="h-12 w-12 bg-rose-100 rounded-2xl flex items-center justify-center">
                    <f.icon className="h-6 w-6 text-rose-700" aria-hidden="true" />
                  </div>
                  <CardTitle style={{ fontFamily: 'Manrope' }}>{f.title}</CardTitle>
                  <CardDescription style={{ fontFamily: 'Inter' }}>{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
            How it works
          </h2>
          <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
            A simple flow designed for real service business scheduling—set up once, then let customers book themselves.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 lg:grid-cols-4" aria-label="How DoBook works">
          {[
            { step: 'Step 1', title: 'Set up your services', desc: 'Add durations, pricing, staff, and availability.' },
            { step: 'Step 2', title: 'Share your booking link', desc: 'Post it on your site, socials, Google, or email.' },
            { step: 'Step 3', title: 'Customers book instantly', desc: 'Clients choose a time, pay (optional), and get confirmed.' },
            { step: 'Step 4', title: 'Get paid & manage clients', desc: 'Invoices, reminders, and client history—organized.' },
          ].map((s) => (
            <Card key={s.step} className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
              <CardContent className="p-6 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">{s.step}</div>
                <div className="text-base font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>{s.title}</div>
                <div className="text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>{s.desc}</div>
              </CardContent>
            </Card>
          ))}
        </ol>
      </section>

      {/* Product screenshots / UI preview */}
      <section id="preview" className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              Product preview
            </h2>
            <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
              A quick look at the core screens: bookings, calendar, and invoice templates.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Product preview tabs">
            {uiPreviewTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={productPreviewTab === t.id}
                className={tabClass(productPreviewTab === t.id)}
                onClick={() => setProductPreviewTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 shadow-sm overflow-hidden">
            <UiPreviewContent tab={productPreviewTab} />
          </div>
        </div>
      </section>

      {/* Why choose DoBook */}
      <section id="why" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
            Why choose DoBook
          </h2>
          <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
            DoBook is built for local service businesses—simpler than complex systems, affordable, and truly all‑in‑one.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {[
            { title: 'Simpler than complex systems', desc: 'Clean defaults and a guided setup that gets you live quickly.' },
            { title: 'Affordable pricing', desc: 'Start free, then upgrade when automation and unlimited bookings matter.' },
            { title: 'Built for local businesses', desc: 'Perfect for salons, clinics, consultants, tutors, repairs, and freelancers.' },
            { title: 'All‑in‑one (no extra tools)', desc: 'Scheduling, reminders, invoices, and payments—together so nothing falls through.' },
            { title: 'Fast setup (minutes)', desc: 'Add services, set availability, share your link—done.' },
          ].map((d) => (
            <Card key={d.title} className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
              <CardContent className="p-6 space-y-2">
                <div className="text-base font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>{d.title}</div>
                <div className="text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>{d.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Find services near me (secondary goal) */}
      <section id="find" className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                Find services near me
              </h2>
              <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
                Customers can search for nearby businesses and book instantly. (Search routes to the DoBook directory.)
              </p>

              <form
                className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const q = String(form.get('q') || '').trim();
                  const postcode = String(form.get('postcode') || '').trim();
                  const query = new URLSearchParams();
                  if (q) query.set('q', q);
                  if (postcode) query.set('postcode', postcode);
                  router.push(`/discover${query.toString() ? `?${query.toString()}` : ''}`);
                }}
                aria-label="Find services"
              >
                <div className="grid gap-3 sm:grid-cols-5">
                  <div className="sm:col-span-3">
                    <label className="text-xs font-semibold text-zinc-700" htmlFor="discover_q">Service</label>
                    <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3">
                      <MapPin className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                      <input
                        id="discover_q"
                        name="q"
                        type="text"
                        placeholder="e.g., barber, physio, tutor"
                        className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-zinc-700" htmlFor="discover_postcode">Postcode</label>
                    <input
                      id="discover_postcode"
                      name="postcode"
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g., 2000"
                      className="mt-1 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                    />
                  </div>
                </div>
                <Button type="submit" className="mt-3 h-11 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold">
                  Search
                </Button>
              </form>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
                <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                  Nearby businesses
                </div>
                <div className="mt-4 grid gap-3">
                  {[
                    { name: 'Northside Barber Co.', meta: 'Barber · 1.2 km away' },
                    { name: 'Calm Path Therapy', meta: 'Wellness · 2.6 km away' },
                    { name: 'Ace Math Tutoring', meta: 'Tutoring · 3.9 km away' },
                  ].map((r) => (
                    <div key={r.name} className="rounded-2xl bg-white border border-zinc-200 p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-900">{r.name}</div>
                        <div className="mt-1 text-xs text-zinc-500">{r.meta}</div>
                      </div>
                      <Button type="button" className="h-10 rounded-lg bg-rose-600 hover:bg-rose-700 text-white" onClick={() => router.push(customerHref)}>
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
            Pricing
          </h2>
          <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
            Two plans. No surprises. Upgrade when you want invoice PDFs, reminders, and unlimited bookings.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          <Card className="bg-white border border-zinc-200 shadow-sm rounded-3xl">
            <CardHeader className="space-y-2">
              <CardTitle style={{ fontFamily: 'Manrope' }}>FREE</CardTitle>
              <CardDescription style={{ fontFamily: 'Inter' }}>
                <span className="text-3xl font-bold text-zinc-900">$0</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="text-sm text-zinc-700 space-y-2" style={{ fontFamily: 'Inter' }} aria-label="Free plan">
                <li>• Up to 10 bookings/month</li>
                <li>• Confirmation emails</li>
                <li>• Calendar + dashboard</li>
                <li>• No automated reminders or invoice PDFs</li>
              </ul>
              <Button
                type="button"
                onClick={() => router.push(isAuthed ? '/dashboard' : startFreeHref)}
                className="w-full h-12 bg-rose-600 hover:bg-rose-700 rounded-xl font-semibold text-white"
              >
                {isAuthed ? 'Open dashboard' : 'Start Free (Business)'}
              </Button>
              <div className="text-xs text-zinc-500 text-center" style={{ fontFamily: 'Inter' }}>No credit card required.</div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-rose-200 shadow-sm rounded-3xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-40 w-40 bg-rose-100 rounded-full blur-2xl" aria-hidden="true" />
            <CardHeader className="space-y-2">
              <CardTitle style={{ fontFamily: 'Manrope' }}>PRO</CardTitle>
              <CardDescription style={{ fontFamily: 'Inter' }}>
                <span className="text-3xl font-bold text-zinc-900">${PRO_PRICE_AUD}</span>{' '}
                <span className="text-sm font-medium text-zinc-600">AUD/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="text-sm text-zinc-700 space-y-2" style={{ fontFamily: 'Inter' }} aria-label="Pro plan">
                <li>• Unlimited bookings</li>
                <li>• Unlimited invoice templates</li>
                <li>• Invoice PDFs</li>
                <li>• Client reminders</li>
                <li>• Priority support</li>
              </ul>
              <Button
                type="button"
                onClick={() => router.push(isAuthed ? '/dashboard' : '/auth?plan=pro')}
                className="w-full h-12 bg-rose-600 hover:bg-rose-700 rounded-xl font-semibold text-white"
              >
                {isAuthed ? 'Open dashboard' : 'Choose Pro'}
              </Button>
              <div className="text-xs text-zinc-500 text-center" style={{ fontFamily: 'Inter' }}>Cancel anytime.</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              What businesses say
            </h2>
            <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
              Reviews from businesses using DoBook.
            </p>
          </div>

          {Array.isArray(platformReviews) && platformReviews.length ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {platformReviews.slice(0, 6).map((r) => (
                <Card key={r.id} className="bg-zinc-50 border border-zinc-200 shadow-sm rounded-3xl">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-zinc-900 truncate" style={{ fontFamily: 'Manrope' }}>
                        {r.business_name || 'Business'}
                      </div>
                      <div className="text-sm text-zinc-700" aria-label={`Rating ${r.rating || 0} out of 5`}>
                        {'★'.repeat(Math.max(0, Math.min(5, Number(r.rating || 0))))}
                      </div>
                    </div>
                    <div className="text-sm text-zinc-700 leading-6 whitespace-pre-line" style={{ fontFamily: 'Inter' }}>
                      {r.comment}
                    </div>
                    {r.created_at ? (
                      <div className="text-xs text-zinc-500" style={{ fontFamily: 'Inter' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-zinc-200 bg-zinc-50 p-8 text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>
              No published reviews yet.
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              FAQ
            </h2>
            <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
              Quick answers about setup, payments, and how the booking flow works.
            </p>
          </div>

          <div className="mt-10 grid gap-4 max-w-3xl">
            {[
              { q: 'How fast can I set up DoBook?', a: 'Most businesses can add services, set availability, and share a booking link in about 10 minutes.' },
              { q: 'Can I take deposits or full payment online?', a: 'Yes. Choose per service whether to take a deposit, full payment, or keep payment optional.' },
              { q: 'Do customers get confirmations and reminders?', a: 'Confirmations are included on Free. Pro adds automated email & SMS reminders to reduce no‑shows.' },
              { q: 'What about cancellations and rescheduling?', a: 'Set your cancellation window and rescheduling rules to protect your time and keep your calendar stable.' },
              { q: 'Can I embed DoBook on my website?', a: 'Yes. Add a booking widget or link so visitors can schedule without leaving your brand.' },
              { q: 'Does it work on mobile?', a: 'Yes. The booking experience is mobile-first, and the dashboard is responsive for phones and tablets.' },
            ].map((item) => (
              <details key={item.q} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                  {item.q}
                </summary>
                <div className="mt-2 text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-rose-600 py-20">
        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope' }}>
            Start taking bookings today
          </h2>
          <p className="text-rose-100 text-lg mb-8" style={{ fontFamily: 'Inter' }}>
            Join service businesses using DoBook for appointment scheduling, payments, and invoices—without the admin overload.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              data-testid="cta-get-started-btn"
              type="button"
              onClick={() => router.push(isAuthed ? '/dashboard' : startFreeHref)}
              className="h-14 px-10 bg-white text-rose-700 hover:bg-zinc-50 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              {isAuthed ? 'Open dashboard' : 'Start Free (Business)'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(customerHref)}
              className="h-14 px-10 rounded-xl border-white/40 text-white bg-transparent hover:bg-white/10 hover:text-white"
            >
              Find services near me
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-12">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200"
                onClick={() => router.push('/')}
                aria-label="Go to DoBook home"
              >
                <img
                  src={DOBOOK_LOGO_PNG}
                  alt="DoBook"
                  className="h-[68px] md:h-[76px] w-auto object-contain select-none"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.src = DOBOOK_LOGO_SVG;
                  }}
                />
                <div className="text-lg font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>DoBook</div>
              </button>
              <p className="mt-3 text-sm text-zinc-600 max-w-md" style={{ fontFamily: 'Inter' }}>
                DoBook is an all‑in‑one online booking system for service businesses—appointment scheduling software with client management, invoices, reminders, and payments.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" href="#" aria-label="Twitter (placeholder)">Twitter</a>
                <a className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" href="#" aria-label="LinkedIn (placeholder)">LinkedIn</a>
                <a className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" href="#" aria-label="Instagram (placeholder)">Instagram</a>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="grid gap-8 sm:grid-cols-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>Product</div>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>
                    <a className="hover:text-zinc-900" href="#features">Features</a>
                    <a className="hover:text-zinc-900" href="#pricing">Pricing</a>
                    <button type="button" className="text-left hover:text-zinc-900" onClick={() => router.push(customerHref)}>Find services</button>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>Company</div>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>
                    <a className="hover:text-zinc-900" href="#">About</a>
                    <a className="hover:text-zinc-900" href="mailto:support@do-book.com">Contact</a>
                    <a className="hover:text-zinc-900" href="#">Careers</a>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>Legal</div>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>
                    <a className="hover:text-zinc-900" href="/privacy">Privacy</a>
                    <a className="hover:text-zinc-900" href="/terms">Terms</a>
                    <a className="hover:text-zinc-900" href="/policies/cancellation">Cancellation policy</a>
                  </div>
                </div>
              </div>

              <div className="mt-10 rounded-3xl border border-zinc-200 bg-zinc-50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>Ready to grow?</div>
                  <div className="mt-1 text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>
                    Start free and turn your booking flow into a revenue engine.
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => router.push(isAuthed ? '/dashboard' : startFreeHref)}
                  className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  {isAuthed ? 'Open dashboard' : 'Start Free (Business)'}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-zinc-200 pt-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-xs text-zinc-500" style={{ fontFamily: 'Inter' }}>
            <div>© {new Date().getFullYear()} DoBook. All rights reserved.</div>
            <div>online booking system · appointment scheduling software · booking system for small business · service business scheduling</div>
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
  const [bookingPrefill, setBookingPrefill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

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
      const response = await axios.get(`${API}/business/profile`);
      localStorage.setItem('dobook_business', JSON.stringify(minimizeBusinessForStorage(response.data)));
      setBusiness(response.data);
    } catch {
      // ignore
    } finally {
      setHasRefreshed(true);
    }
  };

  useEffect(() => {
    if (!hasRefreshed) return;
    const businessId = business?.id ? String(business.id) : '';
    if (!businessId) return;
    const completed = business?.onboarding_tour_completed_at;
    const seen = localStorage.getItem(`dobook_tour_seen_${businessId}`);
    const createdAt = business?.created_at ? new Date(business.created_at).getTime() : Number.NaN;
    const ageMs = Number.isFinite(createdAt) ? Date.now() - createdAt : Number.NaN;
    const isNewBusiness = Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 14 * 24 * 60 * 60 * 1000;
    if (isNewBusiness && !completed && !seen) setTourOpen(true);
  }, [business?.id, business?.created_at, business?.onboarding_tour_completed_at, hasRefreshed]);

  const loadBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings`);
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
    localStorage.removeItem('dobook_business');
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
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
      <BusinessTour
        business={business}
        open={tourOpen}
        onOpenChange={setTourOpen}
        onBusinessUpdated={(updated) => setBusiness(updated)}
      />

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/30">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={DOBOOK_LOGO_PNG}
              alt="DoBook"
              className="h-[68px] md:h-[76px] w-auto object-contain select-none"
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
              className="h-10 rounded-lg border-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
              onClick={() => setMobileMenuOpen(true)}
            >
              <List className="h-4 w-4 mr-2" />
              Menu
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-10 p-0 rounded-lg border-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Sidebar */}
      <div className="hidden md:block fixed left-0 top-0 h-full w-[240px] bg-white border-r border-border p-6">
        <div className="flex items-center gap-3 mb-8">
          <BrandLogo size="md" />
        </div>

        <nav className="space-y-1">
          <Button
            data-testid="overview-tab"
            variant="ghost"
            onClick={() => setActiveTab('overview')}
            className={cn(
              "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
              activeTab === 'overview'
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Overview</span>
          </Button>

          <Button
            data-testid="bookings-tab"
            data-tour="nav-bookings"
            variant="ghost"
            onClick={() => setActiveTab('bookings')}
            className={cn(
              "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
              activeTab === 'bookings'
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-5 w-5" />
            <span>Bookings</span>
          </Button>

          <Button
            data-testid="staff-tab"
            variant="ghost"
            onClick={() => setActiveTab('staff')}
            className={cn(
              "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
              activeTab === 'staff'
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserCheck className="h-5 w-5" />
            <span>Staff</span>
          </Button>

          <Button
            data-testid="clients-tab"
            variant="ghost"
            onClick={() => setActiveTab('clients')}
            className={cn(
              "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
              activeTab === 'clients'
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-5 w-5" />
            <span>Clients</span>
          </Button>

          <Button
            data-testid="calendar-view-tab"
            data-tour="nav-calendar"
            variant="ghost"
            onClick={() => setActiveTab('calendar')}
            className={cn(
              "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
              activeTab === 'calendar'
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-5 w-5" />
            <span>Calendar View</span>
          </Button>

          <Button
            data-testid="invoice-templates-tab"
            data-tour="nav-invoices"
            variant="ghost"
            onClick={() => setActiveTab('invoices')}
            className={cn(
              "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
              activeTab === 'invoices'
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-5 w-5" />
            <span>Invoice Templates</span>
          </Button>

          <Button
            data-testid="pdf-upload-tab"
            variant="ghost"
            onClick={() => setActiveTab('pdf')}
            className={cn(
              "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
              activeTab === 'pdf'
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Upload className="h-5 w-5" />
            <span>PDF Upload</span>
          </Button>

          <Button
            data-testid="widget-tab"
            data-tour="nav-widget"
            variant="ghost"
            onClick={() => setActiveTab('widget')}
            className={cn(
              "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
              activeTab === 'widget'
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Code className="h-5 w-5" />
            <span>Embed Widget</span>
          </Button>

          <Button
            data-testid="account-settings-tab"
            data-tour="nav-settings"
            variant="ghost"
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
              activeTab === 'settings'
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            <span>Account Settings</span>
          </Button>

          <Button
            data-testid="public-profile-tab"
            data-tour="nav-public_profile"
            variant="ghost"
            onClick={() => setActiveTab('public_profile')}
            className={cn(
              "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
              activeTab === 'public_profile'
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Globe className="h-5 w-5" />
            <span>Public Profile</span>
          </Button>
        </nav>

	        <div className="absolute bottom-6 left-6 right-6">
	          <ThemeModeToggle
	            className="w-full mb-3 flex items-center justify-start gap-2 border-zinc-200 rounded-lg"
	          />
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
                activeTab === 'overview'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Overview</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setActiveTab('bookings'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
                activeTab === 'bookings'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="h-5 w-5" />
              <span>Bookings</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setActiveTab('staff'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
                activeTab === 'staff'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserCheck className="h-5 w-5" />
              <span>Staff</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setActiveTab('clients'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
                activeTab === 'clients'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-5 w-5" />
              <span>Clients</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setActiveTab('calendar'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
                activeTab === 'calendar'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarDays className="h-5 w-5" />
              <span>Calendar View</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setActiveTab('invoices'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
                activeTab === 'invoices'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="h-5 w-5" />
              <span>Invoice Templates</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setActiveTab('pdf'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
                activeTab === 'pdf'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="h-5 w-5" />
              <span>PDF Upload</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setActiveTab('widget'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
                activeTab === 'widget'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code className="h-5 w-5" />
              <span>Embed Widget</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
                activeTab === 'settings'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
              <span>Account Settings</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setActiveTab('public_profile'); setMobileMenuOpen(false); }}
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-3 py-2.5",
                activeTab === 'public_profile'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Globe className="h-5 w-5" />
              <span>Public Profile</span>
            </Button>
          </div>
	          <div className="pt-2">
	            <Button
	              type="button"
	              onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
	              variant="outline"
	              className="w-full flex items-center gap-2 border-zinc-200 rounded-lg dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
	            >
	              <LogOut className="h-4 w-4" />
	              Logout
	            </Button>
	          </div>
	        </DialogContent>
	      </Dialog>

	      {/* Mobile Bottom Nav */}
	      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/30">
        <div className="grid grid-cols-5 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            aria-current={activeTab === 'overview' ? 'page' : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors",
              activeTab === 'overview'
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[11px] font-medium">Home</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            data-tour="nav-bookings"
            aria-current={activeTab === 'bookings' ? 'page' : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors",
              activeTab === 'bookings'
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[11px] font-medium">Bookings</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            data-tour="nav-calendar"
            aria-current={activeTab === 'calendar' ? 'page' : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors",
              activeTab === 'calendar'
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-[11px] font-medium">Calendar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            data-tour="nav-settings"
            aria-current={activeTab === 'settings' ? 'page' : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors",
              activeTab === 'settings'
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[11px] font-medium">Settings</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="More"
          >
	            <List className="h-5 w-5" />
	            <span className="text-[11px] font-medium">More</span>
	          </button>
	        </div>
	      </div>

      {/* Main Content */}
      <div className="md:ml-[240px] p-4 md:p-8 pb-28 md:pb-8">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2" style={{fontFamily: 'Manrope'}}>
              {business?.business_name}
            </h1>
            <p className="text-muted-foreground" style={{fontFamily: 'Inter'}}>{business?.email}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card data-testid="total-bookings-card">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{stats.totalBookings}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Bookings</div>
                </CardContent>
              </Card>

              <Card data-testid="upcoming-bookings-card">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{stats.upcomingBookings}</div>
                  <div className="text-sm text-muted-foreground mt-1">Upcoming Bookings</div>
                </CardContent>
              </Card>

              <Card data-testid="revenue-card">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">${stats.revenue.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground mt-1">Revenue</div>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="monthly-trends-card" className="mb-6">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Monthly Trends</h3>
                {monthlyTrends.every((m) => m.bookings === 0 && m.revenue === 0) ? (
                  <p className="text-muted-foreground text-center py-10">No booking data yet</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="border border-border rounded-xl p-4">
                      <p className="text-sm font-semibold mb-3">Bookings</p>
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

                    <div className="border border-border rounded-xl p-4">
                      <p className="text-sm font-semibold mb-3">Revenue</p>
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

            <Card data-testid="recent-bookings-card">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Recent Bookings</h3>
                {activeBookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No bookings yet</p>
                ) : (
                  <div className="space-y-4">
                    {activeBookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-semibold">{booking.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{booking.service_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{booking.booking_date}</p>
                          <p className="text-sm text-muted-foreground">{booking.booking_time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'bookings' && (
          <BookingsTab
            business={business}
            bookings={bookings}
            onRefresh={loadBookings}
            prefillBooking={bookingPrefill}
            onPrefillApplied={() => setBookingPrefill(null)}
          />
        )}
        {activeTab === 'staff' && (
          <StaffTab />
        )}
        {activeTab === 'clients' && (
          <ClientsTab
            bookings={bookings}
            onNewBooking={(client) => {
              setBookingPrefill({
                customer_name: client?.customer_name || '',
                customer_email: client?.customer_email || '',
                customer_phone: client?.customer_phone || '',
              });
              setActiveTab('bookings');
            }}
          />
        )}
        {activeTab === 'calendar' && <CalendarViewTab business={business} bookings={bookings} onRefresh={loadBookings} />}
        {activeTab === 'invoices' && business && <InvoiceTemplatesTab businessId={business.id} />}
        {activeTab === 'settings' && business && (
          <AccountSettingsTab
            business={business}
            bookings={bookings}
            onUpdate={(updated) => setBusiness(updated)}
            onStartTour={() => setTourOpen(true)}
          />
        )}
        {activeTab === 'public_profile' && business && <PublicProfileTab business={business} onUpdate={(updated) => setBusiness(updated)} />}
        {activeTab === 'pdf' && business && <PDFUploadTab businessId={business.id} onBookingCreated={loadBookings} />}
        {activeTab === 'widget' && business && <WidgetTab businessId={business.id} />}
      </div>
    </div>
  );
};

// ============= Account Settings Tab =============
const AccountSettingsTab = ({ business, bookings, onUpdate, onStartTour = () => {} }) => {
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
    reminders_enabled: business?.reminders_enabled !== undefined ? Boolean(business.reminders_enabled) : true,
    reminder_times: Array.isArray(business?.reminder_times) && business.reminder_times.length
      ? business.reminder_times
      : (Array.isArray(business?.reminder_timing_hrs) && business.reminder_timing_hrs.length ? business.reminder_timing_hrs : [48, 2]),
    reminder_custom_message: business?.reminder_custom_message || '',
    reminder_include_payment_link:
      business?.reminder_include_payment_link !== undefined
        ? Boolean(business.reminder_include_payment_link)
        : Boolean(String(business?.payment_link || '').trim()),
    reminder_include_booking_details:
      business?.reminder_include_booking_details !== undefined ? Boolean(business.reminder_include_booking_details) : true,
    confirmation_email_enabled:
      business?.confirmation_email_enabled !== undefined ? Boolean(business.confirmation_email_enabled) : true,
    travel_fee_enabled: Boolean(business?.travel_fee_enabled),
    travel_fee_label: business?.travel_fee_label || 'Travel fee',
    travel_fee_amount: business?.travel_fee_amount !== undefined && business?.travel_fee_amount !== null ? String(business.travel_fee_amount) : '0',
    travel_fee_free_km: business?.travel_fee_free_km !== undefined && business?.travel_fee_free_km !== null ? String(business.travel_fee_free_km) : '40',
    travel_fee_rate_per_km: business?.travel_fee_rate_per_km !== undefined && business?.travel_fee_rate_per_km !== null ? String(business.travel_fee_rate_per_km) : '0.4',
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
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [platformReviewRating, setPlatformReviewRating] = useState('5');
  const [platformReviewComment, setPlatformReviewComment] = useState('');
  const [platformReviewSubmitting, setPlatformReviewSubmitting] = useState(false);
  const [platformReviewChecked, setPlatformReviewChecked] = useState(false);
  const [platformReviewHasReview, setPlatformReviewHasReview] = useState(false);
  const [reminderRows, setReminderRows] = useState([]);

  const reminderOptions = [
    { value: 1, label: '1 hour before' },
    { value: 2, label: '2 hours before' },
    { value: 4, label: '4 hours before' },
    { value: 12, label: '12 hours before' },
    { value: 24, label: '24 hours before' },
    { value: 48, label: '48 hours before' },
    { value: 72, label: '72 hours before' },
    { value: 168, label: '1 week before' },
  ];

  const normalizeReminderTimes = (times) => {
    const allowed = new Set(reminderOptions.map((opt) => opt.value));
    const list = Array.isArray(times) ? times : [];
    const cleaned = list
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && allowed.has(v));
    return Array.from(new Set(cleaned)).slice(0, 3);
  };

  const buildReminderRows = (times) => {
    const normalized = normalizeReminderTimes(times);
    const base = normalized.length ? normalized : [48, 2];
    return base.slice(0, 3).map((hours, idx) => ({
      id: `${hours}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      hours,
      enabled: true,
    }));
  };

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
        reminders_enabled: business?.reminders_enabled !== undefined ? Boolean(business.reminders_enabled) : true,
        reminder_times: Array.isArray(business?.reminder_times) && business.reminder_times.length
          ? business.reminder_times
          : (Array.isArray(business?.reminder_timing_hrs) && business.reminder_timing_hrs.length ? business.reminder_timing_hrs : [48, 2]),
        reminder_custom_message: business?.reminder_custom_message || '',
        reminder_include_payment_link:
          business?.reminder_include_payment_link !== undefined
            ? Boolean(business.reminder_include_payment_link)
            : Boolean(String(business?.payment_link || '').trim()),
        reminder_include_booking_details:
          business?.reminder_include_booking_details !== undefined ? Boolean(business.reminder_include_booking_details) : true,
        confirmation_email_enabled:
          business?.confirmation_email_enabled !== undefined ? Boolean(business.confirmation_email_enabled) : true,
        travel_fee_enabled: Boolean(business?.travel_fee_enabled),
        travel_fee_label: business?.travel_fee_label || 'Travel fee',
        travel_fee_amount: business?.travel_fee_amount !== undefined && business?.travel_fee_amount !== null ? String(business.travel_fee_amount) : '0',
        travel_fee_free_km: business?.travel_fee_free_km !== undefined && business?.travel_fee_free_km !== null ? String(business.travel_fee_free_km) : '40',
        travel_fee_rate_per_km: business?.travel_fee_rate_per_km !== undefined && business?.travel_fee_rate_per_km !== null ? String(business.travel_fee_rate_per_km) : '0.4',
        cbd_fee_enabled: Boolean(business?.cbd_fee_enabled),
        cbd_fee_label: business?.cbd_fee_label || 'CBD logistics',
        cbd_fee_amount: business?.cbd_fee_amount !== undefined && business?.cbd_fee_amount !== null ? String(business.cbd_fee_amount) : '0',
        industry: business?.industry || 'photobooth',
        booth_types: Array.isArray(business?.booth_types) ? business.booth_types : ['Open Booth', 'Glam Booth', 'Enclosed Booth'],
        booking_custom_fields: Array.isArray(business?.booking_custom_fields) ? business.booking_custom_fields : []
      });
      const reminderTimes = Array.isArray(business?.reminder_times) && business.reminder_times.length
        ? business.reminder_times
        : (Array.isArray(business?.reminder_timing_hrs) && business.reminder_timing_hrs.length ? business.reminder_timing_hrs : [48, 2]);
      setReminderRows(buildReminderRows(reminderTimes));
      setSubscriptionInfo({
        plan: business.subscription_plan || 'free',
        booking_count: business.booking_count || 0
      });
    }
  }, [business]);

  useEffect(() => {
    let cancelled = false;
    setPlatformReviewChecked(false);
    setPlatformReviewHasReview(false);

    if (!business?.id) {
      setPlatformReviewChecked(true);
      return () => {
        cancelled = true;
      };
    }

    axios.get(`${API}/business/platform-reviews`)
      .then((res) => {
        if (cancelled) return;
        setPlatformReviewHasReview(Boolean(res.data?.hasReview));
        setPlatformReviewChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setPlatformReviewHasReview(false);
        setPlatformReviewChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [business?.id]);

  const isOwner = String(business?.account_role || '').trim().toLowerCase() === 'owner';
  const plan = String(subscriptionInfo?.plan || business?.subscription_plan || 'free');
  const effectivePlan = isOwner ? 'pro' : plan;
  const subscriptionStatus = String(business?.subscription_status || 'inactive');
  const hasReminderAccess = isOwner || (effectivePlan === 'pro' && subscriptionStatus === 'active');
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

  const handleSave = async ({ successMessage } = {}) => {
    setLoading(true);
    try {
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

      const reminder_times = normalizeReminderTimes(reminderRows.map((r) => (r.enabled ? r.hours : null)));
      const reminders_enabled = hasReminderAccess ? Boolean(formData.reminders_enabled && reminder_times.length) : false;

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

      const payload = {
        ...formData,
        booth_types,
        booking_custom_fields,
        reminders_enabled,
        reminder_times,
        reminder_custom_message: String(formData.reminder_custom_message || '').slice(0, 300),
        reminder_include_payment_link: Boolean(formData.reminder_include_payment_link),
        reminder_include_booking_details: Boolean(formData.reminder_include_booking_details),
        confirmation_email_enabled: Boolean(formData.confirmation_email_enabled),
      };
      payload.travel_fee_amount = Number(formData.travel_fee_amount || 0);
      payload.travel_fee_free_km = Math.max(0, Math.floor(Number(formData.travel_fee_free_km || 40)));
      payload.travel_fee_rate_per_km = Number(formData.travel_fee_rate_per_km || 0);
      payload.cbd_fee_amount = Number(formData.cbd_fee_amount || 0);

      const response = await axios.put(`${API}/business/profile`, payload);
      
      localStorage.setItem('dobook_business', JSON.stringify(minimizeBusinessForStorage(response.data)));
      onUpdate(response.data);
      toast.success(successMessage || 'Account settings updated!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setBillingLoading(true);
    try {
      const response = await axios.post(`${API}/stripe/checkout`, { plan: 'pro' });
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
      const response = await axios.post(`${API}/stripe/portal`, {});
      const url = response?.data?.url;
      if (!url) throw new Error('Missing portal URL');
      window.location.href = url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to open billing portal');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setBillingLoading(true);
    try {
      const response = await axios.post(`${API}/stripe/portal`, { flow: 'cancel' });
      const url = response?.data?.url;
      if (!url) throw new Error('Missing portal URL');
      window.location.href = url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to open subscription cancellation');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/business/delete`);

      localStorage.removeItem('dobook_business');
      fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
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
      <Card className="bg-white dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800/60 shadow-sm rounded-xl mb-6">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle style={{fontFamily: 'Manrope'}}>Subscription Plan</CardTitle>
            <CardDescription>Current plan and usage</CardDescription>
          </div>
          <Button type="button" variant="outline" className="h-9 rounded-lg border-zinc-200" onClick={onStartTour}>
            Tour guide
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-zinc-50 rounded-lg">
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
                className="bg-emerald-600 hover:bg-emerald-700 h-10 px-6 rounded-xl w-full sm:w-auto"
                onClick={handleUpgrade}
                disabled={billingLoading}
              >
                {billingLoading ? 'Redirecting…' : `Upgrade to Pro - $${PRO_PRICE_AUD} AUD/month`}
              </Button>
            )}
            {!isOwner && effectivePlan !== 'free' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="h-10 px-6 rounded-lg border-zinc-200 w-full sm:w-auto"
                  onClick={handleManageBilling}
                  disabled={billingLoading}
                >
                  {billingLoading ? 'Opening…' : 'Manage billing'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-6 rounded-lg border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 w-full sm:w-auto"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={billingLoading}
                >
                  Cancel subscription
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel subscription</DialogTitle>
            <DialogDescription>
              You’ll be taken to Stripe to cancel your plan. Your access typically stays active until the end of the current
              billing period.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={billingLoading}>
              Keep subscription
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setCancelDialogOpen(false);
                handleCancelSubscription();
              }}
              disabled={billingLoading}
            >
              Continue to Stripe
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Business Information */}
      <Card data-testid="business-info-card" className="mb-6">
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Update your business details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6 rounded-lg border border-border p-4">
            <div className="relative">
              {formData.logo_url ? (
                <div className="h-24 w-24 rounded-full overflow-hidden border border-border shadow-sm">
                  <img
                    src={formData.logo_url}
                    alt="Business Logo"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold border border-border shadow-sm">
                  {getInitials(formData.business_name || 'B')}
                </div>
              )}
              <label
                htmlFor="logo-upload"
                className="absolute bottom-0 right-0 h-8 w-8 bg-background rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-muted transition-colors border border-border"
              >
                <Upload className="h-4 w-4 text-muted-foreground" />
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
              <p className="text-sm text-muted-foreground mb-2">
                {uploadingLogo ? 'Uploading...' : 'Click the upload icon to change your logo'}
              </p>
              <p className="text-xs text-muted-foreground">Recommended: Square image, at least 200x200px</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2 mb-4">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                data-testid="business-name-input"
                value={formData.business_name}
                onChange={(e) => setFormData({...formData, business_name: e.target.value})}
              />
            </div>

            <div className="grid gap-2 mb-4">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                data-testid="phone-input"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className="grid gap-2 mb-4">
              <Label>Industry</Label>
              <Select
                value={String(formData.industry || 'photobooth')}
                onValueChange={(val) => setFormData({ ...formData, industry: val })}
              >
                <SelectTrigger className="h-11">
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

            <div className="md:col-span-2 grid gap-2 mb-4">
              <Label htmlFor="business_address">Business Address</Label>
              <AddressAutocomplete
                value={formData.business_address}
                onChange={(val) => setFormData({ ...formData, business_address: val })}
                placeholder="Start typing your address…"
                className="bg-background"
                inputProps={{ id: "business_address", "data-testid": "address-input" }}
              />
            </div>

            <div className="grid gap-2 mb-4">
              <Label htmlFor="abn">ABN (Australian Business Number)</Label>
              <Input
                id="abn"
                data-testid="abn-input"
                value={formData.abn}
                onChange={(e) => setFormData({...formData, abn: e.target.value})}
                placeholder="XX XXX XXX XXX"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card data-testid="payment-details-card" className="mb-6">
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Bank details for invoice payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2 mb-4">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                data-testid="bank-name-input"
                value={formData.bank_name}
                onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                placeholder="Commonwealth Bank"
              />
            </div>

            <div className="grid gap-2 mb-4">
              <Label htmlFor="account_name">Account Name</Label>
              <Input
                id="account_name"
                data-testid="account-name-input"
                value={formData.account_name}
                onChange={(e) => setFormData({...formData, account_name: e.target.value})}
              />
            </div>

            <div className="grid gap-2 mb-4">
              <Label htmlFor="bsb">BSB</Label>
              <Input
                id="bsb"
                data-testid="bsb-input"
                value={formData.bsb}
                onChange={(e) => setFormData({...formData, bsb: e.target.value})}
                placeholder="XXX-XXX"
                maxLength={7}
              />
            </div>

            <div className="grid gap-2 mb-4">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                data-testid="account-number-input"
                value={formData.account_number}
                onChange={(e) => setFormData({...formData, account_number: e.target.value})}
              />
            </div>

            <div className="md:col-span-2 grid gap-2 mb-4">
              <Label htmlFor="payment_link">Payment Link (Optional)</Label>
              <Input
                id="payment_link"
                data-testid="payment-link-input"
                value={formData.payment_link}
                onChange={(e) => setFormData({...formData, payment_link: e.target.value})}
                placeholder="https://yourwebsite.com/pay"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Charges */}
      <Card data-testid="surcharges-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl mb-6">
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
              <div className="grid gap-2 mb-4">
                <Label htmlFor="travel_fee_label">Label</Label>
                <Input
                  id="travel_fee_label"
                  value={formData.travel_fee_label}
                  onChange={(e) => setFormData({ ...formData, travel_fee_label: e.target.value })}
                  placeholder="Travel fee"
                  className="bg-zinc-50"
                />
              </div>
              <div className="grid gap-2 mb-4">
                <Label htmlFor="travel_fee_free_km">Free distance (km)</Label>
                <Input
                  id="travel_fee_free_km"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.travel_fee_free_km}
                  onChange={(e) => setFormData({ ...formData, travel_fee_free_km: e.target.value })}
                  className="bg-zinc-50"
                />
              </div>
              <div className="md:col-span-2 grid gap-2 mb-4">
                <Label htmlFor="travel_fee_rate_per_km">Rate ($/km) (over free distance)</Label>
                <Input
                  id="travel_fee_rate_per_km"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.travel_fee_rate_per_km}
                  onChange={(e) => setFormData({ ...formData, travel_fee_rate_per_km: e.target.value })}
                  className="bg-zinc-50"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              Travel charges are calculated automatically based on distance from your business address to the event
              location.
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
              <div className="grid gap-2 mb-4">
                <Label htmlFor="cbd_fee_label">Label</Label>
                <Input
                  id="cbd_fee_label"
                  value={formData.cbd_fee_label}
                  onChange={(e) => setFormData({ ...formData, cbd_fee_label: e.target.value })}
                  placeholder="CBD logistics"
                  className="bg-zinc-50"
                />
              </div>
              <div className="grid gap-2 mb-4">
                <Label htmlFor="cbd_fee_amount">Amount ($)</Label>
                <Input
                  id="cbd_fee_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cbd_fee_amount}
                  onChange={(e) => setFormData({ ...formData, cbd_fee_amount: e.target.value })}
                  className="bg-zinc-50"
                />
              </div>
            </div>
	            <p className="text-xs text-zinc-500 mt-3">
	              If enabled, this charge is applied automatically when the booking address postcode is <strong>3000</strong>.
	            </p>
	          </div>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl mb-6">
        <CardHeader>
          <CardTitle style={{fontFamily: 'Manrope'}}>Reminder Settings</CardTitle>
          <CardDescription>Automate emails to reduce no-shows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Send automatic booking reminders</div>
                <div className="text-xs text-muted-foreground">
                  Reminders are sent based on your selected timing.
                </div>
              </div>
              <Switch
                checked={hasReminderAccess ? Boolean(formData.reminders_enabled) : false}
                onCheckedChange={(v) => {
                  if (!hasReminderAccess) return;
                  setFormData({ ...formData, reminders_enabled: Boolean(v) });
                }}
                disabled={!hasReminderAccess}
              />
            </div>
            {!hasReminderAccess && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-zinc-500">
                <span>Upgrade to Pro to enable reminders.</span>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={handleUpgrade}
                  disabled={billingLoading}
                >
                  {billingLoading ? 'Redirecting…' : 'Upgrade to Pro'}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-zinc-900">Reminder timing</div>
            <div className="space-y-2">
              {reminderRows.map((row, idx) => (
                <div key={row.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 p-3">
                  <Checkbox
                    checked={row.enabled}
                    onCheckedChange={(v) => {
                      if (!hasReminderAccess) return;
                      setReminderRows((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, enabled: Boolean(v) } : r)),
                      );
                    }}
                    disabled={!hasReminderAccess}
                  />
                  <Select
                    value={String(row.hours)}
                    onValueChange={(val) => {
                      if (!hasReminderAccess) return;
                      const nextHours = Number(val);
                      setReminderRows((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, hours: nextHours } : r)),
                      );
                    }}
                    disabled={!hasReminderAccess}
                  >
                    <SelectTrigger className="h-10 bg-zinc-50 min-w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reminderOptions.map((opt) => {
                        const alreadyUsed = reminderRows.some((r) => r.hours === opt.value && r.id !== row.id);
                        return (
                          <SelectItem key={opt.value} value={String(opt.value)} disabled={alreadyUsed}>
                            {opt.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {reminderRows.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9"
                      onClick={() => {
                        if (!hasReminderAccess) return;
                        setReminderRows((prev) => prev.filter((r) => r.id !== row.id));
                      }}
                      disabled={!hasReminderAccess}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => {
                if (!hasReminderAccess) return;
                setReminderRows((prev) => {
                  if (prev.length >= 3) return prev;
                  const used = new Set(prev.map((r) => r.hours));
                  const next = reminderOptions.find((opt) => !used.has(opt.value)) || reminderOptions[0];
                  return [
                    ...prev,
                    {
                      id: `${next.value}-${Math.random().toString(36).slice(2, 6)}`,
                      hours: next.value,
                      enabled: true,
                    },
                  ];
                });
              }}
              disabled={!hasReminderAccess || reminderRows.length >= 3}
            >
              Add another reminder
            </Button>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-semibold text-zinc-900">Reminder email content</div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={Boolean(formData.reminder_include_booking_details)}
                onCheckedChange={(v) => setFormData({ ...formData, reminder_include_booking_details: Boolean(v) })}
                disabled={!hasReminderAccess}
              />
              <span className="text-sm text-zinc-700">Include booking details in reminder</span>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={Boolean(formData.reminder_include_payment_link)}
                onCheckedChange={(v) => setFormData({ ...formData, reminder_include_payment_link: Boolean(v) })}
                disabled={!hasReminderAccess}
              />
              <span className="text-sm text-zinc-700">Include payment link in reminder</span>
            </div>
            {!String(formData.payment_link || '').trim() && (
              <div className="text-xs text-zinc-500">
                Add a payment link in Payment Details to show a pay button in reminders.
              </div>
            )}
            <div className="grid gap-2 mb-4">
              <Label htmlFor="reminder_message">Add a personal message to reminders (optional)</Label>
              <Textarea
                id="reminder_message"
                value={formData.reminder_custom_message}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 300);
                  setFormData({ ...formData, reminder_custom_message: value });
                }}
                placeholder="e.g. Please bring a valid ID to your appointment"
                className="bg-zinc-50 min-h-[96px]"
                maxLength={300}
                disabled={!hasReminderAccess}
              />
              <div className="mt-1 text-xs text-zinc-500">
                {String(formData.reminder_custom_message || '').length}/300 characters
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Send booking confirmation email to customer</div>
                <div className="text-xs text-muted-foreground">Sent immediately when a booking is created.</div>
              </div>
              <Switch
                checked={Boolean(formData.confirmation_email_enabled)}
                onCheckedChange={(v) => setFormData({ ...formData, confirmation_email_enabled: Boolean(v) })}
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={() => handleSave({ successMessage: 'Reminder settings saved!' })}
            disabled={loading}
            className="h-11 bg-rose-600 hover:bg-rose-700 rounded-xl"
          >
            {loading ? 'Saving…' : 'Save Reminder Settings'}
          </Button>
        </CardContent>
      </Card>

      <BusinessTypeSettingsCard business={business} onUpdate={onUpdate} />
      <BusinessBookingSettingsCard />

      {/* Booking Editor Configuration */}
      <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl mb-6">
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
        className="w-full h-12 bg-rose-600 hover:bg-rose-700 rounded-xl"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>

      {platformReviewChecked && !platformReviewHasReview && (
        <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl mb-6">
          <CardHeader>
            <CardTitle style={{fontFamily: 'Manrope'}}>Review DoBook</CardTitle>
            <CardDescription>Share feedback about DoBook.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2 mb-4">
                <Label>Rating</Label>
                <Select value={String(platformReviewRating)} onValueChange={(v) => setPlatformReviewRating(String(v))}>
                  <SelectTrigger className="bg-zinc-50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 grid gap-2 mb-4">
                <Label htmlFor="platform_review_comment">Comment</Label>
                <Textarea
                  id="platform_review_comment"
                  value={platformReviewComment}
                  onChange={(e) => setPlatformReviewComment(e.target.value)}
                  placeholder="What did you like or want improved?"
                  className="bg-zinc-50 min-h-[120px]"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={async () => {
                  const rating = Number.parseInt(String(platformReviewRating || '0'), 10);
                  const comment = String(platformReviewComment || '').trim();
                  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
                    toast.error('Please choose a rating from 1 to 5.');
                    return;
                  }
                  if (!comment || comment.length < 10) {
                    toast.error('Please write at least 10 characters.');
                    return;
                  }
                  setPlatformReviewSubmitting(true);
                  try {
                    await axios.post(
                      `${API}/business/platform-reviews`,
                      { rating, comment },
                    );
                    toast.success('Thanks! Your review was submitted for approval.');
                    setPlatformReviewRating('5');
                    setPlatformReviewComment('');
                    setPlatformReviewHasReview(true);
                    setPlatformReviewChecked(true);
                  } catch (error) {
                    if (error?.response?.status === 409) {
                      toast.success('Thanks! We already have your review.');
                      setPlatformReviewHasReview(true);
                      setPlatformReviewChecked(true);
                      return;
                    }
                    toast.error(error.response?.data?.detail || 'Failed to submit review');
                  } finally {
                    setPlatformReviewSubmitting(false);
                  }
                }}
                disabled={platformReviewSubmitting}
                className="h-10 px-6 bg-zinc-900 hover:bg-zinc-800 rounded-lg"
              >
                {platformReviewSubmitting ? 'Submitting…' : 'Submit review'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl mb-6">
        <CardHeader>
          <CardTitle style={{fontFamily: 'Manrope'}}>Contact support</CardTitle>
          <CardDescription>Reach us if you’re having an issue with the software</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2 mb-4">
            <Label htmlFor="support_subject">Subject</Label>
            <Input
              id="support_subject"
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
              placeholder="What can we help with?"
              className="bg-zinc-50"
            />
          </div>
          <div className="grid gap-2 mb-4">
            <Label htmlFor="support_message">Message</Label>
            <Textarea
              id="support_message"
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Describe the issue, and include steps to reproduce if possible."
              className="bg-zinc-50 min-h-[120px]"
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
                  await axios.post(
                    `${API}/support/contact`,
                    { subject, message },
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

      <Card className="border-destructive mb-6">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground">
            If you delete your account, your bookings, templates, and business data may be lost permanently.
          </div>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Account
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
            <div className="grid gap-2 mb-4">
              <Label htmlFor="delete-reason">Why are you leaving us? (optional)</Label>
              <Textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Your feedback helps us improve."
                className="bg-zinc-50"
              />
            </div>

            <div className="grid gap-2 mb-4">
              <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="bg-zinc-50"
              />
              <p className="mt-2 text-xs text-zinc-500">
                This will permanently delete your account and data (bookings, templates, and business settings).
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-4">
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
const BookingsTab = ({ business, bookings, onRefresh, prefillBooking, onPrefillApplied }) => {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
    event_location_geo: null,
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

  const openCreate = (overrides = {}) => {
    setCreateData((prev) => {
      const next = { ...prev, ...overrides };
      return {
        ...next,
        service_type: isPhotoBooth
          ? 'Photo Booth'
          : (boothTypes.includes(next.service_type) ? next.service_type : (boothTypes[0] || 'Service')),
        booth_type: isPhotoBooth ? (boothTypes.includes(next.booth_type) ? next.booth_type : (boothTypes[0] || '')) : '',
        package_duration: isPhotoBooth ? (next.package_duration || '2 Hours') : '',
        duration_minutes: isPhotoBooth ? (Number(next.duration_minutes) || 120) : (Number(next.duration_minutes) || 60),
      };
    });
    setCreateOpen(true);
  };

  const filteredBookings = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    const nowTs = Date.now();
    return bookings.filter((booking) => {
      const name = String(booking?.customer_name || '').toLowerCase();
      const email = String(booking?.customer_email || '').toLowerCase();
      if (q && !name.includes(q) && !email.includes(q)) return false;
      const status = String(booking?.status || 'confirmed').toLowerCase();
      if (statusFilter === 'cancelled') return status === 'cancelled';
      if (statusFilter === 'upcoming') {
        if (status === 'cancelled') return false;
        const ts = bookingDateTime(booking, 'start')?.getTime?.() ?? 0;
        return ts >= nowTs;
      }
      if (statusFilter === 'past') {
        if (status === 'cancelled') return false;
        const ts = bookingDateTime(booking, 'start')?.getTime?.() ?? 0;
        return ts < nowTs;
      }
      return true;
    });
  }, [bookings, search, statusFilter]);

  useEffect(() => {
    if (!prefillBooking) return;
    openCreate(prefillBooking);
    onPrefillApplied?.();
  }, [prefillBooking]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold">All Bookings</h2>
          <p className="text-sm text-muted-foreground">Manage your appointments</p>
        </div>
        <Button type="button" onClick={openCreate} className="h-10 px-4 gap-2">
          <Plus className="h-4 w-4" />
          Add booking
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search bookings..."
        className="max-w-sm mb-4"
      />

      <div className="flex justify-end mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-full sm:w-56">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card data-testid="bookings-list-card" className="mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              filteredBookings.map((booking) => {
                const status = String(booking.status || 'confirmed').toLowerCase();
                return (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="font-medium">{booking.customer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {booking.customer_email}
                      </div>
                    </TableCell>
                    <TableCell>{booking.booth_type || booking.service_type}</TableCell>
                    <TableCell>
                      <div className="font-medium">{booking.booking_date}</div>
                      <div className="text-sm text-muted-foreground">{booking.booking_time}</div>
                    </TableCell>
                    <TableCell className="text-primary font-medium">
                      ${bookingTotalAmount(booking).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={bookingStatusBadgeClass(status)}>
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        data-testid={`view-booking-${booking.id}`}
                        onClick={() => handleViewBooking(booking)}
                        size="sm"
                        variant="outline"
                        className="rounded-full px-4 text-xs"
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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
                <AddressAutocomplete
                  value={createData.event_location}
                  onChange={(val, item) =>
                    setCreateData({ ...createData, event_location: val, event_location_geo: item || null })
                  }
                  placeholder="Start typing an address…"
                  className="bg-zinc-50 mt-2"
                  inputProps={{ id: "cb_event_location" }}
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

// ============= Staff Tab =============
const StaffTab = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [mutatingId, setMutatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/staff`);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.staff) ? res.data.staff : [];
      setStaff(list);
    } catch {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const openCreate = () => {
    setEditingStaff(null);
    setFormData({ name: '', email: '', phone: '', is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (member) => {
    setEditingStaff(member);
    setFormData({
      name: member?.name || '',
      email: member?.email || '',
      phone: member?.phone || '',
      is_active: member?.is_active !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = String(formData.name || '').trim();
    const email = String(formData.email || '').trim();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    if (!isValidEmail(email)) {
      toast.error('Valid email is required');
      return;
    }

    setSaving(true);
    try {
      if (editingStaff?.id) {
        await axios.put(`${API}/staff/${editingStaff.id}`, {
          name,
          email,
          phone: formData.phone || '',
          is_active: Boolean(formData.is_active),
        });
        toast.success('Staff member updated');
      } else {
        await axios.post(`${API}/staff`, {
          name,
          email,
          phone: formData.phone || '',
          is_active: Boolean(formData.is_active),
        });
        toast.success('Staff member added');
      }
      setDialogOpen(false);
      await loadStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member) => {
    if (!member?.id) return;
    const nextActive = !(member?.is_active !== false);
    setMutatingId(member.id);
    try {
      await axios.put(`${API}/staff/${member.id}`, { is_active: nextActive });
      toast.success(nextActive ? 'Staff member activated' : 'Staff member deactivated');
      await loadStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update staff status');
    } finally {
      setMutatingId(null);
    }
  };

  const handleDelete = async (member) => {
    if (!member?.id) return;
    const ok = window.confirm(`Delete ${member?.name || 'this staff member'}? This cannot be undone.`);
    if (!ok) return;
    setDeletingId(member.id);
    try {
      await axios.delete(`${API}/staff/${member.id}`);
      toast.success('Staff member deleted');
      await loadStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete staff member');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle style={{fontFamily: 'Manrope'}}>Staff</CardTitle>
              <CardDescription>Manage your team members</CardDescription>
            </div>
            <Button
              type="button"
              onClick={openCreate}
              className="h-10 px-4 bg-rose-600 hover:bg-rose-700 rounded-lg"
            >
              <Plus className="h-4 w-4" />
              Add staff member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">Loading staff...</p>
          ) : staff.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">No staff yet. Add your first team member.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800/60">
                    <th className="text-left py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-200">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-200">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-200">Phone</th>
                    <th className="text-left py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-200">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => {
                    const active = member?.is_active !== false;
                    return (
                      <tr key={member.id} className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-medium">{member?.name || '-'}</td>
                        <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">{member?.email || '-'}</td>
                        <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">{member?.phone || '-'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                              active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}
                          >
                            {active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-full px-4 text-xs"
                              onClick={() => openEdit(member)}
                              disabled={mutatingId === member.id || deletingId === member.id}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-full px-4 text-xs"
                              onClick={() => toggleActive(member)}
                              disabled={mutatingId === member.id || deletingId === member.id}
                            >
                              {active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-8 rounded-full px-4 text-xs"
                              onClick={() => handleDelete(member)}
                              disabled={mutatingId === member.id || deletingId === member.id}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope' }}>
              {editingStaff ? 'Edit staff member' : 'Add staff member'}
            </DialogTitle>
            <DialogDescription>
              {editingStaff ? 'Update staff details.' : 'Add a new team member.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="staff_name">Full Name *</Label>
              <Input
                id="staff_name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-zinc-50 mt-2"
              />
            </div>
            <div>
              <Label htmlFor="staff_email">Email *</Label>
              <Input
                id="staff_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-zinc-50 mt-2"
              />
            </div>
            <div>
              <Label htmlFor="staff_phone">Phone (optional)</Label>
              <Input
                id="staff_phone"
                type="tel"
                inputMode="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="bg-zinc-50 mt-2"
              />
              <p className="text-xs text-zinc-500 mt-1">For future SMS notifications</p>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={Boolean(formData.is_active)}
                onCheckedChange={(v) => setFormData((prev) => ({ ...prev, is_active: Boolean(v) }))}
              />
              <span className="text-sm text-zinc-700">Active</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ============= Clients Tab =============
const ClientsTab = ({ bookings, onNewBooking }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('last_booking_date');
  const [sortDir, setSortDir] = useState('desc');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [requestingReview, setRequestingReview] = useState(false);

  const sortDefaults = useMemo(
    () => ({
      name: 'asc',
      total_bookings: 'desc',
      total_spent: 'desc',
      last_booking_date: 'desc',
    }),
    [],
  );

  useEffect(() => {
    setSortDir(sortDefaults[sortKey] || 'desc');
  }, [sortKey, sortDefaults]);

  useEffect(() => {
    let cancelled = false;
    const loadClients = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/clients`);
        const list = Array.isArray(res.data?.clients)
          ? res.data.clients
          : (Array.isArray(res.data) ? res.data : []);
        if (!cancelled) setClients(list);
      } catch (error) {
        if (!cancelled) toast.error(error.response?.data?.detail || 'Failed to load clients');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadClients();
    return () => {
      cancelled = true;
    };
  }, [bookings]);

  const stats = useMemo(() => {
    const totalClients = clients.length;
    const repeatClients = clients.filter((c) => Number(c?.total_bookings || 0) > 1).length;
    const revenue = clients.reduce((sum, c) => sum + Number(c?.total_spent || 0), 0);
    return {
      totalClients,
      repeatClients,
      revenue,
    };
  }, [clients]);

  const parseDateValue = (value) => {
    const s = String(value || '').trim();
    if (!s) return null;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? parseISO(s) : new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const formatDate = (value) => {
    const d = parseDateValue(value);
    if (!d) return '—';
    return format(d, 'MMM d, yyyy');
  };

  const dateToTs = (value) => {
    const d = parseDateValue(value);
    return d ? d.getTime() : 0;
  };

  const filteredClients = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    cutoff.setHours(0, 0, 0, 0);

    return clients.filter((client) => {
      const name = String(client?.customer_name || '').toLowerCase();
      const email = String(client?.customer_email || '').toLowerCase();
      const matches = !q || name.includes(q) || email.includes(q);
      if (!matches) return false;
      if (statusFilter === 'all') return true;
      const lastDate = parseDateValue(client?.last_booking_date);
      const isActive = lastDate ? lastDate >= cutoff : false;
      return statusFilter === 'active' ? isActive : !isActive;
    });
  }, [clients, search, statusFilter]);

  const sortedClients = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredClients].sort((a, b) => {
      if (sortKey === 'name') {
        return (
          dir *
          String(a?.customer_name || a?.customer_email || '').localeCompare(
            String(b?.customer_name || b?.customer_email || ''),
            undefined,
            { sensitivity: 'base' },
          )
        );
      }
      if (sortKey === 'total_bookings') {
        return dir * (Number(a?.total_bookings || 0) - Number(b?.total_bookings || 0));
      }
      if (sortKey === 'total_spent') {
        return dir * (Number(a?.total_spent || 0) - Number(b?.total_spent || 0));
      }
      return dir * (dateToTs(a?.last_booking_date) - dateToTs(b?.last_booking_date));
    });
  }, [filteredClients, sortDir, sortKey]);

  const openClient = (client) => {
    setSelectedClient(client);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (!drawerOpen || !selectedClient?.customer_email) return;
    let cancelled = false;
    const loadDetail = async () => {
      setDetailLoading(true);
      setDetail(null);
      try {
        const res = await axios.get(`${API}/clients/${encodeURIComponent(selectedClient.customer_email)}`);
        if (cancelled) return;
        setDetail(res.data || null);
        setNotesValue(String(res.data?.notes || ''));
      } catch (error) {
        if (!cancelled) toast.error(error.response?.data?.detail || 'Failed to load client details');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [drawerOpen, selectedClient?.customer_email]);

  useEffect(() => {
    if (drawerOpen) return;
    setSelectedClient(null);
    setDetail(null);
    setNotesValue('');
  }, [drawerOpen]);

  const handleSaveNotes = async () => {
    if (!selectedClient?.customer_email) return;
    setSavingNotes(true);
    try {
      const res = await axios.put(
        `${API}/clients/${encodeURIComponent(selectedClient.customer_email)}/notes`,
        { notes: notesValue },
      );
      setNotesValue(String(res.data?.notes ?? notesValue));
      toast.success('Notes saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSendReviewRequest = async () => {
    const booking = detail?.bookings?.[0];
    if (!booking?.id) return;
    setRequestingReview(true);
    try {
      const res = await axios.post(`${API}/reviews/request`, { booking_id: booking.id });
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
    } catch (error) {
      if (error?.response?.status === 409) {
        const url = error?.response?.data?.url;
        const skipped = Boolean(error?.response?.data?.email?.skipped);
        if (skipped && url) {
          try {
            await navigator.clipboard.writeText(url);
            toast.success('Review link copied (email not sent)');
          } catch {
            toast.success('Review link created');
          }
        } else {
          toast.success('Review request already sent');
        }
      } else {
        toast.error(error.response?.data?.detail || 'Failed to request review');
      }
    } finally {
      setRequestingReview(false);
    }
  };

  const handleNewBooking = () => {
    const clientInfo = detail?.client || selectedClient || {};
    onNewBooking?.({
      customer_name: clientInfo?.customer_name || '',
      customer_email: clientInfo?.customer_email || '',
      customer_phone: clientInfo?.customer_phone || '',
    });
    setDrawerOpen(false);
  };

  const clientInfo = detail?.client || selectedClient || {};
  const recentBooking = detail?.bookings?.[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
            Clients
          </h2>
          <p className="text-zinc-600" style={{ fontFamily: 'Inter' }}>
            All customers who have booked with you
          </p>
        </div>
        <div className="w-full sm:w-80">
          <div className="relative">
            <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="pl-9 bg-white border-zinc-200"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
          <CardHeader>
            <CardDescription style={{ fontFamily: 'Inter' }}>Total Clients</CardDescription>
            <CardTitle className="text-3xl font-bold" style={{ fontFamily: 'Manrope' }}>
              {stats.totalClients}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
          <CardHeader>
            <CardDescription style={{ fontFamily: 'Inter' }}>Repeat Clients</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600" style={{ fontFamily: 'Manrope' }}>
              {stats.repeatClients}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
          <CardHeader>
            <CardDescription style={{ fontFamily: 'Inter' }}>Total Revenue from Clients</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600" style={{ fontFamily: 'Manrope' }}>
              ${stats.revenue.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle style={{ fontFamily: 'Manrope' }}>Client List</CardTitle>
            <CardDescription style={{ fontFamily: 'Inter' }}>
              Sort and filter customers across your bookings
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-zinc-100 p-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'inactive', label: 'Inactive' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setStatusFilter(filter.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                    statusFilter === filter.id
                      ? 'bg-white text-rose-600 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <Select value={sortKey} onValueChange={setSortKey}>
              <SelectTrigger className="h-10 bg-white border-zinc-200 min-w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="total_bookings">Total bookings</SelectItem>
                <SelectItem value="total_spent">Total spent</SelectItem>
                <SelectItem value="last_booking_date">Last booking date</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-10 p-0 border-zinc-200"
              onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              aria-label="Toggle sort direction"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500 text-center py-8">Loading clients…</p>
          ) : sortedClients.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No clients found</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">Total bookings</th>
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">Total spent</th>
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">Last booking</th>
                      <th className="text-left py-3 px-4 font-semibold text-zinc-700">First booking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedClients.map((client) => (
                      <tr
                        key={client.customer_email}
                        onClick={() => openClient(client)}
                        className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-medium">
                          {client.customer_name || client.customer_email}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-600">{client.customer_email}</td>
                        <td className="py-3 px-4 text-sm text-zinc-600">
                          {client.customer_phone || '—'}
                        </td>
                        <td className="py-3 px-4">{client.total_bookings || 0}</td>
                        <td className="py-3 px-4">${Number(client.total_spent || 0).toFixed(2)}</td>
                        <td className="py-3 px-4">{formatDate(client.last_booking_date)}</td>
                        <td className="py-3 px-4">{formatDate(client.first_booking_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {sortedClients.map((client) => (
                  <button
                    key={client.customer_email}
                    type="button"
                    onClick={() => openClient(client)}
                    className="w-full text-left rounded-xl border border-zinc-200 p-4 bg-white hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{client.customer_name || client.customer_email}</div>
                        <div className="text-xs text-zinc-500 truncate">{client.customer_email}</div>
                      </div>
                      <div className="text-sm font-semibold text-emerald-700">
                        ${Number(client.total_spent || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                      <div>Bookings: {client.total_bookings || 0}</div>
                      <div>Last: {formatDate(client.last_booking_date)}</div>
                      <div>First: {formatDate(client.first_booking_date)}</div>
                      <div>Phone: {client.customer_phone || '—'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl sm:ml-auto sm:mr-0 sm:h-[100dvh] sm:rounded-none sm:rounded-l-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope' }}>Client Details</DialogTitle>
            <DialogDescription>Booking history and internal notes</DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-10 text-center text-zinc-500">Loading client…</div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="text-xl font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                  {clientInfo.customer_name || clientInfo.customer_email || 'Client'}
                </div>
                <div className="text-sm text-zinc-600">{clientInfo.customer_email || '—'}</div>
                <div className="text-sm text-zinc-600">{clientInfo.customer_phone || '—'}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Total bookings</div>
                  <div className="text-2xl font-bold text-zinc-900">{clientInfo.total_bookings || 0}</div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Total revenue</div>
                  <div className="text-2xl font-bold text-emerald-700">
                    ${Number(clientInfo.total_spent || 0).toFixed(2)}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">First booking</div>
                  <div className="text-lg font-semibold text-zinc-900">
                    {formatDate(clientInfo.first_booking_date)}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Last booking</div>
                  <div className="text-lg font-semibold text-zinc-900">
                    {formatDate(clientInfo.last_booking_date)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-zinc-900 mb-2" style={{ fontFamily: 'Manrope' }}>
                  Booking history
                </div>
                {detail?.bookings?.length ? (
                  <div className="space-y-2">
                    {detail.bookings.map((booking) => {
                      const status = String(booking.status || 'confirmed').toLowerCase();
                      return (
                        <div
                          key={booking.id}
                          className="rounded-lg border border-zinc-200 bg-white p-3 flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-zinc-900">
                              {formatDate(booking.booking_date)}
                              {booking.booking_time ? ` • ${booking.booking_time}` : ''}
                            </div>
                            <div className="text-sm text-zinc-600 truncate">
                              {booking.booth_type || booking.service_type || 'Service'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-emerald-700">
                              ${bookingTotalAmount(booking).toFixed(2)}
                            </div>
                            <Badge variant="outline" className={bookingStatusBadgeClass(status)}>
                              {status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500">No booking history available.</div>
                )}
              </div>

              <div>
                <Label htmlFor="client_notes" className="text-zinc-700">Internal notes</Label>
                <Textarea
                  id="client_notes"
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="mt-2 bg-zinc-50 min-h-[120px]"
                  placeholder="Add private notes about this client…"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="h-9"
                  >
                    {savingNotes ? 'Saving…' : 'Save notes'}
                  </Button>
                  {detail?.notes_updated_at ? (
                    <div className="text-xs text-zinc-500">
                      Updated {formatDate(detail.notes_updated_at)}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  disabled={!recentBooking?.id || requestingReview}
                  onClick={handleSendReviewRequest}
                >
                  {requestingReview ? 'Sending…' : 'Send review request'}
                </Button>
                <Button
                  type="button"
                  className="h-10 bg-rose-600 hover:bg-rose-700"
                  onClick={handleNewBooking}
                >
                  New booking
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
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
      className={`h-9 px-3 rounded-full text-xs font-semibold transition-colors border flex-shrink-0 sm:h-10 sm:px-5 sm:text-sm ${
        view === nextView
          ? 'bg-rose-600 text-white border-rose-600'
          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 dark:bg-zinc-950/20 dark:text-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50 dark:hover:text-white dark:hover:border-zinc-700/60'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Card data-testid="calendar-view-card" className="bg-white border border-zinc-200 shadow-sm rounded-xl">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle style={{fontFamily: 'Manrope'}}>Calendar View</CardTitle>
          <CardDescription style={{fontFamily: 'Inter'}}>
            View your bookings in calendar or list format
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDisplayMode('calendar')}
            className={`h-10 px-4 rounded-lg border flex items-center gap-2 text-xs font-semibold transition-colors sm:h-11 sm:px-6 sm:text-sm ${
              displayMode === 'calendar'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950/20 dark:text-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50 dark:hover:border-zinc-700/60'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('list')}
            className={`h-10 px-4 rounded-lg border flex items-center gap-2 text-xs font-semibold transition-colors sm:h-11 sm:px-6 sm:text-sm ${
              displayMode === 'list'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950/20 dark:text-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50 dark:hover:border-zinc-700/60'
            }`}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasRealBookings && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-200">
            Showing demo bookings for February 2026. Create a booking to see your real data here.
          </div>
        )}

        {displayMode === 'calendar' ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('TODAY')}
                  className="h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-xs font-semibold sm:h-10 sm:px-4 sm:text-sm dark:bg-zinc-950/20 dark:border-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-800/50 dark:hover:border-zinc-700/60 dark:hover:text-white"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => navigate('PREV')}
                  className="h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-xs font-semibold sm:h-10 sm:px-5 sm:text-sm dark:bg-zinc-950/20 dark:border-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-800/50 dark:hover:border-zinc-700/60 dark:hover:text-white"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => navigate('NEXT')}
                  className="h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-xs font-semibold sm:h-10 sm:px-5 sm:text-sm dark:bg-zinc-950/20 dark:border-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-800/50 dark:hover:border-zinc-700/60 dark:hover:text-white"
                >
                  Next
                </button>
              </div>

              <div className="text-sm font-semibold text-zinc-800 sm:text-base" style={{fontFamily: 'Manrope'}}>
                {title}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
                {viewButton('Month', Views.MONTH)}
                {viewButton('Week', Views.WEEK)}
                {viewButton('Day', Views.DAY)}
                {viewButton('Agenda', Views.AGENDA)}
              </div>
            </div>

            <div className="h-[520px] sm:h-[700px] overflow-x-auto">
              <div className="min-w-[640px] sm:min-w-0 h-full">
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
                    const isDark =
                      typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
                    return {
                      style: {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2',
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#fecaca',
                        color: isDark ? 'rgb(254, 202, 202)' : '#b91c1c',
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
                    <Badge
                      variant="outline"
                      className={bookingStatusBadgeClass(String(booking.status || 'confirmed').toLowerCase())}
                    >
                      {String(booking.status || 'confirmed').toLowerCase()}
                    </Badge>
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
	  const [fontFamily, setFontFamily] = useState('helvetica');
	  const [logoPosition, setLogoPosition] = useState('left');
	  const [showAbn, setShowAbn] = useState(true);
	  const [showDueDate, setShowDueDate] = useState(true);
	  const [showNotes, setShowNotes] = useState(true);
	  const [tableStyle, setTableStyle] = useState('minimal');
	  const [footerText, setFooterText] = useState('');
	  const [showPreview, setShowPreview] = useState(false);
	  const allowedTemplateNames = ['Classic', 'Clean', 'Gradient', 'Navy', 'Elegant', 'Sidebar'];

	  useEffect(() => {
	    loadTemplates();
	  }, []);

	  const resolveFontFamily = (tpl) => {
	    const raw = String(tpl?.font_family || '').trim().toLowerCase();
	    if (raw) return raw;
	    const name = String(tpl?.template_name || 'Classic').trim();
	    if (name === 'Elegant') return 'times';
	    return 'helvetica';
	  };

	  const resolveLogoPosition = (tpl) => {
	    const raw = String(tpl?.logo_position || '').trim().toLowerCase();
	    if (raw) return raw;
	    const name = String(tpl?.template_name || 'Classic').trim();
	    if (name === 'Elegant') return 'center';
	    if (name === 'Sidebar') return 'left';
	    return 'right';
	  };

	  const loadTemplates = async () => {
	    try {
	      const response = await axios.get(`${API}/invoices/templates`);
	      setTemplates(response.data);
	      const active = Array.isArray(response.data) ? response.data[0] : null;
	      if (active) {
	        const nextName = allowedTemplateNames.includes(active.template_name) ? active.template_name : 'Classic';
	        setSelectedTemplate(nextName);
	        setCustomColor(active.primary_color || '#e11d48');
	        setLogoUrl(active.logo_url || '');
	        setFontFamily(resolveFontFamily(active));
	        setLogoPosition(resolveLogoPosition(active));
	        setShowAbn(active.show_abn === undefined || active.show_abn === null ? true : Boolean(active.show_abn));
	        setShowDueDate(active.show_due_date === undefined || active.show_due_date === null ? true : Boolean(active.show_due_date));
	        setShowNotes(active.show_notes === undefined || active.show_notes === null ? true : Boolean(active.show_notes));
	        setTableStyle(String(active.table_style || 'minimal').trim().toLowerCase() || 'minimal');
	        setFooterText(String(active.footer_text || ''));
	      }
	    } catch (error) {
	      console.error('Failed to load templates:', error);
	    }
	  };

	  const handleSaveTemplate = async () => {
	    try {
	      await axios.post(`${API}/invoices/templates`, {
	        template_name: selectedTemplate,
	        logo_url: logoUrl || null,
	        primary_color: customColor,
	        font_family: fontFamily,
	        logo_position: logoPosition,
	        show_abn: Boolean(showAbn),
	        show_due_date: Boolean(showDueDate),
	        show_notes: Boolean(showNotes),
	        table_style: tableStyle,
	        footer_text: footerText || null,
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

	          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
	            <div>
	              <Label htmlFor="template-font-family">Font Family</Label>
	              <Select value={fontFamily} onValueChange={(v) => setFontFamily(String(v || 'helvetica'))}>
	                <SelectTrigger id="template-font-family" className="bg-zinc-50 mt-2">
	                  <SelectValue placeholder="Select font" />
	                </SelectTrigger>
	                <SelectContent>
	                  <SelectItem value="helvetica">Helvetica</SelectItem>
	                  <SelectItem value="times">Times</SelectItem>
	                  <SelectItem value="courier">Courier</SelectItem>
	                </SelectContent>
	              </Select>
	            </div>

	            <div>
	              <Label htmlFor="template-logo-position">Logo Position</Label>
	              <Select value={logoPosition} onValueChange={(v) => setLogoPosition(String(v || 'left'))}>
	                <SelectTrigger id="template-logo-position" className="bg-zinc-50 mt-2">
	                  <SelectValue placeholder="Select position" />
	                </SelectTrigger>
	                <SelectContent>
	                  <SelectItem value="left">Left</SelectItem>
	                  <SelectItem value="center">Center</SelectItem>
	                  <SelectItem value="right">Right</SelectItem>
	                </SelectContent>
	              </Select>
	            </div>

	            <div>
	              <Label htmlFor="template-table-style">Table Style</Label>
	              <Select value={tableStyle} onValueChange={(v) => setTableStyle(String(v || 'minimal'))}>
	                <SelectTrigger id="template-table-style" className="bg-zinc-50 mt-2">
	                  <SelectValue placeholder="Select style" />
	                </SelectTrigger>
	                <SelectContent>
	                  <SelectItem value="minimal">Minimal</SelectItem>
	                  <SelectItem value="bordered">Bordered</SelectItem>
	                  <SelectItem value="striped">Striped</SelectItem>
	                </SelectContent>
	              </Select>
	            </div>

	            <div className="space-y-3">
	              <Label>Show Fields</Label>
	              <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2">
	                <span className="text-sm text-zinc-700">Show ABN</span>
	                <Checkbox checked={Boolean(showAbn)} onCheckedChange={(v) => setShowAbn(Boolean(v))} />
	              </label>
	              <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2">
	                <span className="text-sm text-zinc-700">Show Due Date</span>
	                <Checkbox checked={Boolean(showDueDate)} onCheckedChange={(v) => setShowDueDate(Boolean(v))} />
	              </label>
	              <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2">
	                <span className="text-sm text-zinc-700">Show Notes</span>
	                <Checkbox checked={Boolean(showNotes)} onCheckedChange={(v) => setShowNotes(Boolean(v))} />
	              </label>
	            </div>
	          </div>

	          <div>
	            <Label htmlFor="template-footer-text">Footer Text (Optional)</Label>
	            <Textarea
	              id="template-footer-text"
	              value={footerText}
	              onChange={(e) => setFooterText(e.target.value)}
	              placeholder="e.g. Thank you for your business"
	              className="bg-zinc-50 mt-2"
	              rows={3}
	            />
	            <p className="text-xs text-zinc-500 mt-2">Shown at the bottom of the PDF invoice.</p>
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

// ============= Public Profile Tab =============
const PublicProfileTab = ({ business, onUpdate }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customerReviewsLoading, setCustomerReviewsLoading] = useState(false);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [formData, setFormData] = useState({
    public_enabled: Boolean(business?.public_enabled),
    public_description: business?.public_description || '',
    public_postcode: business?.public_postcode || '',
    public_photos: Array.isArray(business?.public_photos) ? business.public_photos : [],
    public_website: business?.public_website || '',
    public_services: Array.isArray(business?.public_services) ? business.public_services : [],
  });

  useEffect(() => {
    setFormData({
      public_enabled: Boolean(business?.public_enabled),
      public_description: business?.public_description || '',
      public_postcode: business?.public_postcode || '',
      public_photos: Array.isArray(business?.public_photos) ? business.public_photos : [],
      public_website: business?.public_website || '',
      public_services: Array.isArray(business?.public_services) ? business.public_services : [],
    });
  }, [business]);

  const refreshCustomerReviews = async () => {
    if (!business?.id) return;
    setCustomerReviewsLoading(true);
    try {
      const res = await axios.get(`${API}/business/reviews`);
      setCustomerReviews(Array.isArray(res.data?.reviews) ? res.data.reviews : []);
    } catch {
      setCustomerReviews([]);
    } finally {
      setCustomerReviewsLoading(false);
    }
  };

  useEffect(() => {
    refreshCustomerReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        public_enabled: Boolean(formData.public_enabled),
        public_postcode: String(formData.public_postcode || ''),
        public_website: String(formData.public_website || ''),
        public_description: String(formData.public_description || ''),
        public_photos: Array.isArray(formData.public_photos) ? formData.public_photos : [],
        public_services: Array.isArray(formData.public_services) ? formData.public_services : [],
      };

      const response = await axios.put(`${API}/business/profile`, payload);

      localStorage.setItem('dobook_business', JSON.stringify(minimizeBusinessForStorage(response.data)));
      onUpdate(response.data);
      toast.success('Public profile updated!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update public profile');
    } finally {
      setLoading(false);
    }
  };

  const profileUrl = business?.id ? `${window.location.origin}/discover/${business.id}` : '';
  const pendingCustomerReviews = (Array.isArray(customerReviews) ? customerReviews : []).filter(
    (r) => String(r?.status || 'pending').toLowerCase() === 'pending',
  );
  const approvedCustomerReviews = (Array.isArray(customerReviews) ? customerReviews : []).filter(
    (r) => String(r?.status || 'pending').toLowerCase() === 'approved',
  );

  return (
    <div className="space-y-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Public Profile</CardTitle>
          <CardDescription>
            Control what customers see on your discover page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show on directory</Label>
              <p className="text-sm text-muted-foreground">Customers can find you via Find services.</p>
            </div>
            <Switch
              checked={Boolean(formData.public_enabled)}
              onCheckedChange={(v) => setFormData({ ...formData, public_enabled: Boolean(v) })}
            />
          </div>

          <Separator />

          {Boolean(formData.public_enabled) && profileUrl ? (
            <div className="rounded-xl border border-border bg-muted/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Preview link</div>
                <div className="text-xs text-muted-foreground truncate">{profileUrl}</div>
              </div>
              <Button type="button" variant="outline" className="h-10 rounded-lg" onClick={() => router.push(`/discover/${business.id}`)}>
                Preview
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2 mb-4">
              <Label htmlFor="public_postcode">Postcode (optional)</Label>
              <Input
                id="public_postcode"
                value={formData.public_postcode || ''}
                onChange={(e) => setFormData({ ...formData, public_postcode: e.target.value })}
                placeholder="e.g. 3000"
                inputMode="numeric"
              />
            </div>

            <div className="grid gap-2 mb-4">
              <Label htmlFor="public_website">Website (optional)</Label>
              <Input
                id="public_website"
                value={formData.public_website || ''}
                onChange={(e) => setFormData({ ...formData, public_website: e.target.value })}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          <div className="grid gap-2 mb-4">
            <Label htmlFor="public_description">Business description</Label>
            <Textarea
              id="public_description"
              value={formData.public_description || ''}
              onChange={(e) => setFormData({ ...formData, public_description: e.target.value })}
              placeholder="Tell customers what you do, what’s included, and what areas you service…"
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-2">Max 2000 characters.</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">Photos</div>
                <div className="text-xs text-muted-foreground">Add up to 8 photo URLs.</div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() =>
                  setFormData({
                    ...formData,
                    public_photos: [...(Array.isArray(formData.public_photos) ? formData.public_photos : []), ""].slice(0, 8),
                  })
                }
              >
                Add photo
              </Button>
            </div>

            {(Array.isArray(formData.public_photos) ? formData.public_photos : []).length === 0 ? (
              <div className="text-sm text-muted-foreground">No photos yet.</div>
            ) : (
              <div className="space-y-3">
                {(formData.public_photos || []).map((url, idx) => (
                  <div key={`photo-${idx}`} className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden flex-shrink-0">
                      {String(url || "").trim() ? (
                        <img
                          src={String(url)}
                          alt={`Photo ${idx + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                    </div>
                    <Input
                      value={url}
                      onChange={(e) => {
                        const next = [...(formData.public_photos || [])];
                        next[idx] = e.target.value;
                        setFormData({ ...formData, public_photos: next });
                      }}
                      placeholder="https://... (image url)"
                      className="bg-zinc-50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10"
                      onClick={() => {
                        const next = (formData.public_photos || []).filter((_, i) => i !== idx);
                        setFormData({ ...formData, public_photos: next });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-zinc-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">Services</div>
                <div className="text-xs text-muted-foreground">List what you offer (optional pricing).</div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() =>
                  setFormData({
                    ...formData,
                    public_services: [
                      ...(Array.isArray(formData.public_services) ? formData.public_services : []),
                      { name: "", description: "", unit: "session", price: "" },
                    ].slice(0, 25),
                  })
                }
              >
                Add service
              </Button>
            </div>

            {(Array.isArray(formData.public_services) ? formData.public_services : []).length === 0 ? (
              <div className="text-sm text-muted-foreground">No services yet.</div>
            ) : (
              <div className="space-y-4">
                {(formData.public_services || []).map((s, idx) => (
                  <div key={`service-${idx}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-6 grid gap-2 mb-4">
                        <Label>Service name</Label>
                        <Input
                          value={s?.name || ""}
                          onChange={(e) => {
                            const next = [...(formData.public_services || [])];
                            next[idx] = { ...(next[idx] || {}), name: e.target.value };
                            setFormData({ ...formData, public_services: next });
                          }}
                          className="bg-white"
                          placeholder="e.g. 2 Hours"
                        />
                      </div>
                      <div className="md:col-span-3 grid gap-2 mb-4">
                        <Label>Price</Label>
                        <Input
                          value={s?.price ?? ""}
                          onChange={(e) => {
                            const next = [...(formData.public_services || [])];
                            next[idx] = { ...(next[idx] || {}), price: e.target.value };
                            setFormData({ ...formData, public_services: next });
                          }}
                          className="bg-white"
                          placeholder="e.g. 375"
                          inputMode="decimal"
                        />
                      </div>
                      <div className="md:col-span-3 grid gap-2 mb-4">
                        <Label>Unit</Label>
                        <Input
                          value={s?.unit || ""}
                          onChange={(e) => {
                            const next = [...(formData.public_services || [])];
                            next[idx] = { ...(next[idx] || {}), unit: e.target.value };
                            setFormData({ ...formData, public_services: next });
                          }}
                          className="bg-white"
                          placeholder="session"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2 mb-4">
                      <Label>Description (optional)</Label>
                      <Textarea
                        value={s?.description || ""}
                        onChange={(e) => {
                          const next = [...(formData.public_services || [])];
                          next[idx] = { ...(next[idx] || {}), description: e.target.value };
                          setFormData({ ...formData, public_services: next });
                        }}
                        className="bg-white"
                        rows={3}
                        placeholder="What’s included?"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10"
                        onClick={() => {
                          const next = (formData.public_services || []).filter((_, i) => i !== idx);
                          setFormData({ ...formData, public_services: next });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="w-full h-12 bg-rose-600 hover:bg-rose-700 rounded-xl"
          >
            {loading ? 'Saving...' : 'Save Public Profile'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle style={{fontFamily: 'Manrope'}}>Customer Reviews</CardTitle>
          <CardDescription>Approve reviews before they show on your public profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-zinc-600">
              Pending: <span className="font-semibold text-zinc-900">{pendingCustomerReviews.length}</span> • Approved:{' '}
              <span className="font-semibold text-zinc-900">{approvedCustomerReviews.length}</span>
            </div>
            <Button type="button" variant="outline" className="h-10 rounded-lg" onClick={refreshCustomerReviews} disabled={customerReviewsLoading}>
              {customerReviewsLoading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>

          {customerReviewsLoading ? (
            <div className="text-sm text-zinc-500">Loading reviews…</div>
          ) : pendingCustomerReviews.length ? (
            <div className="space-y-3">
              {pendingCustomerReviews.slice(0, 20).map((r) => (
                <div key={r.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-900 truncate">{r.customer_name || 'Customer'}</div>
                      <div className="text-sm text-zinc-700">{'★'.repeat(Math.max(0, Math.min(5, Number(r.rating || 0))))}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        className="h-9 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                        onClick={async () => {
                          try {
                            await axios.put(
                              `${API}/business/reviews/${r.id}`,
                              { status: 'approved' },
                            );
                            toast.success('Review approved');
                            refreshCustomerReviews();
                          } catch (e) {
                            toast.error(e.response?.data?.detail || 'Failed to approve review');
                          }
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                        onClick={async () => {
                          try {
                            await axios.put(
                              `${API}/business/reviews/${r.id}`,
                              { status: 'rejected' },
                            );
                            toast.success('Review rejected');
                            refreshCustomerReviews();
                          } catch (e) {
                            toast.error(e.response?.data?.detail || 'Failed to reject review');
                          }
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-700 whitespace-pre-line">{r.comment}</div>
                  {r.created_at ? (
                    <div className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-zinc-500">
              No pending reviews yet. Use <span className="font-semibold">Request review</span> on a booking to email the customer.
            </div>
          )}
        </CardContent>
      </Card>
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

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-6" data-testid="booking-widget">
      <div className="max-w-2xl mx-auto">
		        <div className="text-center mb-8">
		          <div className="inline-flex items-center gap-3 mb-4">
		            <img
		              src={business?.logo_src || DOBOOK_LOGO_PNG}
		              alt={String(business?.business_name || 'Business logo')}
		              style={{ height: 84, width: 'auto', maxWidth: 240 }}
		              className="select-none"
		              draggable={false}
		              onError={(e) => { e.currentTarget.src = DOBOOK_LOGO_PNG; }}
		            />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookingFields.map((field) => {
                  const key = String(field?.key || '').trim();
                  if (!key) return null;
                  const type = String(field?.type || 'text').trim();
                  const label = String(field?.label || key).trim();
                  const required = Boolean(field?.required);
                  const placeholder = String(field?.placeholder || '').trim();

                  const column = field?.column;
                  const value = column
                    ? formData?.[column]
                    : (formData.custom_fields?.[key] ?? "");

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

                  if (type === "address") {
                    return (
                      <div key={key} className="md:col-span-2">
                        <Label htmlFor={key}>
                          {label}
                          {required ? " *" : ""}
                        </Label>
                        <AddressAutocomplete
                          value={String(formData.event_location || "")}
                          onChange={(val, item) =>
                            setFormData({ ...formData, event_location: val, event_location_geo: item || null })
                          }
                          placeholder={placeholder || "Enter venue or address"}
                          className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                          inputProps={{ id: key, required, "data-testid": "widget-location-input" }}
                        />
                      </div>
                    );
                  }

                  if (type === "select_services") {
                    const selected = column ? String(formData?.[column] || "") : String(value || "");
                    const options = boothTypes;
                    return (
                      <div key={key}>
                        <Label htmlFor={key}>
                          {label}
                          {required ? " *" : ""}
                        </Label>
                        <Select
                          value={selected}
                          onValueChange={(val) => setValue(val)}
                        >
                          <SelectTrigger
                            data-testid="widget-booth-select"
                            className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }

                  if (type === "package_duration") {
                    return (
                      <div key={key}>
                        <Label htmlFor={key}>
                          {label}
                          {required ? " *" : ""}
                        </Label>
                        <Select
                          value={String(formData.package_duration || "")}
                          onValueChange={(val) => {
                            const hours = parseInt(String(val || "").replaceAll(/\D+/g, ""), 10);
                            setFormData({
                              ...formData,
                              package_duration: val,
                              duration_minutes: Number.isFinite(hours) ? hours * 60 : formData.duration_minutes,
                            });
                          }}
                        >
                          <SelectTrigger
                            data-testid="widget-package-select"
                            className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                          >
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
                    );
                  }

                  if (type === "time_window") {
                    const options = Array.isArray(field?.options) ? field.options : [];
                    return (
                      <div key={key}>
                        <Label htmlFor={key}>
                          {label}
                          {required ? " *" : ""}
                        </Label>
                        <Select
                          value={String(value || "")}
                          onValueChange={(val) => {
                            const selected = options.find((o) => String(o?.value) === String(val));
                            setFormData({
                              ...formData,
                              booking_time: String(selected?.booking_time || "09:00"),
                              custom_fields: { ...(formData.custom_fields || {}), [key]: val },
                            });
                          }}
                        >
                          <SelectTrigger className="bg-zinc-50 border-zinc-200 rounded-lg h-11 mt-2">
                            <SelectValue placeholder="Select..." />
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
                    type === "email" || type === "tel" || type === "date" || type === "time"
                      ? type
                      : (type === "number" || type === "money")
                        ? "number"
                        : "text";

                  return (
                    <div key={key} className={type === "textarea" ? "md:col-span-2" : ""}>
                      <Label htmlFor={key}>
                        {label}
                        {required ? " *" : ""}
                      </Label>
                      {type === "textarea" ? (
                        <Textarea
                          id={key}
                          value={String(value ?? "")}
                          onChange={(e) => setValue(e.target.value)}
                          className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg mt-2"
                          rows={3}
                        />
                      ) : (
                        <Input
                          id={key}
                          data-testid={key === "customer_phone" ? "widget-phone-input" : undefined}
                          type={inputType}
                          step={type === "money" ? "0.01" : undefined}
                          min={type === "money" || type === "number" ? "0" : undefined}
                          value={String(value ?? "")}
                          onChange={(e) => {
                            if (type === "money" || type === "number") setValue(e.target.value);
                            else setValue(e.target.value);
                          }}
                          placeholder={placeholder || undefined}
                          required={required}
                          inputMode={type === "tel" ? "tel" : undefined}
                          className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11"
                        />
                      )}
                      {key === "customer_phone" ? (
                        <p className="text-xs text-zinc-500 mt-1">{phoneValidationHint()}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {extraFormFields.length > 0 ? (
                <div className="pt-2">
                  <div className="text-sm font-semibold mb-2 text-zinc-800">Additional Details</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <div key={key} className="md:col-span-2">
                            <Label>
                              {label}
                              {required ? ' *' : ''}
                            </Label>
                            {isPrivate ? (
                              <div className="text-[11px] text-zinc-500 mt-1">
                                {key === "health_notes"
                                  ? "Private notes — only visible to your practitioner. Not included in emails."
                                  : "Private — not included in emails."}
                              </div>
                            ) : null}
                            <Textarea
                              value={String(value ?? '')}
                              onChange={(e) => setValue(e.target.value)}
                              className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg mt-2"
                              rows={3}
                            />
                          </div>
                        );
                      }

                      if (type === 'select') {
                        const options = Array.isArray(f?.field_options) ? f.field_options : [];
                        return (
                          <div key={key}>
                            <Label>
                              {label}
                              {required ? ' *' : ''}
                            </Label>
                            {isPrivate ? (
                              <div className="text-[11px] text-zinc-500 mt-1">Private — not included in emails.</div>
                            ) : null}
                            <Select value={String(value ?? '')} onValueChange={(v) => setValue(v)}>
                              <SelectTrigger className="bg-zinc-50 border-zinc-200 rounded-lg h-11 mt-2">
                                <SelectValue placeholder="Select..." />
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
                          <div key={key} className="md:col-span-2">
                            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
                              <Checkbox checked={Boolean(value)} onCheckedChange={(v) => setValue(Boolean(v))} />
                              <div className="font-medium text-zinc-800">
                                {label}
                                {required ? ' *' : ''}
                              </div>
                            </div>
                            {isPrivate ? (
                              <div className="text-[11px] text-zinc-500 mt-2">Private — not included in emails.</div>
                            ) : null}
                          </div>
                        );
                      }

                      if (type === 'file') {
                        const isUploading = Boolean(uploadingFields?.[key]);
                        const filesValue = Array.isArray(value) ? value : [];
                        return (
                          <div key={key} className="md:col-span-2">
                            <Label>
                              {label}
                              {required ? ' *' : ''}
                            </Label>
                            {isPrivate ? (
                              <div className="text-[11px] text-zinc-500 mt-1">Private — not included in emails.</div>
                            ) : null}
                            <Input
                              type="file"
                              multiple
                              className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11 mt-2"
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
                        <div key={key}>
                          <Label>
                            {label}
                            {required ? ' *' : ''}
                          </Label>
                          {isPrivate ? (
                            <div className="text-[11px] text-zinc-500 mt-1">Private — not included in emails.</div>
                          ) : null}
                          <Input
                            type={inputType}
                            value={String(value ?? '')}
                            onChange={(e) => setValue(e.target.value)}
                            className="bg-zinc-50 border-zinc-200 focus:ring-2 focus:ring-rose-100 focus:border-rose-500 rounded-lg h-11 mt-2"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : extraFields.length > 0 ? (
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
              ) : null}

              {serviceAddons.length > 0 && (
                <div className="pt-2">
                  <div className="text-sm font-semibold mb-2 text-zinc-800">Extras</div>
                  <div className="space-y-2">
                    {serviceAddons.map((a) => {
                      const id = String(a?.id || '').trim();
                      if (!id) return null;
                      const checked = Array.isArray(formData.addon_ids) ? formData.addon_ids.includes(id) : false;
                      const price = Number(a?.price || 0);
                      const desc = String(a?.description || '').trim();
                      return (
                        <div key={id} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = new Set(Array.isArray(formData.addon_ids) ? formData.addon_ids : []);
                              if (Boolean(v)) next.add(id);
                              else next.delete(id);
                              setFormData({ ...formData, addon_ids: Array.from(next) });
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium text-zinc-800">{String(a?.name || 'Extra')}</div>
                              <div className="text-sm font-semibold text-zinc-900">{price ? `$${price.toFixed(2)}` : '—'}</div>
                            </div>
                            {desc ? <div className="text-xs text-zinc-500 mt-1">{desc}</div> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {Boolean(business?.travel_fee_enabled) ||
              (Boolean(business?.cbd_fee_enabled) && Number(business?.cbd_fee_amount || 0) > 0) ? (
                <div className="pt-2 border-t">
                  <div className="text-sm font-semibold mb-2 text-zinc-800">Additional charges</div>
                  <div className="space-y-3">
                    {Boolean(business?.travel_fee_enabled) && (
                      <div className="p-3 rounded-xl border border-zinc-200 bg-white">
                        <div className="font-medium">{String(business?.travel_fee_label || 'Travel charge')}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          Travel charges are added automatically if your address is more than{" "}
                          <strong>{Number(business?.travel_fee_free_km || 40)}</strong> km away. Rate:{" "}
                          <strong>${Number(business?.travel_fee_rate_per_km || 0.4).toFixed(2)}/km</strong> for the
                          distance over {Number(business?.travel_fee_free_km || 40)} km.
                        </div>
                      </div>
                    )}

	                    {Boolean(business?.cbd_fee_enabled) && Number(business?.cbd_fee_amount || 0) > 0 && (
	                      <div className="p-3 rounded-xl border border-zinc-200 bg-white flex items-start justify-between gap-4">
	                        <div>
	                          <div className="font-medium">{String(business?.cbd_fee_label || 'CBD logistics')}</div>
	                          <div className="text-xs text-zinc-500 mt-1">
	                            Applied automatically when the booking address postcode is <strong>3000</strong>.
	                          </div>
	                        </div>
	                        <div className="font-semibold text-zinc-800">+${Number(business?.cbd_fee_amount || 0).toFixed(2)}</div>
	                      </div>
	                    )}
	                  </div>
	                </div>
	              ) : null}

              <Button 
                data-testid="widget-submit-btn"
                type="submit" 
                disabled={loading}
                className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
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

export function asMoney(value) {
    const n = Number(value || 0);
    return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

export function asMoneyNoCents(value) {
    const n = Number(value || 0);
    return `$${Number.isFinite(n) ? n.toFixed(0) : "0"}`;
}

export function asNumber(value, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return n;
}

export function formatHours(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return "";
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function normalizeInvoiceItems({ booking, business }) {
    const raw = booking?.line_items;
    const items = Array.isArray(raw) ? raw : [];

    const normalized = items
        .map((it) => {
            const description = String(it?.description || "").trim();
            if (!description) return null;
            const qty = Math.max(1, Math.floor(asNumber(it?.qty, 1)));
            const unit_price = asNumber(it?.unit_price, 0);
            const total = Number.isFinite(asNumber(it?.total, NaN)) ? asNumber(it?.total, 0) : unit_price * qty;
            return {
                description,
                qty,
                unit_price,
                total,
            };
        })
        .filter(Boolean);

    if (normalized.length) return normalized;

    // Back-compat: build a single line item from booking fields.
    const qty = Math.max(1, asNumber(booking?.quantity, 1));
    const unit = asNumber(booking?.price, 0);

    const booth = String(booking?.booth_type || booking?.service_type || "Booking").trim() || "Booking";
    const hoursRaw = booking?.duration_minutes ? asNumber(booking.duration_minutes, 60) / 60 : 0;
    const hours = formatHours(hoursRaw) || "1";
    const hourLabel = Number(hours) === 1 ? "Hour" : "Hours";
    const description = `${hours} ${hourLabel} ${booth}`;

    return [
        {
            description,
            qty,
            unit_price: unit,
            total: unit * qty,
        },
    ];
}

export function clampByte(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(255, Math.round(v)));
}

export function hexToRgb(hex) {
    const s = String(hex || "").trim();
    const m = s.match(/^#?([0-9a-f]{6})$/i);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    // eslint-disable-next-line no-bitwise
    const r = (n >> 16) & 255;
    // eslint-disable-next-line no-bitwise
    const g = (n >> 8) & 255;
    // eslint-disable-next-line no-bitwise
    const b = n & 255;
    return { r, g, b };
}

export function formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
}

export function formatAuDateDots(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}.${mm}.${yyyy}`;
}

export function formatDateShort(value) {
    return formatAuDateDots(value) || formatDate(value);
}

export async function fetchImageAsDataUrl(url) {
    const src = String(url || "").trim();
    if (!src) return null;

    if (/^data:image\//i.test(src)) {
        const m = src.match(/^data:(image\/[a-z0-9.+-]+);base64,/i);
        const type = String(m?.[1] || "").toLowerCase();
        const format =
            type.includes("png") ? "PNG" :
                (type.includes("jpeg") || type.includes("jpg")) ? "JPEG" :
                    null;
        if (!format) return null;
        return { dataUrl: src, format, contentType: type };
    }

    if (!/^https?:\/\//i.test(src)) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
        const res = await fetch(src, { signal: controller.signal });
        if (!res.ok) return null;
        const type = String(res.headers.get("content-type") || "").toLowerCase();
        if (!type.startsWith("image/")) return null;

        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 1_500_000) return null; // keep PDFs small

        const b64 = buf.toString("base64");
        const format =
            type.includes("png") ? "PNG" :
                (type.includes("jpeg") || type.includes("jpg")) ? "JPEG" :
                    null;
        if (!format) return null;
        return { dataUrl: `data:${type};base64,${b64}`, format, contentType: type };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

export function decodeDataUrlBase64(dataUrl) {
    const s = String(dataUrl || "");
    const idx = s.indexOf("base64,");
    if (idx < 0) return null;
    const b64 = s.slice(idx + "base64,".length);
    try {
        return Buffer.from(b64, "base64");
    } catch {
        return null;
    }
}

export function getImageDimensions(asset) {
    if (!asset?.dataUrl || !asset?.format) return null;
    const buf = decodeDataUrlBase64(asset.dataUrl);
    if (!buf || buf.length < 32) return null;

    if (asset.format === "PNG") {
        // PNG: width/height at IHDR (offset 16/20)
        try {
            const width = buf.readUInt32BE(16);
            const height = buf.readUInt32BE(20);
            if (!width || !height) return null;
            return { width, height };
        } catch {
            return null;
        }
    }

    if (asset.format === "JPEG") {
        // JPEG: parse markers until SOF0/SOF2
        let offset = 2;
        while (offset + 9 < buf.length) {
            if (buf[offset] !== 0xff) return null;
            const marker = buf[offset + 1];
            // SOI/EOI or fill bytes
            if (marker === 0xd8 || marker === 0xd9) {
                offset += 2;
                continue;
            }
            const len = buf.readUInt16BE(offset + 2);
            if (len < 2) return null;
            const isSof = marker === 0xc0 || marker === 0xc2;
            if (isSof && offset + 2 + len <= buf.length) {
                const height = buf.readUInt16BE(offset + 5);
                const width = buf.readUInt16BE(offset + 7);
                if (!width || !height) return null;
                return { width, height };
            }
            offset += 2 + len;
        }
    }

    return null;
}

export function commonInvoiceData({ booking, business }) {
    const items = normalizeInvoiceItems({ booking, business });
    const subtotal = items.reduce((sum, it) => sum + asNumber(it?.total, 0), 0);
    const tax = 0;
    const total = subtotal + tax;

    const first = items[0] || { description: "Booking", qty: 1, unit_price: 0, total: 0 };
    const qty = Math.max(1, asNumber(first.qty, 1));
    const unit = asNumber(first.unit_price, 0);
    const description = String(first.description || "Booking");

    const invoiceNo = booking?.invoice_id || `INV-${String(booking?.id || "").slice(0, 8).toUpperCase()}`;
    const invoiceDate = booking?.invoice_date || new Date().toISOString();
    const dueDate = booking?.due_date || booking?.booking_date || "";

    const businessName = String(business?.business_name || "").trim() || "Business";
    const businessAddress = String(business?.business_address || "").trim();
    const businessEmail = String(business?.email || "").trim();

    const customerName = String(booking?.customer_name || "").trim() || "Customer";
    const customerEmail = String(booking?.customer_email || "").trim();

    const bankLines = [
        String(business?.account_name || "").trim(),
        String(business?.bank_name || "").trim(),
        business?.bsb ? `BSB: ${String(business.bsb)}` : "",
        business?.account_number ? `Account number: ${String(business.account_number)}` : "",
    ].filter(Boolean);

    const paymentLink = String(business?.payment_link || "").trim();

    return {
        qty,
        unit,
        total,
        subtotal,
        tax,
        description,
        items,
        invoiceNo,
        invoiceDate,
        dueDate,
        businessName,
        businessAddress,
        businessEmail,
        customerName,
        customerEmail,
        bankLines,
        paymentLink,
    };
}

export function normalizeTemplateSettings(templateName, templateSettings) {
    const t = (templateSettings && typeof templateSettings === "object") ? templateSettings : {};

    const fontRaw = String(t.font_family || "").trim().toLowerCase();
    const legacyFont = templateName === "Elegant" ? "times" : "helvetica";
    const font_family = (["helvetica", "times", "courier"].includes(fontRaw) ? fontRaw : "") || legacyFont;

    const logoRaw = String(t.logo_position || "").trim().toLowerCase();
    // Back-compat: preserve the current per-template logo placement if the DB column is missing/null.
    const legacyLogoPosition =
        templateName === "Elegant" ? "center" :
            templateName === "Sidebar" ? "left" :
                "right";
    const logo_position = (["left", "center", "right"].includes(logoRaw) ? logoRaw : "") || legacyLogoPosition;

    const tableRaw = String(t.table_style || "").trim().toLowerCase();
    const table_style = ["minimal", "bordered", "striped"].includes(tableRaw) ? tableRaw : "minimal";

    const asBool = (v, fallback) => {
        if (v === true || v === false) return v;
        if (v === null || v === undefined) return fallback;
        return Boolean(v);
    };

    const show_abn = asBool(t.show_abn, true);
    const show_due_date = asBool(t.show_due_date, true);
    const show_notes = asBool(t.show_notes, true);

    const footer_text = String(t.footer_text || "").trim();

    const normalizeHex = (v, fallback) => {
        const raw = String(v || "").trim();
        if (!raw) return fallback;
        const s = raw.startsWith("#") ? raw : `#${raw}`;
        if (!/^#[0-9a-f]{6}$/i.test(s)) return fallback;
        return s.toLowerCase();
    };

    const primary_color = normalizeHex(t.primary_color, "#e11d48");
    const secondary_color = normalizeHex(t.secondary_color, null);

    return {
        ...t,
        font_family,
        logo_position,
        show_abn,
        show_due_date,
        show_notes,
        table_style,
        footer_text,
        primary_color,
        secondary_color,
    };
}

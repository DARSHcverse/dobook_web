import zlib from "node:zlib";

function isWhitespace(ch) {
  return ch === " " || ch === "\n" || ch === "\r" || ch === "\t" || ch === "\f";
}

function skipWhitespace(str, i) {
  while (i < str.length && isWhitespace(str[i])) i += 1;
  return i;
}

function parsePdfLiteralString(str, startIndex) {
  // Parses a PDF literal string starting at "(" and returns { value, nextIndex } where nextIndex is after ")".
  let i = startIndex;
  if (str[i] !== "(") return null;
  i += 1;

  let nesting = 1;
  let out = "";

  while (i < str.length && nesting > 0) {
    const ch = str[i];

    if (ch === "\\") {
      const next = str[i + 1];
      if (next === undefined) break;

      // Line continuation: backslash followed by newline should be ignored.
      if (next === "\n") {
        i += 2;
        continue;
      }
      if (next === "\r") {
        if (str[i + 2] === "\n") i += 3;
        else i += 2;
        continue;
      }

      // Standard escapes
      if (next === "n") out += "\n";
      else if (next === "r") out += "\r";
      else if (next === "t") out += "\t";
      else if (next === "b") out += "\b";
      else if (next === "f") out += "\f";
      else if (next === "(") out += "(";
      else if (next === ")") out += ")";
      else if (next === "\\") out += "\\";
      else if (next >= "0" && next <= "7") {
        // Octal escape: up to 3 digits
        const o1 = str[i + 1];
        const o2 = str[i + 2];
        const o3 = str[i + 3];
        const oct =
          o1 +
          (o2 >= "0" && o2 <= "7" ? o2 : "") +
          (o3 >= "0" && o3 <= "7" ? o3 : "");
        out += String.fromCharCode(parseInt(oct, 8));
        i += 1 + oct.length;
        continue;
      } else out += next;

      i += 2;
      continue;
    }

    if (ch === "(") {
      nesting += 1;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === ")") {
      nesting -= 1;
      if (nesting === 0) {
        i += 1;
        break;
      }
      out += ch;
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  return { value: out, nextIndex: i };
}

function parsePdfHexString(str, startIndex) {
  // Parses a PDF hex string <...> (not a dictionary << >>).
  if (str[startIndex] !== "<" || str[startIndex + 1] === "<") return null;
  let i = startIndex + 1;
  let hex = "";
  while (i < str.length && str[i] !== ">") {
    const ch = str[i];
    if (!isWhitespace(ch)) hex += ch;
    i += 1;
  }
  if (str[i] !== ">") return null;
  i += 1;
  if (hex.length % 2 === 1) hex += "0";

  let out = "";
  for (let p = 0; p < hex.length; p += 2) {
    const b = parseInt(hex.slice(p, p + 2), 16);
    if (!Number.isNaN(b)) out += String.fromCharCode(b);
  }
  return { value: out, nextIndex: i };
}

function extractTextFromContentStream(streamStr) {
  const parts = [];
  let i = 0;

  while (i < streamStr.length) {
    const ch = streamStr[i];

    // TJ arrays: [ (A) 120 (B) ] TJ
    if (ch === "[") {
      let j = i + 1;
      const arrayParts = [];
      while (j < streamStr.length && streamStr[j] !== "]") {
        if (streamStr[j] === "(") {
          const parsed = parsePdfLiteralString(streamStr, j);
          if (parsed) {
            arrayParts.push(parsed.value);
            j = parsed.nextIndex;
            continue;
          }
        } else if (streamStr[j] === "<" && streamStr[j + 1] !== "<") {
          const parsed = parsePdfHexString(streamStr, j);
          if (parsed) {
            arrayParts.push(parsed.value);
            j = parsed.nextIndex;
            continue;
          }
        }
        j += 1;
      }

      if (streamStr[j] === "]") {
        let k = skipWhitespace(streamStr, j + 1);
        if (streamStr.slice(k, k + 2) === "TJ") {
          if (arrayParts.length) parts.push(arrayParts.join(""));
          i = k + 2;
          continue;
        }
      }
    }

    // Tj operator: (Text) Tj
    if (ch === "(") {
      const parsed = parsePdfLiteralString(streamStr, i);
      if (parsed) {
        let k = skipWhitespace(streamStr, parsed.nextIndex);
        if (streamStr.slice(k, k + 2) === "Tj") {
          parts.push(parsed.value);
          i = k + 2;
          continue;
        }
        i = parsed.nextIndex;
        continue;
      }
    }

    // Hex string text: <54657874> Tj
    if (ch === "<" && streamStr[i + 1] !== "<") {
      const parsed = parsePdfHexString(streamStr, i);
      if (parsed) {
        let k = skipWhitespace(streamStr, parsed.nextIndex);
        if (streamStr.slice(k, k + 2) === "Tj") {
          parts.push(parsed.value);
          i = k + 2;
          continue;
        }
        i = parsed.nextIndex;
        continue;
      }
    }

    i += 1;
  }

  return parts.join("\n");
}

function findPdfStreams(pdfBinaryStr, pdfBuffer) {
  const streams = [];
  let i = 0;

  while (i < pdfBinaryStr.length) {
    const streamIndex = pdfBinaryStr.indexOf("stream", i);
    if (streamIndex === -1) break;

    const after = streamIndex + "stream".length;
    const eolLen = pdfBinaryStr.startsWith("\r\n", after)
      ? 2
      : pdfBinaryStr.startsWith("\n", after)
        ? 1
        : 0;
    if (!eolLen) {
      i = after;
      continue;
    }

    const dataStart = after + eolLen;
    const endStreamIndex = pdfBinaryStr.indexOf("endstream", dataStart);
    if (endStreamIndex === -1) break;

    const dictEnd = pdfBinaryStr.lastIndexOf(">>", streamIndex);
    const dictStart = dictEnd !== -1 ? pdfBinaryStr.lastIndexOf("<<", dictEnd) : -1;
    const dictStr =
      dictStart !== -1 && dictEnd !== -1 && dictStart < dictEnd
        ? pdfBinaryStr.slice(dictStart, dictEnd + 2)
        : "";

    const raw = pdfBuffer.subarray(dataStart, endStreamIndex);
    streams.push({ dictStr, raw });

    i = endStreamIndex + "endstream".length;
  }

  return streams;
}

export function extractTextFromPdfBuffer(pdfBuffer) {
  if (!pdfBuffer || pdfBuffer.length === 0) return "";
  const pdfBinaryStr = Buffer.from(pdfBuffer).toString("latin1");
  const streams = findPdfStreams(pdfBinaryStr, Buffer.from(pdfBuffer));

  const textParts = [];
  for (const s of streams) {
    let decoded = s.raw;
    if (s.dictStr.includes("/FlateDecode")) {
      try {
        decoded = zlib.inflateSync(s.raw);
      } catch {
        // If inflate fails, skip decoding and try raw bytes.
        decoded = s.raw;
      }
    }

    const streamStr = Buffer.from(decoded).toString("latin1");
    const extracted = extractTextFromContentStream(streamStr);
    if (extracted) textParts.push(extracted);
  }

  // Fallback: some PDFs may contain uncompressed strings outside streams.
  if (!textParts.length) {
    const rough = pdfBinaryStr.replace(/\u0000/g, "");
    return rough;
  }

  return textParts.join("\n");
}

function normalizeExtractedText(text) {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t\f]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

function parsePriceToNumber(priceText) {
  const raw = String(priceText || "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function buildWholeTextFieldRegex(label, nextLabels) {
  const next = nextLabels.length
    ? `(?=\\s*(?:${nextLabels.map((l) => l.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|")})\\s*:|$)`
    : "$";
  const escaped = label.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return new RegExp(`${escaped}\\s*:?\\s*([^\\n]+?)\\s*${next}`, "i");
}

export function extractBookingDetailsFromText(inputText) {
  const text = normalizeExtractedText(inputText);
  if (!text) return {};

  const labelOrder = [
    "Invoice Number",
    "Name",
    "Email",
    "Phone Number",
    "Event Date",
    "Event Location",
    "Booth Type",
    "Package Duration",
    "Service Type",
    "Price",
    "Message",
  ];

  const fields = {
    invoice_number: null,
    name: null,
    email: null,
    phone_number: null,
    event_date: null,
    event_location: null,
    booth_type: null,
    package_duration: null,
    service_type: null,
    price_text: null,
    message: null,
  };

  const labelToKey = {
    "Invoice Number": "invoice_number",
    Name: "name",
    Email: "email",
    "Phone Number": "phone_number",
    "Event Date": "event_date",
    "Event Location": "event_location",
    "Booth Type": "booth_type",
    "Package Duration": "package_duration",
    "Service Type": "service_type",
    Price: "price_text",
    Message: "message",
  };

  const patterns = {
    invoice_number: /^Invoice\s*Number\s*:?\s*(.*)$/i,
    name: /^Name\s*:?\s*(.*)$/i,
    email: /^Email\s*:?\s*(.*)$/i,
    phone_number: /^Phone\s*Number\s*:?\s*(.*)$/i,
    event_date: /^Event\s*Date\s*:?\s*(.*)$/i,
    event_location: /^Event\s*Location\s*:?\s*(.*)$/i,
    booth_type: /^Booth\s*Type\s*:?\s*(.*)$/i,
    package_duration: /^Package\s*Duration\s*:?\s*(.*)$/i,
    service_type: /^Service\s*Type\s*:?\s*(.*)$/i,
    price_text: /^Price\s*:?\s*(.*)$/i,
    message: /^Message\s*:?\s*(.*)$/i,
  };

  const lines = text.split("\n").map((l) => l.trim());
  const isAnyLabelLine = (line) =>
    labelOrder.some((lbl) => new RegExp(`^${lbl.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*:`, "i").test(line));

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || /^New\s*Booking\s*Details\s*:?\s*$/i.test(line)) continue;

    for (const [key, re] of Object.entries(patterns)) {
      const m = line.match(re);
      if (!m) continue;

      let value = String(m[1] || "").trim();
      if (!value) {
        // If the value is on the next line, grab the next non-empty line that isn't another label.
        for (let j = i + 1; j < Math.min(lines.length, i + 6); j += 1) {
          const cand = lines[j];
          if (!cand) continue;
          if (isAnyLabelLine(cand)) break;
          value = cand.trim();
          break;
        }
      }

      if (key === "message") {
        const messageLines = [];
        if (value) messageLines.push(value);
        for (let j = i + 1; j < lines.length; j += 1) {
          const cand = lines[j];
          if (!cand) continue;
          if (Object.values(patterns).some((r) => r.test(cand))) break;
          messageLines.push(cand);
        }
        const msg = messageLines.join("\n").trim();
        if (msg) fields.message = msg;
      } else if (value) {
        fields[key] = value;
      }
    }
  }

  // Whole-text fallback (helps when PDF extraction collapses newlines).
  for (let idx = 0; idx < labelOrder.length; idx += 1) {
    const label = labelOrder[idx];
    const key = labelToKey[label];
    if (fields[key]) continue;

    const nextLabels = labelOrder.slice(idx + 1);
    const re = buildWholeTextFieldRegex(label, nextLabels);
    const m = text.match(re);
    if (m && String(m[1] || "").trim()) fields[key] = String(m[1]).trim();
  }

  const price = parsePriceToNumber(fields.price_text);

  const extracted_data = {};
  if (fields.invoice_number) extracted_data.invoice_number = fields.invoice_number;
  if (fields.name) extracted_data.customer_name = fields.name;
  if (fields.email) extracted_data.customer_email = fields.email;
  if (fields.phone_number) extracted_data.customer_phone = fields.phone_number;
  if (fields.event_date) extracted_data.booking_date = fields.event_date;
  if (fields.event_location) extracted_data.event_location = fields.event_location;
  if (fields.booth_type) extracted_data.booth_type = fields.booth_type;
  if (fields.package_duration) extracted_data.package_duration = fields.package_duration;
  if (fields.service_type) extracted_data.service_type = fields.service_type;
  if (price !== null) extracted_data.price = price;

  if (fields.message) {
    extracted_data.message = fields.message;
    extracted_data.notes = fields.message;
  }

  return extracted_data;
}


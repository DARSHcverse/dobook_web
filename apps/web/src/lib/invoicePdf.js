import jsPDF from "jspdf";
import { fetchImageAsDataUrl, normalizeTemplateSettings } from "./invoice/utils";
import {
  renderClassic,
  renderClean,
  renderGradient,
  renderNavy,
  renderElegant,
  renderSidebar,
} from "./invoice/templates";

export async function generateInvoicePdfBase64({ booking, business, template }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 72;

  const logoUrl = String(template?.logo_url || business?.logo_url || "").trim();
  const logoAsset = await fetchImageAsDataUrl(logoUrl);

  const templateName = String(template?.template_name || "Classic").trim() || "Classic";
  const templateSettings = normalizeTemplateSettings(templateName, template);

  const data = { pageW, pageH, marginX, booking, business, logoAsset };

  if (templateName === "Clean") renderClean(doc, data, templateSettings);
  else if (templateName === "Gradient") renderGradient(doc, data, templateSettings);
  else if (templateName === "Navy") renderNavy(doc, data, templateSettings);
  else if (templateName === "Elegant") renderElegant(doc, data, templateSettings);
  else if (templateName === "Sidebar") renderSidebar(doc, data, templateSettings);
  else renderClassic(doc, data, templateSettings);

  const buf = doc.output("arraybuffer");
  return Buffer.from(buf).toString("base64");
}

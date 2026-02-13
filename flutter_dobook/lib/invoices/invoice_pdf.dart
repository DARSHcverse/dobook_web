import 'dart:convert';
import 'dart:typed_data';

import 'package:dobook/data/models/booking.dart';
import 'package:dobook/data/models/business.dart';
import 'package:dobook/util/format.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

class InvoicePdf {
  static Future<Uint8List> build({
    required Business business,
    required Booking booking,
  }) async {
    final doc = pw.Document();

    final logoBytes = _decodeDataUri(business.logoUrl);
    pw.MemoryImage? logo;
    if (logoBytes != null) {
      logo = pw.MemoryImage(logoBytes);
    }

    final invoiceDate = DateTime.tryParse(booking.invoiceDate);
    final dueDate = DateTime.tryParse(booking.dueDate);
    final dateFmt = DateFormat('dd.MM.yyyy');

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (context) => [
          pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Expanded(
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      business.businessName.isEmpty
                          ? 'DoBook'
                          : business.businessName,
                      style: pw.TextStyle(
                        fontSize: 20,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    if (business.businessAddress.trim().isNotEmpty) ...[
                      pw.SizedBox(height: 6),
                      pw.Text(business.businessAddress.trim()),
                    ],
                    if (business.phone?.trim().isNotEmpty == true)
                      pw.Text('Phone: ${business.phone}'),
                    if (business.email.trim().isNotEmpty)
                      pw.Text('Email: ${business.email}'),
                    if (business.abn.trim().isNotEmpty)
                      pw.Text('ABN: ${business.abn}'),
                  ],
                ),
              ),
              if (logo != null)
                pw.Container(
                  width: 120,
                  height: 80,
                  alignment: pw.Alignment.centerRight,
                  child: pw.Image(logo, fit: pw.BoxFit.contain),
                ),
            ],
          ),
          pw.SizedBox(height: 18),
          pw.Container(
            padding: const pw.EdgeInsets.all(12),
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: PdfColors.grey400),
              borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
            ),
            child: pw.Row(
              children: [
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'INVOICE',
                        style: pw.TextStyle(
                          fontSize: 16,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 6),
                      pw.Text('Invoice ID: ${booking.invoiceId}'),
                      if (invoiceDate != null)
                        pw.Text('Invoice date: ${dateFmt.format(invoiceDate)}'),
                      if (dueDate != null)
                        pw.Text('Due date: ${dateFmt.format(dueDate)}'),
                    ],
                  ),
                ),
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Bill to',
                        style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                      ),
                      pw.SizedBox(height: 6),
                      pw.Text(
                        booking.customerName.isEmpty
                            ? 'Customer'
                            : booking.customerName,
                      ),
                      if (booking.customerEmail.trim().isNotEmpty)
                        pw.Text(booking.customerEmail.trim()),
                      if (booking.customerPhone.trim().isNotEmpty)
                        pw.Text(booking.customerPhone.trim()),
                    ],
                  ),
                ),
              ],
            ),
          ),
          pw.SizedBox(height: 18),
          _lineItemsTable(booking),
          pw.SizedBox(height: 16),
          pw.Row(
            children: [
              pw.Expanded(
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    if (business.paymentLink.trim().isNotEmpty) ...[
                      pw.Text(
                        'Payment link',
                        style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(business.paymentLink.trim()),
                      pw.SizedBox(height: 10),
                    ],
                    if (business.bankName.trim().isNotEmpty ||
                        business.accountName.trim().isNotEmpty ||
                        business.bsb.trim().isNotEmpty ||
                        business.accountNumber.trim().isNotEmpty) ...[
                      pw.Text(
                        'Bank details',
                        style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                      ),
                      pw.SizedBox(height: 4),
                      if (business.bankName.trim().isNotEmpty)
                        pw.Text('Bank: ${business.bankName.trim()}'),
                      if (business.accountName.trim().isNotEmpty)
                        pw.Text('Account: ${business.accountName.trim()}'),
                      if (business.bsb.trim().isNotEmpty)
                        pw.Text('BSB: ${business.bsb.trim()}'),
                      if (business.accountNumber.trim().isNotEmpty)
                        pw.Text('Account no: ${business.accountNumber.trim()}'),
                    ],
                  ],
                ),
              ),
              pw.Container(
                width: 180,
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: PdfColors.grey100,
                  borderRadius: const pw.BorderRadius.all(
                    pw.Radius.circular(6),
                  ),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.stretch,
                  children: [
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text('Subtotal'),
                        pw.Text(formatMoney(booking.total)),
                      ],
                    ),
                    pw.SizedBox(height: 6),
                    pw.Divider(),
                    pw.SizedBox(height: 6),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text(
                          'Total',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                        ),
                        pw.Text(
                          formatMoney(booking.total),
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (booking.notes.trim().isNotEmpty) ...[
            pw.SizedBox(height: 16),
            pw.Text(
              'Notes',
              style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 4),
            pw.Text(booking.notes.trim()),
          ],
        ],
      ),
    );

    return doc.save();
  }

  static pw.Widget _lineItemsTable(Booking booking) {
    final descParts = <String>[
      if (booking.serviceType.trim().isNotEmpty) booking.serviceType.trim(),
      if (booking.boothType.trim().isNotEmpty) booking.boothType.trim(),
      if (booking.packageDuration.trim().isNotEmpty)
        booking.packageDuration.trim(),
    ];
    final description = descParts.isEmpty ? 'Service' : descParts.join(' • ');
    final when = '${booking.bookingDate} ${booking.bookingTime}'.trim();

    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey400),
      columnWidths: const {
        0: pw.FlexColumnWidth(6),
        1: pw.FlexColumnWidth(2),
        2: pw.FlexColumnWidth(2),
        3: pw.FlexColumnWidth(2),
      },
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.grey200),
          children: [
            _cell('Description', bold: true),
            _cell('Qty', bold: true, align: pw.TextAlign.right),
            _cell('Price', bold: true, align: pw.TextAlign.right),
            _cell('Total', bold: true, align: pw.TextAlign.right),
          ],
        ),
        pw.TableRow(
          children: [
            pw.Padding(
              padding: const pw.EdgeInsets.all(8),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(description),
                  pw.SizedBox(height: 3),
                  pw.Text(
                    when,
                    style: const pw.TextStyle(
                      fontSize: 10,
                      color: PdfColors.grey700,
                    ),
                  ),
                  if (booking.eventLocation.trim().isNotEmpty)
                    pw.Text(
                      booking.eventLocation.trim(),
                      style: const pw.TextStyle(
                        fontSize: 10,
                        color: PdfColors.grey700,
                      ),
                    ),
                ],
              ),
            ),
            _cell(booking.quantity.toString(), align: pw.TextAlign.right),
            _cell(formatMoney(booking.price), align: pw.TextAlign.right),
            _cell(formatMoney(booking.total), align: pw.TextAlign.right),
          ],
        ),
      ],
    );
  }

  static pw.Widget _cell(
    String text, {
    bool bold = false,
    pw.TextAlign? align,
  }) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(8),
      child: pw.Text(
        text,
        textAlign: align,
        style: pw.TextStyle(
          fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
        ),
      ),
    );
  }

  static Uint8List? _decodeDataUri(String dataUri) {
    if (!dataUri.startsWith('data:')) return null;
    final parts = dataUri.split(',');
    if (parts.length != 2) return null;
    try {
      return base64Decode(parts[1]);
    } catch (_) {
      return null;
    }
  }
}

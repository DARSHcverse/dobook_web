import 'package:dobook/data/models/booking.dart';
import 'package:dobook/data/models/business.dart';
import 'package:dobook/invoices/invoice_pdf.dart';
import 'package:flutter/material.dart';
import 'package:printing/printing.dart';

class InvoicePreviewScreen extends StatelessWidget {
  const InvoicePreviewScreen({
    super.key,
    required this.business,
    required this.booking,
  });

  final Business business;
  final Booking booking;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Invoice PDF')),
      body: PdfPreview(
        canChangeOrientation: false,
        canChangePageFormat: false,
        allowPrinting: true,
        allowSharing: true,
        build: (format) =>
            InvoicePdf.build(business: business, booking: booking),
      ),
    );
  }
}

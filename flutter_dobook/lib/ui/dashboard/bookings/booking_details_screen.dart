import 'package:dobook/app/session.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/invoices/invoice_preview_screen.dart';
import 'package:dobook/util/format.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class BookingDetailsScreen extends StatelessWidget {
  const BookingDetailsScreen({super.key, required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final business = context.read<AppSession>().business!;
    return Scaffold(
      appBar: AppBar(
        title: Text(booking.invoiceId.isEmpty ? 'Booking' : booking.invoiceId),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _kv('Customer', booking.customerName),
          _kv('Email', booking.customerEmail),
          _kv('Phone', booking.customerPhone),
          const Divider(),
          _kv('Service', booking.serviceType),
          _kv('Booth', booking.boothType),
          _kv('Date', booking.bookingDate),
          _kv('Time', booking.bookingTime),
          _kv('Duration', '${booking.durationMinutes} min'),
          if (booking.eventLocation.isNotEmpty)
            _kv('Location', booking.eventLocation),
          if (booking.notes.isNotEmpty) _kv('Notes', booking.notes),
          const Divider(),
          _kv('Price', formatMoney(booking.price)),
          _kv('Quantity', booking.quantity.toString()),
          _kv('Total', formatMoney(booking.total)),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => InvoicePreviewScreen(
                    business: business,
                    booking: booking,
                  ),
                ),
              );
            },
            icon: const Icon(Icons.picture_as_pdf),
            label: const Text('Invoice PDF'),
          ),
        ],
      ),
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(k, style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          Expanded(child: Text(v.isEmpty ? '—' : v)),
        ],
      ),
    );
  }
}

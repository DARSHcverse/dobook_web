import 'package:dobook/data/models/booking.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Booking.total computes price x quantity', () {
    final booking = Booking(
      id: '1',
      businessId: 'b',
      customerName: 'Alice',
      customerEmail: '',
      customerPhone: '',
      serviceType: 'Service',
      boothType: '',
      packageDuration: '',
      eventLocation: '',
      bookingDate: '2026-02-12',
      bookingTime: '10:00',
      endTime: '',
      durationMinutes: 60,
      parkingInfo: '',
      notes: '',
      price: 100,
      quantity: 2,
      status: 'confirmed',
      invoiceId: 'inv',
      invoiceDate: DateTime(2026, 2, 12).toIso8601String(),
      dueDate: DateTime(2026, 2, 27).toIso8601String(),
      createdAt: DateTime(2026, 2, 12).toIso8601String(),
    );

    expect(booking.total, 200);
  });
}

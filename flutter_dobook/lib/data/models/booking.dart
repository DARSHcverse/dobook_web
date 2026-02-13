class Booking {
  Booking({
    required this.id,
    required this.businessId,
    required this.customerName,
    required this.customerEmail,
    required this.customerPhone,
    required this.serviceType,
    required this.boothType,
    required this.packageDuration,
    required this.eventLocation,
    required this.bookingDate,
    required this.bookingTime,
    required this.endTime,
    required this.durationMinutes,
    required this.parkingInfo,
    required this.notes,
    required this.price,
    required this.quantity,
    required this.status,
    required this.invoiceId,
    required this.invoiceDate,
    required this.dueDate,
    required this.createdAt,
  });

  final String id;
  final String businessId;
  final String customerName;
  final String customerEmail;
  final String customerPhone;
  final String serviceType;
  final String boothType;
  final String packageDuration;
  final String eventLocation;
  final String bookingDate; // yyyy-mm-dd
  final String bookingTime; // HH:mm
  final String endTime; // HH:mm
  final int durationMinutes;
  final String parkingInfo;
  final String notes;
  final double price;
  final int quantity;
  final String status;
  final String invoiceId;
  final String invoiceDate; // ISO
  final String dueDate; // ISO
  final String createdAt; // ISO

  double get total => price * quantity;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'business_id': businessId,
      'customer_name': customerName,
      'customer_email': customerEmail,
      'customer_phone': customerPhone,
      'service_type': serviceType,
      'booth_type': boothType,
      'package_duration': packageDuration,
      'event_location': eventLocation,
      'booking_date': bookingDate,
      'booking_time': bookingTime,
      'end_time': endTime,
      'duration_minutes': durationMinutes,
      'parking_info': parkingInfo,
      'notes': notes,
      'price': price,
      'quantity': quantity,
      'status': status,
      'invoice_id': invoiceId,
      'invoice_date': invoiceDate,
      'due_date': dueDate,
      'created_at': createdAt,
    };
  }

  static Booking fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id']?.toString() ?? '',
      businessId: json['business_id']?.toString() ?? '',
      customerName: json['customer_name']?.toString() ?? '',
      customerEmail: json['customer_email']?.toString() ?? '',
      customerPhone: json['customer_phone']?.toString() ?? '',
      serviceType: json['service_type']?.toString() ?? 'Service',
      boothType: json['booth_type']?.toString() ?? '',
      packageDuration: json['package_duration']?.toString() ?? '',
      eventLocation: json['event_location']?.toString() ?? '',
      bookingDate: json['booking_date']?.toString() ?? '',
      bookingTime: json['booking_time']?.toString() ?? '',
      endTime: json['end_time']?.toString() ?? '',
      durationMinutes: (json['duration_minutes'] is num)
          ? (json['duration_minutes'] as num).toInt()
          : 60,
      parkingInfo: json['parking_info']?.toString() ?? '',
      notes: json['notes']?.toString() ?? '',
      price: (json['price'] is num) ? (json['price'] as num).toDouble() : 0,
      quantity: (json['quantity'] is num)
          ? (json['quantity'] as num).toInt()
          : 1,
      status: json['status']?.toString() ?? 'confirmed',
      invoiceId: json['invoice_id']?.toString() ?? '',
      invoiceDate: json['invoice_date']?.toString() ?? '',
      dueDate: json['due_date']?.toString() ?? '',
      createdAt: json['created_at']?.toString() ?? '',
    );
  }
}

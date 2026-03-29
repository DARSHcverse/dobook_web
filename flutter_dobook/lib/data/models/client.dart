class Client {
  Client({
    required this.email,
    required this.name,
    required this.phone,
    required this.totalBookings,
    required this.totalSpent,
    required this.firstBooking,
    required this.lastBooking,
    required this.notes,
  });

  final String email;
  final String name;
  final String? phone;
  final int totalBookings;
  final double totalSpent;
  final DateTime firstBooking;
  final DateTime lastBooking;
  final String? notes;

  static Client fromJson(Map<String, dynamic> json) {
    DateTime parseDate(String key) {
      final value = json[key] ?? json[_camelKey(key)];
      if (value == null) return DateTime.fromMillisecondsSinceEpoch(0);
      return DateTime.tryParse(value.toString()) ??
          DateTime.fromMillisecondsSinceEpoch(0);
    }

    return Client(
      email: json['email']?.toString() ?? '',
      name: json['name']?.toString() ??
          json['customer_name']?.toString() ??
          '',
      phone: json['phone']?.toString(),
      totalBookings: (json['total_bookings'] is num)
          ? (json['total_bookings'] as num).toInt()
          : (json['totalBookings'] is num)
              ? (json['totalBookings'] as num).toInt()
              : 0,
      totalSpent: (json['total_spent'] is num)
          ? (json['total_spent'] as num).toDouble()
          : (json['totalSpent'] is num)
              ? (json['totalSpent'] as num).toDouble()
              : 0,
      firstBooking: parseDate('first_booking'),
      lastBooking: parseDate('last_booking'),
      notes: json['notes']?.toString(),
    );
  }

  static String _camelKey(String snakeKey) {
    final parts = snakeKey.split('_');
    if (parts.isEmpty) return snakeKey;
    return parts.first +
        parts
            .skip(1)
            .map(
              (p) => p.isEmpty ? '' : '${p[0].toUpperCase()}${p.substring(1)}',
            )
            .join();
  }
}

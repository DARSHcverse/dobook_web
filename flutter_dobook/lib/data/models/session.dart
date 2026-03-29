class Session {
  Session({
    required this.token,
    required this.businessId,
    required this.createdAt,
    required this.expiresAt,
  });

  final String token;
  final String businessId;
  final DateTime createdAt;
  final DateTime expiresAt;

  bool get isExpired => expiresAt.isBefore(DateTime.now());

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'businessId': businessId,
      'createdAt': createdAt.toIso8601String(),
      'expiresAt': expiresAt.toIso8601String(),
    };
  }

  static DateTime _parseDate(dynamic value) {
    if (value is DateTime) return value;
    if (value is int) {
      return DateTime.fromMillisecondsSinceEpoch(value);
    }
    final parsed = DateTime.tryParse(value?.toString() ?? '');
    return parsed ?? DateTime.fromMillisecondsSinceEpoch(0);
  }

  static Session fromJson(Map<String, dynamic> json) {
    return Session(
      token: json['token']?.toString() ?? '',
      businessId: json['businessId']?.toString() ?? '',
      createdAt: _parseDate(json['createdAt']),
      expiresAt: _parseDate(json['expiresAt']),
    );
  }
}

class Session {
  Session({
    required this.token,
    required this.businessId,
    required this.createdAt,
    required this.expiresAt,
  });

  final String token;
  final String businessId;
  final int createdAt;
  final int expiresAt;

  bool get isExpired => DateTime.now().millisecondsSinceEpoch >= expiresAt;

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'businessId': businessId,
      'createdAt': createdAt,
      'expiresAt': expiresAt,
    };
  }

  static Session fromJson(Map<String, dynamic> json) {
    return Session(
      token: json['token']?.toString() ?? '',
      businessId: json['businessId']?.toString() ?? '',
      createdAt: (json['createdAt'] is num)
          ? (json['createdAt'] as num).toInt()
          : 0,
      expiresAt: (json['expiresAt'] is num)
          ? (json['expiresAt'] as num).toInt()
          : 0,
    );
  }
}

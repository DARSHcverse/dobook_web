class Staff {
  Staff({
    required this.id,
    required this.businessId,
    required this.name,
    required this.email,
    required this.phone,
    required this.isActive,
    required this.createdAt,
  });

  final String id;
  final String businessId;
  final String name;
  final String email;
  final String? phone;
  final bool isActive;
  final DateTime createdAt;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'business_id': businessId,
      'name': name,
      'email': email,
      'phone': phone,
      'is_active': isActive,
      'created_at': createdAt.toIso8601String(),
    };
  }

  static Staff fromJson(Map<String, dynamic> json) {
    final createdRaw = json['created_at'] ?? json['createdAt'];
    final createdAt = createdRaw != null
        ? DateTime.tryParse(createdRaw.toString())
        : null;

    return Staff(
      id: json['id']?.toString() ?? '',
      businessId: json['business_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString(),
      isActive: _parseIsActive(json['is_active'] ?? json['isActive']),
      createdAt: createdAt ?? DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  static bool _parseIsActive(dynamic value) {
    if (value is bool) return value;
    final text = value?.toString().toLowerCase().trim();
    if (text == 'true' || text == '1' || text == 'yes') return true;
    if (text == 'false' || text == '0' || text == 'no') return false;
    return true;
  }
}

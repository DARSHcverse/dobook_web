class Business {
  Business({
    required this.id,
    required this.businessName,
    required this.email,
    required this.phone,
    required this.businessAddress,
    required this.abn,
    required this.logoUrl,
    required this.bankName,
    required this.accountName,
    required this.bsb,
    required this.accountNumber,
    required this.paymentLink,
    required this.subscriptionPlan,
    required this.bookingCount,
    required this.invoiceSeq,
    required this.passwordHash,
    required this.createdAt,
  });

  final String id;
  final String businessName;
  final String email;
  final String? phone;
  final String businessAddress;
  final String abn;
  final String logoUrl;
  final String bankName;
  final String accountName;
  final String bsb;
  final String accountNumber;
  final String paymentLink;
  final String subscriptionPlan;
  final int bookingCount;
  final int invoiceSeq;
  final String passwordHash;
  final String createdAt;

  Business copyWith({
    String? businessName,
    String? email,
    String? phone,
    String? businessAddress,
    String? abn,
    String? logoUrl,
    String? bankName,
    String? accountName,
    String? bsb,
    String? accountNumber,
    String? paymentLink,
    String? subscriptionPlan,
    int? bookingCount,
    int? invoiceSeq,
    String? passwordHash,
    String? createdAt,
  }) {
    return Business(
      id: id,
      businessName: businessName ?? this.businessName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      businessAddress: businessAddress ?? this.businessAddress,
      abn: abn ?? this.abn,
      logoUrl: logoUrl ?? this.logoUrl,
      bankName: bankName ?? this.bankName,
      accountName: accountName ?? this.accountName,
      bsb: bsb ?? this.bsb,
      accountNumber: accountNumber ?? this.accountNumber,
      paymentLink: paymentLink ?? this.paymentLink,
      subscriptionPlan: subscriptionPlan ?? this.subscriptionPlan,
      bookingCount: bookingCount ?? this.bookingCount,
      invoiceSeq: invoiceSeq ?? this.invoiceSeq,
      passwordHash: passwordHash ?? this.passwordHash,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'business_name': businessName,
      'email': email,
      'phone': phone,
      'business_address': businessAddress,
      'abn': abn,
      'logo_url': logoUrl,
      'bank_name': bankName,
      'account_name': accountName,
      'bsb': bsb,
      'account_number': accountNumber,
      'payment_link': paymentLink,
      'subscription_plan': subscriptionPlan,
      'booking_count': bookingCount,
      'invoice_seq': invoiceSeq,
      'password_hash': passwordHash,
      'created_at': createdAt,
    };
  }

  static Business fromJson(Map<String, dynamic> json) {
    return Business(
      id: json['id']?.toString() ?? '',
      businessName: json['business_name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString(),
      businessAddress: json['business_address']?.toString() ?? '',
      abn: json['abn']?.toString() ?? '',
      logoUrl: json['logo_url']?.toString() ?? '',
      bankName: json['bank_name']?.toString() ?? '',
      accountName: json['account_name']?.toString() ?? '',
      bsb: json['bsb']?.toString() ?? '',
      accountNumber: json['account_number']?.toString() ?? '',
      paymentLink: json['payment_link']?.toString() ?? '',
      subscriptionPlan: json['subscription_plan']?.toString() ?? 'free',
      bookingCount: (json['booking_count'] is num)
          ? (json['booking_count'] as num).toInt()
          : 0,
      invoiceSeq: (json['invoice_seq'] is num)
          ? (json['invoice_seq'] as num).toInt()
          : 0,
      passwordHash: json['password_hash']?.toString() ?? '',
      createdAt: json['created_at']?.toString() ?? '',
    );
  }
}

class BusinessPublicInfo {
  BusinessPublicInfo({
    required this.businessName,
    required this.email,
    required this.phone,
  });

  final String businessName;
  final String email;
  final String? phone;
}

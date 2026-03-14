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
    required this.createdAt,
    // Additional charges
    this.travelChargeEnabled = false,
    this.travelChargeLabel = 'Travel charge',
    this.travelChargeFreeDistance = 0.0,
    this.travelChargeRatePerKm = 0.0,
    this.cbdChargeEnabled = false,
    this.cbdChargeLabel = 'CBD logistics charge',
    this.cbdChargeAmount = 0.0,
    // Reminders
    this.remindersEnabled = false,
    this.reminderDaysBefore = 2,
    this.reminderMessage = '',
    this.confirmationEmailEnabled = false,
    // Business type
    this.businessType = '',
    this.industry = '',
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
  final String createdAt;
  // Additional charges
  final bool travelChargeEnabled;
  final String travelChargeLabel;
  final double travelChargeFreeDistance;
  final double travelChargeRatePerKm;
  final bool cbdChargeEnabled;
  final String cbdChargeLabel;
  final double cbdChargeAmount;
  // Reminders
  final bool remindersEnabled;
  final int reminderDaysBefore;
  final String reminderMessage;
  final bool confirmationEmailEnabled;
  // Business type
  final String businessType;
  final String industry;

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
    String? createdAt,
    bool? travelChargeEnabled,
    String? travelChargeLabel,
    double? travelChargeFreeDistance,
    double? travelChargeRatePerKm,
    bool? cbdChargeEnabled,
    String? cbdChargeLabel,
    double? cbdChargeAmount,
    bool? remindersEnabled,
    int? reminderDaysBefore,
    String? reminderMessage,
    bool? confirmationEmailEnabled,
    String? businessType,
    String? industry,
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
      createdAt: createdAt ?? this.createdAt,
      travelChargeEnabled: travelChargeEnabled ?? this.travelChargeEnabled,
      travelChargeLabel: travelChargeLabel ?? this.travelChargeLabel,
      travelChargeFreeDistance: travelChargeFreeDistance ?? this.travelChargeFreeDistance,
      travelChargeRatePerKm: travelChargeRatePerKm ?? this.travelChargeRatePerKm,
      cbdChargeEnabled: cbdChargeEnabled ?? this.cbdChargeEnabled,
      cbdChargeLabel: cbdChargeLabel ?? this.cbdChargeLabel,
      cbdChargeAmount: cbdChargeAmount ?? this.cbdChargeAmount,
      remindersEnabled: remindersEnabled ?? this.remindersEnabled,
      reminderDaysBefore: reminderDaysBefore ?? this.reminderDaysBefore,
      reminderMessage: reminderMessage ?? this.reminderMessage,
      confirmationEmailEnabled: confirmationEmailEnabled ?? this.confirmationEmailEnabled,
      businessType: businessType ?? this.businessType,
      industry: industry ?? this.industry,
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
      'created_at': createdAt,
      'travel_charge_enabled': travelChargeEnabled,
      'travel_charge_label': travelChargeLabel,
      'travel_charge_free_distance': travelChargeFreeDistance,
      'travel_charge_rate_per_km': travelChargeRatePerKm,
      'cbd_charge_enabled': cbdChargeEnabled,
      'cbd_charge_label': cbdChargeLabel,
      'cbd_charge_amount': cbdChargeAmount,
      'reminders_enabled': remindersEnabled,
      'reminder_days_before': reminderDaysBefore,
      'reminder_message': reminderMessage,
      'confirmation_email_enabled': confirmationEmailEnabled,
      'business_type': businessType,
      'industry': industry,
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
      createdAt: json['created_at']?.toString() ?? '',
      travelChargeEnabled: json['travel_charge_enabled'] == true,
      travelChargeLabel: json['travel_charge_label']?.toString() ?? 'Travel charge',
      travelChargeFreeDistance: (json['travel_charge_free_distance'] is num)
          ? (json['travel_charge_free_distance'] as num).toDouble()
          : 0.0,
      travelChargeRatePerKm: (json['travel_charge_rate_per_km'] is num)
          ? (json['travel_charge_rate_per_km'] as num).toDouble()
          : 0.0,
      cbdChargeEnabled: json['cbd_charge_enabled'] == true,
      cbdChargeLabel: json['cbd_charge_label']?.toString() ?? 'CBD logistics charge',
      cbdChargeAmount: (json['cbd_charge_amount'] is num)
          ? (json['cbd_charge_amount'] as num).toDouble()
          : 0.0,
      remindersEnabled: json['reminders_enabled'] == true,
      reminderDaysBefore: (json['reminder_days_before'] is num)
          ? (json['reminder_days_before'] as num).toInt()
          : 2,
      reminderMessage: json['reminder_message']?.toString() ?? '',
      confirmationEmailEnabled: json['confirmation_email_enabled'] == true,
      businessType: json['business_type']?.toString() ?? '',
      industry: json['industry']?.toString() ?? '',
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

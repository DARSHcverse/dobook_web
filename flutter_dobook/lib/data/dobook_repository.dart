import 'dart:convert';
import 'dart:typed_data';

import 'package:bcrypt/bcrypt.dart';
import 'package:dobook/data/local_db_store.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/data/models/business.dart';
import 'package:dobook/data/models/session.dart';
import 'package:dobook/util/format.dart';
import 'package:uuid/uuid.dart';

class AuthResult {
  AuthResult({required this.token, required this.business});

  final String token;
  final Business business;
}

class DobookRepository {
  DobookRepository._(this._store);

  final LocalDbStore _store;
  final _uuid = const Uuid();

  static Future<DobookRepository> open() async {
    final store = await LocalDbStore.open();
    return DobookRepository._(store);
  }

  Future<AuthResult> register({
    required String businessName,
    required String email,
    required String password,
    String? phone,
  }) async {
    final normalizedEmail = email.trim().toLowerCase();
    final name = businessName.trim();
    if (name.length < 2) {
      throw Exception('Business name is required');
    }
    if (normalizedEmail.isEmpty) {
      throw Exception('Email is required');
    }
    if (password.length < 6) {
      throw Exception('Password must be at least 6 characters');
    }

    final db = await _store.read();
    final businesses = (db['businesses'] as List).cast<dynamic>();
    final exists = businesses.any(
      (b) =>
          (b is Map) &&
          (b['email']?.toString() ?? '').toLowerCase() == normalizedEmail,
    );
    if (exists) {
      throw Exception('Email already registered');
    }

    final id = _uuid.v4();
    final passwordHash = BCrypt.hashpw(password, BCrypt.gensalt());

    final business = Business(
      id: id,
      businessName: name,
      email: normalizedEmail,
      phone: (phone == null || phone.trim().isEmpty) ? null : phone.trim(),
      businessAddress: '',
      abn: '',
      logoUrl: '',
      bankName: '',
      accountName: '',
      bsb: '',
      accountNumber: '',
      paymentLink: '',
      subscriptionPlan: 'free',
      bookingCount: 0,
      invoiceSeq: 0,
      passwordHash: passwordHash,
      createdAt: DateTime.now().toIso8601String(),
    );

    final token = _uuid.v4();
    final session = Session(
      token: token,
      businessId: id,
      createdAt: DateTime.now().millisecondsSinceEpoch,
      expiresAt: DateTime.now()
          .add(const Duration(days: 7))
          .millisecondsSinceEpoch,
    );

    businesses.add(business.toJson());
    (db['sessions'] as List).add(session.toJson());
    await _store.write(db);

    return AuthResult(token: token, business: _sanitizeBusiness(business));
  }

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final normalizedEmail = email.trim().toLowerCase();
    final db = await _store.read();
    final businesses = (db['businesses'] as List).cast<dynamic>();
    final match = businesses.cast<dynamic>().whereType<Map>().firstWhere(
      (b) => (b['email']?.toString() ?? '').toLowerCase() == normalizedEmail,
      orElse: () => <String, dynamic>{},
    );
    if (match.isEmpty) {
      throw Exception('Invalid email or password');
    }

    final business = Business.fromJson(match.cast<String, dynamic>());
    final ok = BCrypt.checkpw(password, business.passwordHash);
    if (!ok) {
      throw Exception('Invalid email or password');
    }

    final token = _uuid.v4();
    final session = Session(
      token: token,
      businessId: business.id,
      createdAt: DateTime.now().millisecondsSinceEpoch,
      expiresAt: DateTime.now()
          .add(const Duration(days: 7))
          .millisecondsSinceEpoch,
    );

    (db['sessions'] as List).add(session.toJson());
    await _store.write(db);

    return AuthResult(token: token, business: _sanitizeBusiness(business));
  }

  Future<Business> getBusinessForToken(String token) async {
    final db = await _store.read();
    final session = _requireSession(db, token);
    final businesses = (db['businesses'] as List).whereType<Map>().toList();
    final businessJson = businesses.firstWhere(
      (b) => (b['id']?.toString() ?? '') == session.businessId,
      orElse: () => <String, dynamic>{},
    );
    if (businessJson.isEmpty) {
      throw Exception('Not authenticated');
    }
    return _sanitizeBusiness(
      Business.fromJson(businessJson.cast<String, dynamic>()),
    );
  }

  Future<BusinessPublicInfo> getBusinessInfo(String businessId) async {
    final db = await _store.read();
    final businesses = (db['businesses'] as List).whereType<Map>().toList();
    final businessJson = businesses.firstWhere(
      (b) => (b['id']?.toString() ?? '') == businessId,
      orElse: () => <String, dynamic>{},
    );
    if (businessJson.isEmpty) {
      throw Exception('Business not found');
    }
    final business = Business.fromJson(businessJson.cast<String, dynamic>());
    return BusinessPublicInfo(
      businessName: business.businessName,
      email: business.email,
      phone: business.phone,
    );
  }

  Future<Business> updateBusinessProfile(
    String token,
    Map<String, dynamic> updates,
  ) async {
    final allowed = <String>{
      'business_name',
      'phone',
      'business_address',
      'abn',
      'logo_url',
      'bank_name',
      'account_name',
      'bsb',
      'account_number',
      'payment_link',
    };

    final db = await _store.read();
    final session = _requireSession(db, token);
    final businesses = (db['businesses'] as List).whereType<Map>().toList();
    final idx = businesses.indexWhere(
      (b) => (b['id']?.toString() ?? '') == session.businessId,
    );
    if (idx < 0) {
      throw Exception('Not authenticated');
    }

    final target = Map<String, dynamic>.from(
      businesses[idx].cast<String, dynamic>(),
    );
    for (final entry in updates.entries) {
      if (!allowed.contains(entry.key)) continue;
      target[entry.key] = entry.value ?? '';
    }

    (db['businesses'] as List)[idx] = target;
    await _store.write(db);
    return _sanitizeBusiness(Business.fromJson(target));
  }

  Future<String> uploadLogo(
    String token, {
    required Uint8List bytes,
    required String contentType,
  }) async {
    final dataUri = 'data:$contentType;base64,${base64Encode(bytes)}';
    await updateBusinessProfile(token, {'logo_url': dataUri});
    return dataUri;
  }

  Future<List<Booking>> getBookings(String token) async {
    final db = await _store.read();
    final session = _requireSession(db, token);
    final bookings = (db['bookings'] as List)
        .whereType<Map>()
        .where(
          (b) => (b['business_id']?.toString() ?? '') == session.businessId,
        )
        .map((b) => Booking.fromJson(b.cast<String, dynamic>()))
        .toList();

    bookings.sort(
      (a, b) => '${a.bookingDate} ${a.bookingTime}'.compareTo(
        '${b.bookingDate} ${b.bookingTime}',
      ),
    );
    return bookings;
  }

  Future<Booking> createBooking({
    required String businessId,
    required String customerName,
    required String customerEmail,
    required String customerPhone,
    required String serviceType,
    required String boothType,
    required String packageDuration,
    required String eventLocation,
    required String bookingDate,
    required String bookingTime,
    String endTime = '',
    int durationMinutes = 60,
    String parkingInfo = '',
    String notes = '',
    double price = 0,
    int quantity = 1,
  }) async {
    if (businessId.trim().isEmpty) {
      throw Exception('business_id is required');
    }

    final db = await _store.read();
    final businesses = (db['businesses'] as List).whereType<Map>().toList();
    final idx = businesses.indexWhere(
      (b) => (b['id']?.toString() ?? '') == businessId,
    );
    if (idx < 0) {
      throw Exception('Business not found');
    }

    final businessJson = Map<String, dynamic>.from(
      businesses[idx].cast<String, dynamic>(),
    );
    final business = Business.fromJson(businessJson);

    final invoiceDate = DateTime.now();
    final nextSeq = business.invoiceSeq + 1;
    final invoiceId =
        'PB-${formatYYYYMMDD(invoiceDate)}-${nextSeq.toString().padLeft(3, '0')}';

    final booking = Booking(
      id: _uuid.v4(),
      businessId: businessId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      serviceType: serviceType.trim().isEmpty ? 'Service' : serviceType.trim(),
      boothType: boothType.trim(),
      packageDuration: packageDuration.trim(),
      eventLocation: eventLocation.trim(),
      bookingDate: bookingDate,
      bookingTime: bookingTime,
      endTime: endTime.trim(),
      durationMinutes: durationMinutes,
      parkingInfo: parkingInfo.trim(),
      notes: notes.trim(),
      price: price,
      quantity: quantity,
      status: 'confirmed',
      invoiceId: invoiceId,
      invoiceDate: invoiceDate.toIso8601String(),
      dueDate: invoiceDate.add(const Duration(days: 15)).toIso8601String(),
      createdAt: DateTime.now().toIso8601String(),
    );

    (db['bookings'] as List).add(booking.toJson());

    final updatedBusiness = business.copyWith(
      bookingCount: business.bookingCount + 1,
      invoiceSeq: nextSeq,
    );
    (db['businesses'] as List)[idx] = updatedBusiness.toJson();

    await _store.write(db);
    return booking;
  }

  Session _requireSession(Map<String, dynamic> db, String token) {
    final sessions = (db['sessions'] as List).whereType<Map>().toList();
    final sessionJson = sessions.firstWhere(
      (s) => (s['token']?.toString() ?? '') == token,
      orElse: () => <String, dynamic>{},
    );
    if (sessionJson.isEmpty) {
      throw Exception('Not authenticated');
    }
    final session = Session.fromJson(sessionJson.cast<String, dynamic>());
    if (session.isExpired) {
      throw Exception('Not authenticated');
    }
    return session;
  }

  Business _sanitizeBusiness(Business business) {
    return business.copyWith(passwordHash: '');
  }
}

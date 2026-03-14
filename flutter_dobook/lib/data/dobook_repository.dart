import 'dart:convert';
import 'dart:typed_data';

import 'package:dobook/app/config.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/data/models/business.dart';
import 'package:dobook/data/models/client.dart';
import 'package:dobook/data/models/staff.dart';
import 'package:http/http.dart' as http;

const String apiBaseUrl = kBaseUrl;

class AuthResult {
  AuthResult({
    required this.token,
    required this.business,
    this.expiresAt,
  });

  final String token;
  final Business business;
  final DateTime? expiresAt;
}

DateTime? _parseExpiresAt(Map<String, dynamic> data) {
  final direct = data['expires_at'] ?? data['expiresAt'];
  if (direct != null) return DateTime.tryParse(direct.toString());
  final session = data['session'];
  if (session is Map<String, dynamic>) {
    final nested = session['expires_at'] ?? session['expiresAt'];
    if (nested != null) return DateTime.tryParse(nested.toString());
  }
  return null;
}

class DobookRepository {
  DobookRepository._();

  static Future<DobookRepository> open() async {
    assert(
      kBaseUrl.startsWith('https://') || kBaseUrl.startsWith('http://localhost'),
      'Production API must use HTTPS',
    );
    return DobookRepository._();
  }

  Future<AuthResult> register({
    required String businessName,
    required String email,
    required String password,
    String? phone,
  }) async {
    final response = await http.post(
      Uri.parse('$apiBaseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'business_name': businessName,
        'email': email,
        'password': password,
        if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
      }),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      return AuthResult(
        token: data['token'],
        business: Business.fromJson(data['business']),
        expiresAt: _parseExpiresAt(data),
      );
    } else {
      final data = jsonDecode(response.body);
      throw Exception(data['detail'] ?? 'Registration failed');
    }
  }

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$apiBaseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      return AuthResult(
        token: data['token'],
        business: Business.fromJson(data['business']),
        expiresAt: _parseExpiresAt(data),
      );
    } else {
      final data = jsonDecode(response.body);
      throw Exception(data['detail'] ?? 'Login failed');
    }
  }

  Future<Business> getBusinessForToken(String token) async {
    final response = await http.get(
      Uri.parse('$apiBaseUrl/business/profile'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      return Business.fromJson(data);
    } else {
      throw Exception('Not authenticated');
    }
  }

  Future<BusinessPublicInfo> getBusinessInfo(String businessId) async {
    final response = await http.get(
      Uri.parse('$apiBaseUrl/public/businesses/$businessId'),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final b = data['business'] ?? data;
      return BusinessPublicInfo(
        businessName: b['business_name'] ?? '',
        email: b['email'] ?? '',
        phone: b['phone'] ?? '',
      );
    } else {
      throw Exception('Business not found');
    }
  }

  Future<Business> updateBusinessProfile(
    String token,
    Map<String, dynamic> updates,
  ) async {
    final response = await http.put(
      Uri.parse('$apiBaseUrl/business/profile'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(updates),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      return Business.fromJson(data);
    } else {
      final data = jsonDecode(response.body);
      throw Exception(data['detail'] ?? 'Update failed');
    }
  }

  Future<String> uploadLogo(
    String token, {
    required Uint8List bytes,
    required String contentType,
  }) async {
    final base64String = base64Encode(bytes);
    final response = await http.post(
      Uri.parse('$apiBaseUrl/business/upload-logo'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'base64': base64String,
        'contentType': contentType,
      }),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      return data['logo_url'] ?? '';
    } else {
      final data = jsonDecode(response.body);
      throw Exception(data['detail'] ?? 'Upload logo failed');
    }
  }

  Future<List<Booking>> getBookings(String token) async {
    final response = await http.get(
      Uri.parse('$apiBaseUrl/bookings'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final List bookingsList = (data['bookings'] ?? data) as List;
      final bookings = bookingsList
          .map((b) => Booking.fromJson(b as Map<String, dynamic>))
          .toList();
      bookings.sort(
        (a, b) => '${a.bookingDate} ${a.bookingTime}'.compareTo(
          '${b.bookingDate} ${b.bookingTime}',
        ),
      );
      return bookings;
    } else {
      throw Exception('Failed to fetch bookings');
    }
  }

  Future<List<Staff>> getStaff({String? token}) async {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await http.get(
      Uri.parse('$apiBaseUrl/staff'),
      headers: headers,
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final List staffList = (data['staff'] ?? data) as List;
      return staffList
          .map((s) => Staff.fromJson(s as Map<String, dynamic>))
          .toList();
    } else {
      throw Exception('Failed to fetch staff');
    }
  }

  Future<List<Client>> getClients({String? token}) async {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await http.get(
      Uri.parse('$apiBaseUrl/clients'),
      headers: headers,
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final List clientsList = (data['clients'] ?? data) as List;
      return clientsList
          .map((c) => Client.fromJson(c as Map<String, dynamic>))
          .toList();
    } else {
      throw Exception('Failed to fetch clients');
    }
  }

  Future<List<Booking>> getClientBookings(
    String email, {
    String? token,
  }) async {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await http.get(
      Uri.parse('$apiBaseUrl/clients/${Uri.encodeComponent(email)}'),
      headers: headers,
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final List bookingsList = (data['bookings'] ?? data) as List;
      return bookingsList
          .map((b) => Booking.fromJson(b as Map<String, dynamic>))
          .toList();
    } else {
      throw Exception('Failed to fetch client bookings');
    }
  }

  Future<void> saveClientNotes(
    String email,
    String notes, {
    String? token,
  }) async {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await http.put(
      Uri.parse('$apiBaseUrl/clients/${Uri.encodeComponent(email)}/notes'),
      headers: headers,
      body: jsonEncode({'notes': notes}),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final data = jsonDecode(response.body);
      throw Exception(data['detail'] ?? 'Failed to save notes');
    }
  }

  Future<Staff> createStaff(
    Map<String, dynamic> data, {
    String? token,
  }) async {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await http.post(
      Uri.parse('$apiBaseUrl/staff'),
      headers: headers,
      body: jsonEncode(data),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final staffData = data['staff'] ?? data;
      return Staff.fromJson(staffData as Map<String, dynamic>);
    } else {
      final data = jsonDecode(response.body);
      throw Exception(data['detail'] ?? 'Failed to create staff');
    }
  }

  Future<Staff> updateStaff(
    String id,
    Map<String, dynamic> data, {
    String? token,
  }) async {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await http.put(
      Uri.parse('$apiBaseUrl/staff/$id'),
      headers: headers,
      body: jsonEncode(data),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final staffData = data['staff'] ?? data;
      return Staff.fromJson(staffData as Map<String, dynamic>);
    } else {
      final data = jsonDecode(response.body);
      throw Exception(data['detail'] ?? 'Failed to update staff');
    }
  }

  Future<void> deleteStaff(String id, {String? token}) async {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await http.delete(
      Uri.parse('$apiBaseUrl/staff/$id'),
      headers: headers,
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final data = jsonDecode(response.body);
      throw Exception(data['detail'] ?? 'Failed to delete staff');
    }
  }

  Future<void> assignStaff(
    String bookingId,
    String staffId, {
    String? token,
  }) async {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await http.put(
      Uri.parse('$apiBaseUrl/bookings/$bookingId'),
      headers: headers,
      body: jsonEncode({'staff_id': staffId}),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final data = jsonDecode(response.body);
      throw Exception(data['detail'] ?? 'Failed to assign staff');
    }
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
    final response = await http.post(
      Uri.parse('$apiBaseUrl/bookings'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
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
        'duration_minutes': durationMinutes,
        'parking_info': parkingInfo,
        'notes': notes,
        'price': price,
        'quantity': quantity,
      }),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final bookingData = data['booking'] ?? data;
      return Booking.fromJson(bookingData as Map<String, dynamic>);
    } else {
      final data = jsonDecode(response.body);
      throw Exception(data['detail'] ?? 'Failed to create booking');
    }
  }

  Future<Booking> updateBooking(
    String id,
    Map<String, dynamic> data, {
    String? token,
  }) async {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await http.put(
      Uri.parse('$apiBaseUrl/bookings/$id'),
      headers: headers,
      body: jsonEncode(data),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body);
      final bookingData = data['booking'] ?? data;
      return Booking.fromJson(bookingData as Map<String, dynamic>);
    } else {
      final data = jsonDecode(response.body);
      throw Exception(data['detail'] ?? 'Failed to update booking');
    }
  }

  Future<Booking> cancelBooking(String id, {String? token}) {
    return updateBooking(id, {'status': 'cancelled'}, token: token);
  }

  Future<void> sendInvoice(String id, {String? token}) async {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final response = await http.post(
      Uri.parse('$apiBaseUrl/bookings/$id/send-invoice'),
      headers: headers,
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final data = jsonDecode(response.body);
      throw Exception(data['detail'] ?? 'Failed to send invoice');
    }
  }

  Future<void> requestReview(String bookingId, {String? token}) async {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    String detailFrom(http.Response response) {
      try {
        final data = jsonDecode(response.body);
        if (data is Map<String, dynamic> && data['detail'] != null) {
          return data['detail'].toString();
        }
      } catch (_) {}
      return 'Failed to request review';
    }

    final body = jsonEncode({'booking_id': bookingId, 'bookingId': bookingId});
    final primary = await http.post(
      Uri.parse('$apiBaseUrl/public/review-invites'),
      headers: headers,
      body: body,
    );

    if (primary.statusCode >= 200 && primary.statusCode < 300) {
      return;
    }

    if (primary.statusCode == 404) {
      final fallback = await http.post(
        Uri.parse('$apiBaseUrl/reviews/request'),
        headers: headers,
        body: jsonEncode({'booking_id': bookingId}),
      );
      if (fallback.statusCode >= 200 && fallback.statusCode < 300) {
        return;
      }
      throw Exception(detailFrom(fallback));
    }

    throw Exception(detailFrom(primary));
  }
}

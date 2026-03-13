import 'dart:convert';

import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/business.dart';
import 'package:dobook/data/models/session.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AppSession extends ChangeNotifier {
  AppSession({required this.repo});

  static const _storageTokenKey = 'auth_token';
  static const _storageSessionKey = 'auth_session';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  final DobookRepository repo;

  bool _isInitializing = true;
  bool get isInitializing => _isInitializing;

  bool _isBusy = false;
  bool get isBusy => _isBusy;

  String? _token;
  String? get token => _token;

  Business? _business;
  Business? get business => _business;

  String? _error;
  String? get error => _error;

  Future<void> init() async {
    try {
      _isInitializing = true;
      notifyListeners();

      final savedToken = await _storage.read(key: _storageTokenKey);
      if (savedToken == null || savedToken.isEmpty) return;

      final rawSession = await _storage.read(key: _storageSessionKey);
      if (rawSession == null || rawSession.isEmpty) {
        await _clearStoredAuth();
        return;
      }

      Session? session;
      try {
        session = Session.fromJson(
          jsonDecode(rawSession) as Map<String, dynamic>,
        );
      } catch (_) {
        session = null;
      }

      if (session == null || session.isExpired || session.token != savedToken) {
        await _clearStoredAuth();
        return;
      }

      final business = await repo.getBusinessForToken(savedToken);
      _token = savedToken;
      _business = business;
    } catch (_) {
      await logout();
    } finally {
      _isInitializing = false;
      notifyListeners();
    }
  }

  Future<void> login({required String email, required String password}) async {
    await _run(() async {
      final result = await repo.login(email: email, password: password);
      await _persistAuth(
        token: result.token,
        business: result.business,
        expiresAt: result.expiresAt,
      );
    });
  }

  Future<void> register({
    required String businessName,
    required String email,
    required String password,
    String? phone,
  }) async {
    await _run(() async {
      final result = await repo.register(
        businessName: businessName,
        email: email,
        password: password,
        phone: phone,
      );
      await _persistAuth(
        token: result.token,
        business: result.business,
        expiresAt: result.expiresAt,
      );
    });
  }

  Future<void> refreshBusiness() async {
    final token = _token;
    if (token == null) return;
    await _run(() async {
      _business = await repo.getBusinessForToken(token);
    });
  }

  Future<void> logout() async {
    _token = null;
    _business = null;
    _error = null;
    notifyListeners();

    await _clearStoredAuth();
  }

  Future<void> _persistAuth({
    required String token,
    required Business business,
    DateTime? expiresAt,
  }) async {
    _token = token;
    _business = business;
    final now = DateTime.now();
    final session = Session(
      token: token,
      businessId: business.id,
      createdAt: now,
      expiresAt: expiresAt ?? now.add(const Duration(days: 7)),
    );
    await _storage.write(key: _storageTokenKey, value: token);
    await _storage.write(
      key: _storageSessionKey,
      value: jsonEncode(session.toJson()),
    );
  }

  Future<void> _clearStoredAuth() async {
    await _storage.delete(key: _storageTokenKey);
    await _storage.delete(key: _storageSessionKey);
  }

  Future<void> _run(Future<void> Function() action) async {
    try {
      _isBusy = true;
      _error = null;
      notifyListeners();
      await action();
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isBusy = false;
      notifyListeners();
    }
  }
}

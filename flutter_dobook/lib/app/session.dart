import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/business.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppSession extends ChangeNotifier {
  AppSession({required this.repo});

  static const _prefsTokenKey = 'dobook_token';

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

      final prefs = await SharedPreferences.getInstance();
      final savedToken = prefs.getString(_prefsTokenKey);
      if (savedToken == null || savedToken.isEmpty) return;

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
      await _persistAuth(token: result.token, business: result.business);
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
      await _persistAuth(token: result.token, business: result.business);
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

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsTokenKey);
  }

  Future<void> _persistAuth({
    required String token,
    required Business business,
  }) async {
    _token = token;
    _business = business;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsTokenKey, token);
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

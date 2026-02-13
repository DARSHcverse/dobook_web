import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

class LocalDbStore {
  LocalDbStore._(this._file);

  final File _file;
  Future<void> _lock = Future.value();

  static Future<LocalDbStore> open() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}${Platform.pathSeparator}localdb.json');
    return LocalDbStore._(file);
  }

  Future<Map<String, dynamic>> read() {
    return _withLock(() async {
      if (!await _file.exists()) {
        final db = _defaultDb();
        await _writeUnlocked(db);
        return db;
      }

      final raw = await _file.readAsString();
      if (raw.trim().isEmpty) return _defaultDb();
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) return _defaultDb();
      return {..._defaultDb(), ...decoded};
    });
  }

  Future<void> write(Map<String, dynamic> db) {
    return _withLock(() async {
      await _writeUnlocked(db);
    });
  }

  Future<T> _withLock<T>(Future<T> Function() action) {
    final future = _lock.then((_) => action());
    _lock = future.then((_) {}, onError: (_) {});
    return future;
  }

  Map<String, dynamic> _defaultDb() {
    return {
      'businesses': <dynamic>[],
      'sessions': <dynamic>[],
      'bookings': <dynamic>[],
      'invoiceTemplates': <dynamic>[],
      'extractions': <dynamic>[],
      'invoices': <dynamic>[],
      'counters': <String, dynamic>{},
    };
  }

  Future<void> _writeUnlocked(Map<String, dynamic> db) async {
    final tmp = File('${_file.path}.tmp');
    await tmp.writeAsString(const JsonEncoder.withIndent('  ').convert(db));
    await tmp.rename(_file.path);
  }
}

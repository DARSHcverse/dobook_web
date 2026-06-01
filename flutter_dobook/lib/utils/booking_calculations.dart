import 'package:dobook/data/models/booking.dart';
import 'package:dobook/data/models/client.dart';

/// Shared, single-source-of-truth booking math.
///
/// Rules mirror the web dashboard:
/// - "Real" bookings exclude enquiries (`isEnquiry == true`).
/// - Total = all real bookings (confirmed + cancelled).
/// - Upcoming/revenue/clients/monthly = real bookings where status != 'cancelled'.
class BookingCalculations {
  BookingCalculations._();

  static const _monthLabels = <String>[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  static bool _isCancelled(Booking b) =>
      b.status.trim().toLowerCase() == 'cancelled';

  static DateTime? _bookingDate(Booking b) =>
      DateTime.tryParse(b.bookingDate);

  /// All bookings that aren't enquiries.
  static List<Booking> realBookings(List<Booking> all) {
    return all.where((b) => !b.isEnquiry).toList();
  }

  /// Real bookings excluding cancelled — the basis for revenue and stats.
  static List<Booking> activeBookings(List<Booking> all) {
    return realBookings(all).where((b) => !_isCancelled(b)).toList();
  }

  static int totalCount(List<Booking> all) => realBookings(all).length;

  static int upcomingCount(List<Booking> all) {
    final now = DateTime.now();
    final todayOnly = DateTime(now.year, now.month, now.day);
    return realBookings(all).where((b) {
      if (_isCancelled(b)) return false;
      final date = _bookingDate(b);
      if (date == null) return false;
      final dateOnly = DateTime(date.year, date.month, date.day);
      return !dateOnly.isBefore(todayOnly);
    }).length;
  }

  static double totalRevenue(List<Booking> all) {
    return activeBookings(all).fold<double>(0, (sum, b) => sum + b.total);
  }

  /// Map of "Jan" / "Feb" / … keys to revenue for the last 6 months
  /// inclusive of the current month, oldest first.
  static Map<String, double> monthlyRevenue(List<Booking> all) {
    final result = _emptyMonthMap<double>(0);
    final activeKeys = _last6MonthKeys();
    for (final b in activeBookings(all)) {
      final date = _bookingDate(b);
      if (date == null) continue;
      final key = _monthLabels[date.month - 1];
      if (!activeKeys.contains(key)) continue;
      // Guard against the same label appearing in non-adjacent prior years.
      if (!_isWithinLast6Months(date)) continue;
      result[key] = (result[key] ?? 0) + b.total;
    }
    return result;
  }

  static Map<String, int> monthlyCount(List<Booking> all) {
    final result = _emptyMonthMap<int>(0);
    final activeKeys = _last6MonthKeys();
    for (final b in activeBookings(all)) {
      final date = _bookingDate(b);
      if (date == null) continue;
      final key = _monthLabels[date.month - 1];
      if (!activeKeys.contains(key)) continue;
      if (!_isWithinLast6Months(date)) continue;
      result[key] = (result[key] ?? 0) + 1;
    }
    return result;
  }

  /// Number of unique customer emails appearing more than once across
  /// non-cancelled, non-enquiry bookings.
  static int repeatClientCount(List<Booking> all) {
    final counts = <String, int>{};
    for (final b in activeBookings(all)) {
      final email = b.customerEmail.trim().toLowerCase();
      if (email.isEmpty) continue;
      counts[email] = (counts[email] ?? 0) + 1;
    }
    return counts.values.where((c) => c > 1).length;
  }

  /// Build a client list from raw bookings, mirroring how the web dashboard
  /// derives client stats. Sorted by total spent descending.
  static List<Client> buildClientList(List<Booking> all) {
    final byEmail = <String, List<Booking>>{};
    for (final b in activeBookings(all)) {
      final email = b.customerEmail.trim().toLowerCase();
      if (email.isEmpty) continue;
      (byEmail[email] ??= []).add(b);
    }

    final clients = byEmail.entries.map((entry) {
      final list = entry.value;
      final dates = list
          .map(_bookingDate)
          .whereType<DateTime>()
          .toList(growable: false);
      final last = dates.isEmpty
          ? DateTime.fromMillisecondsSinceEpoch(0)
          : dates.reduce((a, b) => a.isAfter(b) ? a : b);
      final first = dates.isEmpty
          ? DateTime.fromMillisecondsSinceEpoch(0)
          : dates.reduce((a, b) => a.isBefore(b) ? a : b);
      final firstNamed = list.firstWhere(
        (b) => b.customerName.trim().isNotEmpty,
        orElse: () => list.first,
      );
      final firstPhone = list
          .map((b) => b.customerPhone)
          .firstWhere((p) => p.trim().isNotEmpty, orElse: () => '');
      return Client(
        email: entry.key,
        name: firstNamed.customerName,
        phone: firstPhone.isEmpty ? null : firstPhone,
        totalBookings: list.length,
        totalSpent: list.fold<double>(0, (sum, b) => sum + b.total),
        firstBooking: first,
        lastBooking: last,
        notes: null,
      );
    }).toList();

    clients.sort((a, b) => b.totalSpent.compareTo(a.totalSpent));
    return clients;
  }

  // --- helpers ---

  static Map<String, T> _emptyMonthMap<T>(T zero) {
    final now = DateTime.now();
    final map = <String, T>{};
    for (var i = 5; i >= 0; i -= 1) {
      final d = DateTime(now.year, now.month - i, 1);
      map[_monthLabels[d.month - 1]] = zero;
    }
    return map;
  }

  static Set<String> _last6MonthKeys() {
    final now = DateTime.now();
    final keys = <String>{};
    for (var i = 5; i >= 0; i -= 1) {
      final d = DateTime(now.year, now.month - i, 1);
      keys.add(_monthLabels[d.month - 1]);
    }
    return keys;
  }

  static bool _isWithinLast6Months(DateTime date) {
    final now = DateTime.now();
    final earliest = DateTime(now.year, now.month - 5, 1);
    final endOfCurrent = DateTime(now.year, now.month + 1, 1);
    return !date.isBefore(earliest) && date.isBefore(endOfCurrent);
  }
}

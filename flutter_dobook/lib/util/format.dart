import 'package:intl/intl.dart';

String formatYYYYMMDD(DateTime date) {
  return DateFormat('yyyyMMdd').format(date);
}

String formatMoney(num value) {
  final f = NumberFormat.simpleCurrency(decimalDigits: 2);
  return f.format(value);
}

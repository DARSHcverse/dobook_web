import 'package:dobook/app/session.dart';
import 'package:dobook/app/theme.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/data/models/staff.dart';
import 'package:dobook/invoices/invoice_preview_screen.dart';
import 'package:dobook/ui/dashboard/bookings/edit_booking_screen.dart';
import 'package:dobook/ui/shared/widgets/avatar_widget.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:dobook/ui/shared/widgets/page_transitions.dart';
import 'package:dobook/ui/shared/widgets/status_badge.dart';
import 'package:dobook/util/format.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

class BookingDetailsScreen extends StatefulWidget {
  const BookingDetailsScreen({super.key, required this.booking});

  final Booking booking;

  @override
  State<BookingDetailsScreen> createState() => _BookingDetailsScreenState();
}

class _BookingDetailsScreenState extends State<BookingDetailsScreen> {
  late Booking _booking;
  bool _bookingLoading = false;
  String? _bookingError;
  bool _savingPayment = false;
  bool _sendingInvoice = false;
  bool _requestingReview = false;
  bool _cancelling = false;
  bool _staffLoading = false;
  bool _assigningStaff = false;
  String _staffSelection = '';
  String _assignedStaffId = '';
  List<Staff> _staffList = const [];

  @override
  void initState() {
    super.initState();
    _booking = widget.booking;
    _staffSelection = _booking.staffId;
    _assignedStaffId = _booking.staffId;
    // Start with loading = false so passed booking renders immediately.
    // We refresh in background for the latest data.
    _bookingLoading = false;
    if (kDebugMode) {
      debugPrint(
        'BookingDetailsScreen: received booking id=${_booking.id} '
        'invoice=${_booking.invoiceId} customer=${_booking.customerName}',
      );
      _logMissingFields(_booking);
    }
    if (_booking.id.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _refreshInBackground());
    }
    _loadStaff();
  }

  @override
  Widget build(BuildContext context) {
    final business = context.read<AppSession>().business!;
    final booking = _booking;
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();
    final title = booking.invoiceId.isEmpty ? 'Booking' : booking.invoiceId;

    if (_bookingLoading) {
      if (kDebugMode) {
        debugPrint('BookingDetailsScreen: booking data loading...');
      }
      return Scaffold(
        appBar: AppBar(title: Text(title)),
        body: const LoadingShimmerList(
          padding: EdgeInsets.all(16),
          itemCount: 6,
        ),
      );
    }

    if (_bookingError != null) {
      if (kDebugMode) {
        debugPrint('BookingDetailsScreen: booking error=$_bookingError');
      }
      return Scaffold(
        appBar: AppBar(title: Text(title)),
        body: _errorState(context, _bookingError!),
      );
    }

    final paymentStatusValue = _normalizePaymentStatus(booking.paymentStatus);
    final paymentMethodValue = _normalizePaymentMethod(booking.paymentMethod);

    final lineItems = booking.lineItems;
    final breakdown = _buildBreakdown(booking, lineItems);
    final activeStaff =
        _staffList.where((member) => member.isActive).toList();
    final activeStaffIds = activeStaff.map((member) => member.id).toSet();
    Staff? currentStaff;
    for (final member in _staffList) {
      if (member.id == _assignedStaffId || member.id == booking.staffId) {
        currentStaff = member;
        break;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          booking.customerName.isEmpty ? 'Booking' : booking.customerName,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        bottom: booking.invoiceId.isEmpty
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(20),
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    booking.invoiceId,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withValues(alpha: 0.6),
                        ),
                  ),
                ),
              ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          // ── Card 1: Customer ───────────────────────────────────────
          _card(
            context,
            brand,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  AvatarWidget(name: booking.customerName, size: 64),
                  const SizedBox(height: 12),
                  Text(
                    booking.customerName.isEmpty ? '—' : booking.customerName,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  if (booking.customerEmail.isNotEmpty)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.email_outlined,
                            size: 14,
                            color: scheme.onSurfaceVariant),
                        const SizedBox(width: 6),
                        Text(
                          booking.customerEmail,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  if (booking.customerPhone.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.phone_outlined,
                            size: 14,
                            color: scheme.onSurfaceVariant),
                        const SizedBox(width: 6),
                        Text(
                          booking.customerPhone,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // ── Card 2: Booking Details ────────────────────────────────
          _card(
            context,
            brand,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sectionLabel(context, 'Booking Details'),
                  const SizedBox(height: 12),
                  _detailRow(context, Icons.calendar_today,
                      _formatDate(booking.bookingDate)),
                  _detailRow(context, Icons.schedule,
                      _formatTime(booking.bookingTime)),
                  if (booking.durationMinutes > 0)
                    _detailRow(context, Icons.timer_outlined,
                        _formatDuration(booking.durationMinutes)),
                  if (booking.boothType.isNotEmpty)
                    _detailRow(context, Icons.photo_camera_outlined,
                        booking.boothType),
                  if (booking.serviceType.isNotEmpty)
                    _detailRow(context, Icons.miscellaneous_services_outlined,
                        booking.serviceType),
                  if (booking.eventLocation.isNotEmpty)
                    _detailRow(
                        context, Icons.location_on_outlined, booking.eventLocation),
                  if (booking.parkingInfo.isNotEmpty)
                    _detailRow(
                        context, Icons.local_parking, booking.parkingInfo),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.flag_outlined,
                          size: 16, color: scheme.onSurfaceVariant),
                      const SizedBox(width: 10),
                      StatusBadge(status: booking.status),
                    ],
                  ),
                  if (booking.createdAt.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    _detailRow(context, Icons.access_time,
                        'Created ${_formatCreatedAt(booking.createdAt)}'),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // ── Card 3: Payment ────────────────────────────────────────
          _card(
            context,
            brand,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sectionLabel(context, 'Payment'),
                  const SizedBox(height: 12),
                  _amountRow('Base price', breakdown.baseTotal),
                  if (breakdown.travelTotal > 0)
                    _amountRow('Travel fee', breakdown.travelTotal),
                  if (breakdown.cbdTotal > 0)
                    _amountRow('CBD logistics fee', breakdown.cbdTotal),
                  for (final addon in breakdown.addons)
                    _amountRow(addon.label, addon.total),
                  const Divider(height: 24),
                  _amountRow(
                    'Total',
                    breakdown.totalAmount,
                    isBold: true,
                    valueColor: scheme.primary,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    key: ValueKey('payment-status-$paymentStatusValue'),
                    initialValue: paymentStatusValue,
                    decoration: const InputDecoration(
                      labelText: 'Payment status',
                      isDense: true,
                    ),
                    items: const [
                      DropdownMenuItem(
                          value: 'unpaid', child: Text('Unpaid')),
                      DropdownMenuItem(
                          value: 'deposit_paid', child: Text('Deposit Paid')),
                      DropdownMenuItem(
                          value: 'paid_in_full', child: Text('Paid in Full')),
                    ],
                    onChanged: _savingPayment
                        ? null
                        : (value) {
                            if (value == null) return;
                            _savePayment({'payment_status': value});
                          },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    key: ValueKey('payment-method-$paymentMethodValue'),
                    initialValue:
                        paymentMethodValue.isEmpty ? null : paymentMethodValue,
                    decoration: const InputDecoration(
                      labelText: 'Payment method',
                      isDense: true,
                    ),
                    items: const [
                      DropdownMenuItem(
                          value: 'bank_transfer', child: Text('Bank Transfer')),
                      DropdownMenuItem(value: 'cash', child: Text('Cash')),
                      DropdownMenuItem(value: 'online', child: Text('Online')),
                      DropdownMenuItem(value: 'other', child: Text('Other')),
                    ],
                    onChanged: _savingPayment
                        ? null
                        : (value) {
                            _savePayment({'payment_method': value ?? ''});
                          },
                  ),
                  if (_savingPayment) ...[
                    const SizedBox(height: 12),
                    const LinearProgressIndicator(),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // ── Card 4: Notes (only if non-empty) ─────────────────────
          if (booking.notes.trim().isNotEmpty) ...[
            _card(
              context,
              brand,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _sectionLabel(context, 'Notes'),
                    const SizedBox(height: 10),
                    Text(
                      booking.notes,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // ── Card 5: Assigned Staff ─────────────────────────────────
          _card(
            context,
            brand,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sectionLabel(context, 'Assigned Staff'),
                  const SizedBox(height: 12),
                  if (_staffLoading)
                    const LinearProgressIndicator()
                  else if (currentStaff != null) ...[
                    Row(
                      children: [
                        AvatarWidget(name: currentStaff.name, size: 40),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(currentStaff.name,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                              if (currentStaff.email.isNotEmpty)
                                Text(
                                  currentStaff.email,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                          color: scheme.onSurfaceVariant),
                                ),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: _assigningStaff ? null : _removeStaff,
                          style: TextButton.styleFrom(
                              foregroundColor: scheme.error),
                          child: const Text('Remove'),
                        ),
                      ],
                    ),
                  ] else ...[
                    if (activeStaff.isEmpty)
                      Text(
                        'No active staff members yet.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                      )
                    else ...[
                      DropdownButtonFormField<String>(
                        key: ValueKey('staff-$_staffSelection'),
                        initialValue: activeStaffIds.contains(_staffSelection)
                            ? _staffSelection
                            : null,
                        decoration: const InputDecoration(
                          labelText: 'Select staff member',
                          isDense: true,
                        ),
                        items: activeStaff
                            .map(
                              (member) => DropdownMenuItem(
                                value: member.id,
                                child: Text(member.name),
                              ),
                            )
                            .toList(),
                        onChanged: _assigningStaff
                            ? null
                            : (value) {
                                setState(() => _staffSelection = value ?? '');
                              },
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _assigningStaff || _staffSelection.isEmpty
                              ? null
                              : _assignStaff,
                          child: _assigningStaff
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2),
                                )
                              : const Text('Assign'),
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // ── Action Buttons ─────────────────────────────────────────
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _openEdit(context, booking),
                  child: const Text('Edit Booking'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: _sendingInvoice ? null : _sendInvoice,
                  child: _sendingInvoice
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Send Invoice'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () {
              Navigator.of(context).push(
                slidePageRoute(
                  InvoicePreviewScreen(
                    business: business,
                    booking: booking,
                  ),
                ),
              );
            },
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.picture_as_pdf, size: 18),
                SizedBox(width: 8),
                Text('Invoice PDF'),
              ],
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _requestingReview ? null : _requestReview,
            child: _requestingReview
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Request Review'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _cancelling ? null : _confirmCancel,
            style: OutlinedButton.styleFrom(
              foregroundColor: scheme.error,
              side: BorderSide(color: scheme.error),
            ),
            child: _cancelling
                ? SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: scheme.error))
                : const Text('Cancel Booking'),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  // ── UI helpers ──────────────────────────────────────────────────────────

  Widget _card(BuildContext context, BrandColors? brand, {required Widget child}) {
    final scheme = Theme.of(context).colorScheme;
    final isLight = Theme.of(context).brightness == Brightness.light;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: isLight ? Colors.white : scheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: isLight
                ? Colors.black.withValues(alpha: 0.06)
                : (brand?.cardShadow ?? Theme.of(context).shadowColor),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _sectionLabel(BuildContext context, String text) {
    return Text(
      text.toUpperCase(),
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            letterSpacing: 1.2,
            fontWeight: FontWeight.w700,
          ),
    );
  }

  Widget _detailRow(BuildContext context, IconData icon, String text) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: scheme.onSurfaceVariant),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }

  // ── Date/time formatters ─────────────────────────────────────────────────

  String _formatDate(String isoDate) {
    if (isoDate.isEmpty) return '—';
    try {
      final date = DateTime.parse(isoDate);
      return DateFormat('EEEE, d MMM yyyy').format(date);
    } catch (_) {
      return isoDate;
    }
  }

  String _formatTime(String time) {
    if (time.isEmpty) return '—';
    try {
      final parts = time.split(':');
      final hour = int.parse(parts[0]);
      final minute = parts.length > 1 ? parts[1] : '00';
      final period = hour >= 12 ? 'PM' : 'AM';
      final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
      return '$displayHour:$minute $period';
    } catch (_) {
      return time;
    }
  }

  String _formatDuration(int minutes) {
    if (minutes <= 0) return '—';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h == 0) return '$m min';
    if (m == 0) return '$h hour${h == 1 ? '' : 's'}';
    return '$h hour${h == 1 ? '' : 's'} $m min';
  }

  String _formatCreatedAt(String isoTimestamp) {
    if (isoTimestamp.isEmpty) return '—';
    try {
      final date = DateTime.parse(isoTimestamp);
      return DateFormat('d MMM yyyy').format(date);
    } catch (_) {
      return isoTimestamp;
    }
  }
  Widget _amountRow(String label, double amount,
      {bool isBold = false, Color? valueColor}) {
    final style = isBold
        ? TextStyle(fontWeight: FontWeight.w700, color: valueColor)
        : const TextStyle(fontWeight: FontWeight.w500);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(formatMoney(amount), style: style),
        ],
      ),
    );
  }

  Widget _errorState(BuildContext context, String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 40,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 12),
            Text(
              'Unable to load booking',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loadBookingDetails,
              child: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }

  void _logMissingFields(Booking booking) {
    final missing = <String>[];
    if (booking.id.trim().isEmpty) missing.add('id');
    if (booking.businessId.trim().isEmpty) missing.add('business_id');
    if (booking.customerName.trim().isEmpty) missing.add('customer_name');
    if (booking.customerEmail.trim().isEmpty) missing.add('customer_email');
    if (booking.bookingDate.trim().isEmpty) missing.add('booking_date');
    if (booking.bookingTime.trim().isEmpty) missing.add('booking_time');
    if (booking.invoiceId.trim().isEmpty) missing.add('invoice_id');
    if (missing.isNotEmpty) {
      debugPrint('BookingDetailsScreen: missing fields -> ${missing.join(', ')}');
    }
  }

  /// Refreshes booking data silently in the background (no loading overlay).
  Future<void> _refreshInBackground() async {
    if (kDebugMode) {
      debugPrint('BookingDetailsScreen: background refresh for ${_booking.id}');
    }
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      if (token == null || token.isEmpty) return;
      final list = await repo.getBookings(token);
      final refreshed = list.firstWhere(
        (item) => item.id == _booking.id,
        orElse: () => _booking,
      );
      if (!mounted) return;
      setState(() => _booking = refreshed);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('BookingDetailsScreen: background refresh error: $e');
      }
    }
  }

  Future<void> _loadBookingDetails() async {
    setState(() {
      _bookingLoading = true;
      _bookingError = null;
    });

    if (kDebugMode) {
      debugPrint('BookingDetailsScreen: loading booking ${_booking.id}');
    }

    try {
      if (_booking.id.trim().isEmpty) {
        if (kDebugMode) {
          debugPrint('BookingDetailsScreen: missing booking id, skipping refresh.');
        }
        return;
      }
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      if (token == null || token.isEmpty) {
        if (kDebugMode) {
          debugPrint('BookingDetailsScreen: missing auth token, skipping refresh.');
        }
        return;
      }
      final list = await repo.getBookings(token);
      final refreshed = list.firstWhere(
        (item) => item.id == _booking.id,
        orElse: () => _booking,
      );
      if (!mounted) return;
      setState(() => _booking = refreshed);
    } catch (e) {
      if (!mounted) return;
      setState(() => _bookingError = e.toString());
    } finally {
      if (mounted) setState(() => _bookingLoading = false);
      if (kDebugMode) {
        debugPrint('BookingDetailsScreen: booking load complete');
      }
    }
  }

  String _normalizePaymentStatus(String status) {
    final value = status.trim().toLowerCase();
    if (value == 'paid') return 'paid_in_full';
    if (value == 'paid_in_full') return 'paid_in_full';
    if (value == 'deposit_paid') return 'deposit_paid';
    return 'unpaid';
  }

  String _normalizePaymentMethod(String method) {
    final value = method.trim().toLowerCase();
    switch (value) {
      case 'bank_transfer':
      case 'cash':
      case 'online':
      case 'other':
        return value;
      default:
        return '';
    }
  }

  Future<void> _loadStaff() async {
    setState(() => _staffLoading = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      final list = await repo.getStaff(token: token);
      if (!mounted) return;
      setState(() {
        _staffList = list;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _staffLoading = false);
    }
  }

  Future<void> _assignStaff() async {
    if (_assigningStaff || _staffSelection.isEmpty) return;
    setState(() => _assigningStaff = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      await repo.assignStaff(_booking.id, _staffSelection, token: token);
      if (!mounted) return;
      setState(() {
        _assignedStaffId = _staffSelection;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Staff assigned')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _assigningStaff = false);
    }
  }

  Future<void> _removeStaff() async {
    if (_assigningStaff) return;
    setState(() => _assigningStaff = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      final updated = await repo.updateBooking(
        _booking.id,
        {'staff_id': null},
        token: token,
      );
      if (!mounted) return;
      setState(() {
        _booking = updated;
        _assignedStaffId = '';
        _staffSelection = '';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Staff removed')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _assigningStaff = false);
    }
  }

  Future<void> _savePayment(Map<String, dynamic> updates) async {
    if (_savingPayment) return;
    setState(() => _savingPayment = true);

    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      final updated = await repo.updateBooking(
        _booking.id,
        updates,
        token: token,
      );
      if (!mounted) return;
      setState(() => _booking = updated);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _savingPayment = false);
    }
  }

  Future<void> _openEdit(BuildContext context, Booking booking) async {
    final updated = await Navigator.of(context).push<Booking?>(
      slidePageRoute(EditBookingScreen(booking: booking)),
    );

    if (updated != null && mounted) {
      setState(() => _booking = updated);
    }
  }

  Future<void> _sendInvoice() async {
    if (_sendingInvoice) return;
    setState(() => _sendingInvoice = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      await repo.sendInvoice(_booking.id, token: token);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Invoice sent to ${_booking.customerEmail}')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _sendingInvoice = false);
    }
  }

  Future<void> _requestReview() async {
    if (_requestingReview) return;
    setState(() => _requestingReview = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      await repo.requestReview(_booking.id, token: token);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Review request sent')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _requestingReview = false);
    }
  }

  Future<void> _confirmCancel() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Cancel this booking?'),
          content: const Text('This cannot be undone.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Go back'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Confirm'),
            ),
          ],
        );
      },
    );

    if (confirm == true) {
      await _cancelBooking();
    }
  }

  Future<void> _cancelBooking() async {
    if (_cancelling) return;
    setState(() => _cancelling = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      await repo.cancelBooking(_booking.id, token: token);
      if (!mounted) return;
      Navigator.of(context).pop('cancelled');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  _ChargesBreakdown _buildBreakdown(
    Booking booking,
    List<Map<String, dynamic>> lineItems,
  ) {
    if (lineItems.isEmpty) {
      final base = booking.price * booking.quantity;
      return _ChargesBreakdown(
        baseTotal: base,
        travelTotal: 0,
        cbdTotal: 0,
        addons: const [],
        totalAmount: booking.total,
      );
    }

    final baseItem = lineItems.first;
    final extraItems =
        lineItems.length > 1 ? lineItems.sublist(1) : const <Map<String, dynamic>>[];
    final travelItem = extraItems.firstWhere(
      (item) => _itemDescription(item).contains('travel'),
      orElse: () => const {},
    );
    final cbdItem = extraItems.firstWhere(
      (item) => _itemDescription(item).contains('cbd'),
      orElse: () => const {},
    );

    final addons = <_ChargeLine>[];
    for (var i = 0; i < lineItems.length; i++) {
      final item = lineItems[i];
      if (i == 0) continue;
      if (identical(item, travelItem) || identical(item, cbdItem)) continue;
      final amount = _lineItemTotal(item);
      if (amount <= 0) continue;
      addons.add(
        _ChargeLine(label: _itemLabel(item), total: amount),
      );
    }

    return _ChargesBreakdown(
      baseTotal: _lineItemTotal(baseItem),
      travelTotal: _lineItemTotal(travelItem),
      cbdTotal: _lineItemTotal(cbdItem),
      addons: addons,
      totalAmount: booking.total,
    );
  }

  String _itemDescription(Map<String, dynamic> item) {
    final desc = item['description']?.toString() ?? '';
    return desc.trim().toLowerCase();
  }

  String _itemLabel(Map<String, dynamic> item) {
    return item['description']?.toString().trim() ?? 'Add-on';
  }

  double _lineItemTotal(Map<String, dynamic> item) {
    if (item.isEmpty) return 0;
    final total = item['total'] ?? item['amount'];
    if (total is num) return total.toDouble();
    if (total is String) return double.tryParse(total) ?? 0;

    final unit = item['unit_price'] ?? item['unitPrice'] ?? item['price'];
    final qty = item['qty'] ?? item['quantity'] ?? 1;

    final unitValue = unit is num
        ? unit.toDouble()
        : double.tryParse(unit?.toString() ?? '') ?? 0;
    final qtyValue = qty is num
        ? qty.toDouble()
        : double.tryParse(qty?.toString() ?? '') ?? 1;

    return unitValue * (qtyValue <= 0 ? 1 : qtyValue);
  }
}

class _ChargesBreakdown {
  const _ChargesBreakdown({
    required this.baseTotal,
    required this.travelTotal,
    required this.cbdTotal,
    required this.addons,
    required this.totalAmount,
  });

  final double baseTotal;
  final double travelTotal;
  final double cbdTotal;
  final List<_ChargeLine> addons;
  final double totalAmount;
}

class _ChargeLine {
  const _ChargeLine({required this.label, required this.total});

  final String label;
  final double total;
}

import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class BookingFormScreen extends StatefulWidget {
  const BookingFormScreen({super.key});

  @override
  State<BookingFormScreen> createState() => _BookingFormScreenState();
}

class _BookingFormScreenState extends State<BookingFormScreen> {
  final _formKey = GlobalKey<FormState>();

  final _customerNameCtrl = TextEditingController();
  final _customerEmailCtrl = TextEditingController();
  final _customerPhoneCtrl = TextEditingController();
  final _serviceTypeCtrl = TextEditingController(text: 'Photo Booth');
  final _boothTypeCtrl = TextEditingController();
  final _packageDurationCtrl = TextEditingController();
  final _eventLocationCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _quantityCtrl = TextEditingController(text: '1');

  DateTime _date = DateTime.now();
  TimeOfDay _time = const TimeOfDay(hour: 13, minute: 30);
  int _durationMinutes = 120;

  bool _busy = false;

  @override
  void dispose() {
    _customerNameCtrl.dispose();
    _customerEmailCtrl.dispose();
    _customerPhoneCtrl.dispose();
    _serviceTypeCtrl.dispose();
    _boothTypeCtrl.dispose();
    _packageDurationCtrl.dispose();
    _eventLocationCtrl.dispose();
    _notesCtrl.dispose();
    _priceCtrl.dispose();
    _quantityCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final business = context.read<AppSession>().business!;
    return Scaffold(
      appBar: AppBar(title: const Text('New booking')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Business ID: ${business.id}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _customerNameCtrl,
                decoration: const InputDecoration(labelText: 'Customer name'),
                textInputAction: TextInputAction.next,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _customerEmailCtrl,
                decoration: const InputDecoration(labelText: 'Customer email'),
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _customerPhoneCtrl,
                decoration: const InputDecoration(labelText: 'Customer phone'),
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Date'),
                      subtitle: Text(
                        '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}',
                      ),
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          firstDate: DateTime.now().subtract(
                            const Duration(days: 365),
                          ),
                          lastDate: DateTime.now().add(
                            const Duration(days: 365 * 3),
                          ),
                          initialDate: _date,
                        );
                        if (picked != null) setState(() => _date = picked);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Time'),
                      subtitle: Text(_time.format(context)),
                      onTap: () async {
                        final picked = await showTimePicker(
                          context: context,
                          initialTime: _time,
                        );
                        if (picked != null) setState(() => _time = picked);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DropdownMenu<int>(
                label: const Text('Duration'),
                initialSelection: _durationMinutes,
                dropdownMenuEntries: const [
                  DropdownMenuEntry(value: 60, label: '60 minutes'),
                  DropdownMenuEntry(value: 90, label: '90 minutes'),
                  DropdownMenuEntry(value: 120, label: '120 minutes'),
                  DropdownMenuEntry(value: 180, label: '180 minutes'),
                ],
                onSelected: (v) {
                  setState(() => _durationMinutes = v ?? 120);
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _serviceTypeCtrl,
                decoration: const InputDecoration(labelText: 'Service type'),
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _boothTypeCtrl,
                decoration: const InputDecoration(labelText: 'Booth type'),
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _packageDurationCtrl,
                decoration: const InputDecoration(
                  labelText: 'Package / duration (optional)',
                ),
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _eventLocationCtrl,
                decoration: const InputDecoration(
                  labelText: 'Event location (optional)',
                ),
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _priceCtrl,
                decoration: const InputDecoration(
                  labelText: 'Price (optional)',
                ),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _quantityCtrl,
                decoration: const InputDecoration(labelText: 'Quantity'),
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _notesCtrl,
                decoration: const InputDecoration(
                  labelText: 'Notes (optional)',
                ),
                minLines: 3,
                maxLines: 6,
                textInputAction: TextInputAction.newline,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _busy ? null : () => _submit(context),
                child: const Text('Create booking'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit(BuildContext context) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);

    try {
      final repo = context.read<DobookRepository>();
      final businessId = context.read<AppSession>().business!.id;

      final bookingDate =
          '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}';
      final bookingTime =
          '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}';

      final price = double.tryParse(_priceCtrl.text.trim()) ?? 0;
      final quantity = int.tryParse(_quantityCtrl.text.trim()) ?? 1;

      final created = await repo.createBooking(
        businessId: businessId,
        customerName: _customerNameCtrl.text,
        customerEmail: _customerEmailCtrl.text,
        customerPhone: _customerPhoneCtrl.text,
        serviceType: _serviceTypeCtrl.text,
        boothType: _boothTypeCtrl.text,
        packageDuration: _packageDurationCtrl.text,
        eventLocation: _eventLocationCtrl.text,
        bookingDate: bookingDate,
        bookingTime: bookingTime,
        durationMinutes: _durationMinutes,
        notes: _notesCtrl.text,
        price: price,
        quantity: quantity,
      );

      if (!context.mounted) return;
      Navigator.of(context).pop<Booking>(created);
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

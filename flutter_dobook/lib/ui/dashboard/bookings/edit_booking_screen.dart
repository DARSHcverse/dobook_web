import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class EditBookingScreen extends StatefulWidget {
  const EditBookingScreen({super.key, required this.booking});

  final Booking booking;

  @override
  State<EditBookingScreen> createState() => _EditBookingScreenState();
}

class _EditBookingScreenState extends State<EditBookingScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _serviceTypeCtrl;
  late final TextEditingController _boothTypeCtrl;
  late final TextEditingController _priceCtrl;
  late final TextEditingController _notesCtrl;

  late DateTime _date;
  late TimeOfDay _time;

  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _serviceTypeCtrl = TextEditingController(text: widget.booking.serviceType);
    _boothTypeCtrl = TextEditingController(text: widget.booking.boothType);
    _priceCtrl = TextEditingController(
      text: widget.booking.price == 0
          ? ''
          : widget.booking.price.toString(),
    );
    _notesCtrl = TextEditingController(text: widget.booking.notes);

    final parsedDate = DateTime.tryParse(widget.booking.bookingDate);
    _date = parsedDate ?? DateTime.now();

    final timeParts = widget.booking.bookingTime.split(':');
    if (timeParts.length == 2) {
      final hour = int.tryParse(timeParts[0]) ?? 9;
      final minute = int.tryParse(timeParts[1]) ?? 0;
      _time = TimeOfDay(hour: hour, minute: minute);
    } else {
      _time = TimeOfDay.fromDateTime(DateTime.now());
    }
  }

  @override
  void dispose() {
    _serviceTypeCtrl.dispose();
    _boothTypeCtrl.dispose();
    _priceCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit booking')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
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
                controller: _priceCtrl,
                decoration: const InputDecoration(labelText: 'Price'),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _notesCtrl,
                decoration: const InputDecoration(labelText: 'Notes'),
                minLines: 3,
                maxLines: 6,
                textInputAction: TextInputAction.newline,
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Save changes'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (_saving) return;
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;

      final bookingDate =
          '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}';
      final bookingTime =
          '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}';

      final price = double.tryParse(_priceCtrl.text.trim()) ?? 0;

      final updated = await repo.updateBooking(
        widget.booking.id,
        {
          'booking_date': bookingDate,
          'booking_time': bookingTime,
          'service_type': _serviceTypeCtrl.text.trim(),
          'booth_type': _boothTypeCtrl.text.trim(),
          'price': price,
          'notes': _notesCtrl.text.trim(),
        },
        token: token,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Booking updated')),
      );
      Navigator.of(context).pop<Booking>(updated);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

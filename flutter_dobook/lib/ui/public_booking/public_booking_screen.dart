import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/business.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class PublicBookingScreen extends StatefulWidget {
  const PublicBookingScreen({super.key});

  @override
  State<PublicBookingScreen> createState() => _PublicBookingScreenState();
}

class _PublicBookingScreenState extends State<PublicBookingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _businessIdCtrl = TextEditingController();
  final _customerNameCtrl = TextEditingController();
  final _customerEmailCtrl = TextEditingController();
  final _customerPhoneCtrl = TextEditingController();

  DateTime _date = DateTime.now();
  TimeOfDay _time = const TimeOfDay(hour: 13, minute: 30);
  int _durationMinutes = 120;

  BusinessPublicInfo? _info;
  bool _busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final session = context.read<AppSession>();
    if (session.business != null && _businessIdCtrl.text.isEmpty) {
      _businessIdCtrl.text = session.business!.id;
      _loadBusinessInfo(context, silent: true);
    }
  }

  @override
  void dispose() {
    _businessIdCtrl.dispose();
    _customerNameCtrl.dispose();
    _customerEmailCtrl.dispose();
    _customerPhoneCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Public booking')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _businessIdCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Business ID',
                      ),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: _busy ? null : () => _loadBusinessInfo(context),
                    child: const Text('Load'),
                  ),
                ],
              ),
              if (_info != null) ...[
                const SizedBox(height: 12),
                Card(
                  child: ListTile(
                    title: Text(_info!.businessName),
                    subtitle: Text(_info!.email),
                    trailing: _info!.phone == null ? null : Text(_info!.phone!),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              TextFormField(
                controller: _customerNameCtrl,
                decoration: const InputDecoration(labelText: 'Customer name'),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _customerEmailCtrl,
                decoration: const InputDecoration(
                  labelText: 'Customer email (optional)',
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _customerPhoneCtrl,
                decoration: const InputDecoration(
                  labelText: 'Customer phone (optional)',
                ),
                keyboardType: TextInputType.phone,
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
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _busy ? null : () => _submit(context),
                child: const Text('Submit booking'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _loadBusinessInfo(
    BuildContext context, {
    bool silent = false,
  }) async {
    if (_businessIdCtrl.text.trim().isEmpty) return;
    setState(() {
      _busy = true;
      if (!silent) _info = null;
    });
    try {
      final repo = context.read<DobookRepository>();
      final info = await repo.getBusinessInfo(_businessIdCtrl.text.trim());
      if (!mounted) return;
      setState(() => _info = info);
    } catch (e) {
      if (!context.mounted) return;
      if (!silent) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit(BuildContext context) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final repo = context.read<DobookRepository>();
      final bookingDate =
          '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}';
      final bookingTime =
          '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}';

      final created = await repo.createBooking(
        businessId: _businessIdCtrl.text.trim(),
        customerName: _customerNameCtrl.text,
        customerEmail: _customerEmailCtrl.text,
        customerPhone: _customerPhoneCtrl.text,
        serviceType: 'Service',
        boothType: '',
        packageDuration: '',
        eventLocation: '',
        bookingDate: bookingDate,
        bookingTime: bookingTime,
        durationMinutes: _durationMinutes,
      );

      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Booked! Invoice: ${created.invoiceId}')),
      );
      _customerNameCtrl.clear();
      _customerEmailCtrl.clear();
      _customerPhoneCtrl.clear();
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

import 'dart:convert';
import 'dart:typed_data';

import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  final _formKey = GlobalKey<FormState>();

  final _businessNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _abnCtrl = TextEditingController();
  final _bankNameCtrl = TextEditingController();
  final _accountNameCtrl = TextEditingController();
  final _bsbCtrl = TextEditingController();
  final _accountNumberCtrl = TextEditingController();
  final _paymentLinkCtrl = TextEditingController();

  bool _busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final b = context.read<AppSession>().business!;
    _businessNameCtrl.text = b.businessName;
    _phoneCtrl.text = b.phone ?? '';
    _addressCtrl.text = b.businessAddress;
    _abnCtrl.text = b.abn;
    _bankNameCtrl.text = b.bankName;
    _accountNameCtrl.text = b.accountName;
    _bsbCtrl.text = b.bsb;
    _accountNumberCtrl.text = b.accountNumber;
    _paymentLinkCtrl.text = b.paymentLink;
  }

  @override
  void dispose() {
    _businessNameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _abnCtrl.dispose();
    _bankNameCtrl.dispose();
    _accountNameCtrl.dispose();
    _bsbCtrl.dispose();
    _accountNumberCtrl.dispose();
    _paymentLinkCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final business = session.business!;

    Uint8List? logoBytes;
    if (business.logoUrl.startsWith('data:')) {
      final parts = business.logoUrl.split(',');
      if (parts.length == 2) {
        try {
          logoBytes = base64Decode(parts[1]);
        } catch (_) {}
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          IconButton(
            tooltip: 'Logout',
            onPressed: _busy ? null : () => session.logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
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
              Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: Theme.of(
                      context,
                    ).colorScheme.surfaceContainerHighest,
                    backgroundImage: logoBytes == null
                        ? null
                        : MemoryImage(logoBytes),
                    child: logoBytes == null ? const Icon(Icons.store) : null,
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    onPressed: _busy ? null : () => _pickLogo(context),
                    icon: const Icon(Icons.image),
                    label: const Text('Upload logo'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _businessNameCtrl,
                decoration: const InputDecoration(labelText: 'Business name'),
                validator: (v) =>
                    (v == null || v.trim().length < 2) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneCtrl,
                decoration: const InputDecoration(labelText: 'Phone'),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _addressCtrl,
                decoration: const InputDecoration(
                  labelText: 'Business address',
                ),
                minLines: 2,
                maxLines: 4,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _abnCtrl,
                decoration: const InputDecoration(labelText: 'ABN'),
              ),
              const Divider(height: 32),
              Text(
                'Bank details',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _bankNameCtrl,
                decoration: const InputDecoration(labelText: 'Bank name'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _accountNameCtrl,
                decoration: const InputDecoration(labelText: 'Account name'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _bsbCtrl,
                decoration: const InputDecoration(labelText: 'BSB'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _accountNumberCtrl,
                decoration: const InputDecoration(labelText: 'Account number'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _paymentLinkCtrl,
                decoration: const InputDecoration(labelText: 'Payment link'),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _busy ? null : () => _save(context),
                child: const Text('Save'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _save(BuildContext context) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final repo = context.read<DobookRepository>();
      final session = context.read<AppSession>();
      final token = session.token!;

      await repo.updateBusinessProfile(token, {
        'business_name': _businessNameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'business_address': _addressCtrl.text.trim(),
        'abn': _abnCtrl.text.trim(),
        'bank_name': _bankNameCtrl.text.trim(),
        'account_name': _accountNameCtrl.text.trim(),
        'bsb': _bsbCtrl.text.trim(),
        'account_number': _accountNumberCtrl.text.trim(),
        'payment_link': _paymentLinkCtrl.text.trim(),
      });

      await session.refreshBusiness();
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Saved')));
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickLogo(BuildContext context) async {
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    final repo = context.read<DobookRepository>();
    final session = context.read<AppSession>();

    try {
      final picker = ImagePicker();
      final xfile = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
      );
      if (xfile == null) return;
      final bytes = await xfile.readAsBytes();
      final mime = _mimeFromPath(xfile.name);

      await repo.uploadLogo(session.token!, bytes: bytes, contentType: mime);
      await session.refreshBusiness();
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _mimeFromPath(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }
}

import 'dart:convert';
import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/business.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:dobook/ui/widgets/loading_shimmer.dart';

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
  Future<void>? _loadFuture;
  String? _seededBusinessId;

  @override
  void initState() {
    super.initState();
    _loadFuture = _loadBusiness();
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
    if (kDebugMode) {
      debugPrint(
        'SettingsPage build: business=${session.business?.id ?? 'null'} '
        'error=${session.error}',
      );
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
        child: FutureBuilder<void>(
          future: _loadFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const LoadingShimmerList();
            }

            final error = snapshot.error?.toString() ?? session.error;
            if (error != null && error.isNotEmpty) {
              return _errorState(context, error);
            }

            final business = session.business;
            if (business == null) {
              return _errorState(
                context,
                'Business profile unavailable. Please try again.',
              );
            }

            _seedControllers(business);

            Uint8List? logoBytes;
            if (business.logoUrl.startsWith('data:')) {
              final parts = business.logoUrl.split(',');
              if (parts.length == 2) {
                try {
                  logoBytes = base64Decode(parts[1]);
                } catch (_) {}
              }
            }

            return Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                children: [
                  Text(
                    'Business ID: ${business.id}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 26,
                            backgroundColor: Theme.of(
                              context,
                            ).colorScheme.surfaceContainerHighest,
                            backgroundImage: logoBytes == null
                                ? null
                                : MemoryImage(logoBytes),
                            child: logoBytes == null
                                ? const Icon(Icons.store)
                                : null,
                          ),
                          const SizedBox(width: 12),
                          OutlinedButton.icon(
                            onPressed: _busy ? null : () => _pickLogo(context),
                            icon: const Icon(Icons.image),
                            label: const Text('Upload logo'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  _sectionHeader(context, 'Business profile'),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          TextFormField(
                            controller: _businessNameCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Business name',
                            ),
                            validator: (v) =>
                                (v == null || v.trim().length < 2)
                                    ? 'Required'
                                    : null,
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
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  _sectionHeader(context, 'Bank details'),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          TextFormField(
                            controller: _bankNameCtrl,
                            decoration:
                                const InputDecoration(labelText: 'Bank name'),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _accountNameCtrl,
                            decoration:
                                const InputDecoration(labelText: 'Account name'),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _bsbCtrl,
                            decoration: const InputDecoration(labelText: 'BSB'),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _accountNumberCtrl,
                            decoration:
                                const InputDecoration(labelText: 'Account number'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  _sectionHeader(context, 'Payments'),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: TextFormField(
                        controller: _paymentLinkCtrl,
                        decoration: const InputDecoration(labelText: 'Payment link'),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _busy ? null : () => _save(context),
                      child: const Text('Save'),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> _loadBusiness() async {
    if (kDebugMode) {
      debugPrint('SettingsPage: loading business profile...');
    }
    final session = context.read<AppSession>();
    final token = session.token;
    if (token == null || token.isEmpty) {
      if (kDebugMode) {
        debugPrint('SettingsPage: missing auth token.');
      }
      throw Exception('Not authenticated.');
    }
    await session.refreshBusiness();
    if (kDebugMode) {
      debugPrint('SettingsPage: business profile loaded.');
    }
  }

  void _seedControllers(Business business) {
    if (_seededBusinessId == business.id) return;
    _seededBusinessId = business.id;
    _businessNameCtrl.text = business.businessName;
    _phoneCtrl.text = business.phone ?? '';
    _addressCtrl.text = business.businessAddress;
    _abnCtrl.text = business.abn;
    _bankNameCtrl.text = business.bankName;
    _accountNameCtrl.text = business.accountName;
    _bsbCtrl.text = business.bsb;
    _accountNumberCtrl.text = business.accountNumber;
    _paymentLinkCtrl.text = business.paymentLink;
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
              'Unable to load settings',
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
              onPressed: () {
                setState(() {
                  _loadFuture = _loadBusiness();
                });
              },
              child: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(BuildContext context, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: Theme.of(context).textTheme.titleMedium,
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

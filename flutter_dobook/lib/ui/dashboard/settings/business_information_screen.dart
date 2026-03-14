import 'dart:convert';
import 'dart:typed_data';

import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/business.dart';
import 'package:dobook/ui/shared/widgets/avatar_widget.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

class BusinessInformationScreen extends StatefulWidget {
  const BusinessInformationScreen({super.key});

  @override
  State<BusinessInformationScreen> createState() => _BusinessInformationScreenState();
}

class _BusinessInformationScreenState extends State<BusinessInformationScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _businessNameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _abnCtrl;
  String _industry = '';
  bool _busy = false;
  bool _initialized = false;

  static const _industries = [
    'Events',
    'Photography',
    'Hospitality',
    'Retail',
    'Wellness',
    'Other',
  ];

  @override
  void initState() {
    super.initState();
    _businessNameCtrl = TextEditingController();
    _phoneCtrl = TextEditingController();
    _addressCtrl = TextEditingController();
    _abnCtrl = TextEditingController();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    final business = context.read<AppSession>().business;
    if (business == null) return;
    _businessNameCtrl.text = business.businessName;
    _phoneCtrl.text = business.phone ?? '';
    _addressCtrl.text = business.businessAddress;
    _abnCtrl.text = business.abn;
    _industry = '';
    _initialized = true;
  }

  @override
  void dispose() {
    _businessNameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _abnCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final business = session.business;

    return Scaffold(
      appBar: AppBar(title: const Text('Business Information')),
      body: SafeArea(
        child: _buildBody(context, business, session),
      ),
    );
  }

  Widget _buildBody(BuildContext context, Business? business, AppSession session) {
    if (session.isInitializing) {
      return const LoadingShimmerList();
    }

    if (business == null) {
      return _errorState(
        context,
        'Business profile unavailable. Please try again.',
        onRetry: () async {
          await session.refreshBusiness();
          if (mounted) setState(() {});
        },
      );
    }

    final scheme = Theme.of(context).colorScheme;
    final logo = _logoImage(business);
    final avatar = logo == null
        ? AvatarWidget(name: business.businessName, size: 72)
        : CircleAvatar(
            radius: 36,
            backgroundColor: scheme.surfaceContainerHighest,
            backgroundImage: MemoryImage(logo),
          );

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Text(
            'Business Logo',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              GestureDetector(
                onTap: _busy ? null : () => _pickLogo(context),
                child: avatar,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : () => _pickLogo(context),
                  icon: const Icon(Icons.image),
                  label: const Text('Change logo'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _businessNameCtrl,
            decoration: const InputDecoration(labelText: 'Business name *'),
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
          DropdownButtonFormField<String>(
            initialValue: _industry.isEmpty ? null : _industry,
            decoration: const InputDecoration(labelText: 'Industry'),
            items: _industries
                .map(
                  (item) => DropdownMenuItem(
                    value: item,
                    child: Text(item),
                  ),
                )
                .toList(),
            onChanged: (value) {
              setState(() => _industry = value ?? '');
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _addressCtrl,
            decoration: const InputDecoration(labelText: 'Business address'),
            minLines: 2,
            maxLines: 4,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _abnCtrl,
            decoration: const InputDecoration(labelText: 'ABN'),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : () => _save(context),
            child: _busy
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save'),
          ),
        ],
      ),
    );
  }

  Widget _errorState(
    BuildContext context,
    String message, {
    required Future<void> Function() onRetry,
  }) {
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
              'Unable to load business profile',
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
              onPressed: onRetry,
              child: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }

  Uint8List? _logoImage(Business business) {
    if (business.logoUrl.startsWith('data:')) {
      final parts = business.logoUrl.split(',');
      if (parts.length == 2) {
        try {
          return base64Decode(parts[1]);
        } catch (_) {
          return null;
        }
      }
    }
    return null;
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
      if (!mounted) return;
      messenger.showSnackBar(
        const SnackBar(content: Text('Logo updated')),
      );
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
        if (_industry.trim().isNotEmpty) 'industry': _industry.trim(),
      });

      await session.refreshBusiness();
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Business information saved')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

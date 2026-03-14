import 'dart:convert';
import 'package:dobook/app/session.dart';
import 'package:dobook/app/theme.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/business.dart';
import 'package:dobook/ui/shared/widgets/avatar_widget.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:dobook/ui/shared/widgets/section_header.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  Future<void>? _loadFuture;

  @override
  void initState() {
    super.initState();
    _loadFuture = _loadBusiness();
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
            onPressed: () => session.logout(),
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

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
              children: [
                _profileHeader(context, business),
                const SectionHeader(title: 'Business'),
                _sectionCard(
                  context,
                  children: [
                    _settingsRow(
                      context,
                      icon: Icons.storefront,
                      label: 'Business Information',
                      color: Theme.of(context).colorScheme.primary,
                      onTap: () => _openEditSheet(context, business),
                    ),
                    _settingsDivider(context),
                    _settingsRow(
                      context,
                      icon: Icons.payments,
                      label: 'Payment Details',
                      color: Theme.of(context).colorScheme.secondary,
                      onTap: () => _openEditSheet(context, business),
                    ),
                    _settingsDivider(context),
                    _settingsRow(
                      context,
                      icon: Icons.attach_money,
                      label: 'Additional Charges',
                      color: Theme.of(context).colorScheme.tertiary,
                      onTap: () => _showComingSoon(context),
                    ),
                  ],
                ),
                const SectionHeader(title: 'Booking'),
                _sectionCard(
                  context,
                  children: [
                    _settingsRow(
                      context,
                      icon: Icons.tune,
                      label: 'Booking Fields & Extras',
                      color: Theme.of(context).colorScheme.primary,
                      onTap: () => _showComingSoon(context),
                    ),
                    _settingsDivider(context),
                    _settingsRow(
                      context,
                      icon: Icons.notifications_active,
                      label: 'Reminder Settings',
                      color: Theme.of(context).colorScheme.secondary,
                      onTap: () => _showComingSoon(context),
                    ),
                    _settingsDivider(context),
                    _settingsRow(
                      context,
                      icon: Icons.category,
                      label: 'Business Type',
                      color: Theme.of(context).colorScheme.tertiary,
                      onTap: () => _showComingSoon(context),
                    ),
                  ],
                ),
                const SectionHeader(title: 'Account'),
                _sectionCard(
                  context,
                  children: [
                    _settingsRow(
                      context,
                      icon: Icons.lock,
                      label: 'Change Password',
                      color: Theme.of(context).colorScheme.primary,
                      onTap: () => _showComingSoon(context),
                    ),
                    _settingsDivider(context),
                    _settingsRow(
                      context,
                      icon: Icons.star,
                      label: 'Subscription Plan',
                      color: Theme.of(context).colorScheme.secondary,
                      trailing: _planBadge(context, business.subscriptionPlan),
                      onTap: () => _showComingSoon(context),
                    ),
                    _settingsDivider(context),
                    _settingsRow(
                      context,
                      icon: Icons.support_agent,
                      label: 'Contact Support',
                      color: Theme.of(context).colorScheme.tertiary,
                      onTap: () => _showComingSoon(context),
                    ),
                  ],
                ),
                const SectionHeader(title: 'Danger Zone'),
                _sectionCard(
                  context,
                  children: [
                    _settingsRow(
                      context,
                      icon: Icons.delete_forever,
                      label: 'Delete Account',
                      color: Theme.of(context).colorScheme.error,
                      danger: true,
                      onTap: () => _showComingSoon(context),
                    ),
                  ],
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _profileHeader(BuildContext context, Business business) {
    final scheme = Theme.of(context).colorScheme;
    final logo = _logoImage(business);
    final avatar = logo == null
        ? AvatarWidget(name: business.businessName, size: 72)
        : CircleAvatar(
            radius: 36,
            backgroundColor: scheme.surfaceContainerHighest,
            backgroundImage: MemoryImage(logo),
          );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          avatar,
          const SizedBox(height: 12),
          Text(
            business.businessName,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            business.email,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 36,
            child: FilledButton(
              onPressed: () => _openEditSheet(context, business),
              child: const Text('Edit Profile'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionCard(BuildContext context, {required List<Widget> children}) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _settingsDivider(BuildContext context) {
    return Divider(height: 1, color: Theme.of(context).colorScheme.outlineVariant);
  }

  Widget _settingsRow(
    BuildContext context, {
    required IconData icon,
    required String label,
    required Color color,
    VoidCallback? onTap,
    Widget? trailing,
    bool danger = false,
  }) {
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: brand?.iconTileBg ?? scheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: danger ? scheme.error : scheme.onSurface,
                    ),
              ),
            ),
            if (trailing != null) ...[
              const SizedBox(width: 8),
              trailing,
            ],
            const SizedBox(width: 8),
            Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }

  Widget _planBadge(BuildContext context, String plan) {
    final scheme = Theme.of(context).colorScheme;
    final label = plan.trim().isEmpty ? 'Free' : plan.trim();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label[0].toUpperCase() + label.substring(1),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: scheme.primary,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }

  Future<void> _openEditSheet(BuildContext context, Business business) async {
    final updated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _EditBusinessSheet(business: business),
    );
    if (updated == true && mounted) {
      setState(() => _loadFuture = _loadBusiness());
    }
  }

  void _showComingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Coming soon')),
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
}

class _EditBusinessSheet extends StatefulWidget {
  const _EditBusinessSheet({required this.business});

  final Business business;

  @override
  State<_EditBusinessSheet> createState() => _EditBusinessSheetState();
}

class _EditBusinessSheetState extends State<_EditBusinessSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _businessNameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _abnCtrl;
  late final TextEditingController _bankNameCtrl;
  late final TextEditingController _accountNameCtrl;
  late final TextEditingController _bsbCtrl;
  late final TextEditingController _accountNumberCtrl;
  late final TextEditingController _paymentLinkCtrl;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final b = widget.business;
    _businessNameCtrl = TextEditingController(text: b.businessName);
    _phoneCtrl = TextEditingController(text: b.phone ?? '');
    _addressCtrl = TextEditingController(text: b.businessAddress);
    _abnCtrl = TextEditingController(text: b.abn);
    _bankNameCtrl = TextEditingController(text: b.bankName);
    _accountNameCtrl = TextEditingController(text: b.accountName);
    _bsbCtrl = TextEditingController(text: b.bsb);
    _accountNumberCtrl = TextEditingController(text: b.accountNumber);
    _paymentLinkCtrl = TextEditingController(text: b.paymentLink);
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
    final scheme = Theme.of(context).colorScheme;
    final logo = _logoImage(widget.business);
    final avatar = logo == null
        ? AvatarWidget(name: widget.business.businessName, size: 52)
        : CircleAvatar(
            radius: 26,
            backgroundColor: scheme.surfaceContainerHighest,
            backgroundImage: MemoryImage(logo),
          );
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: 16 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Form(
        key: _formKey,
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(
              'Edit business profile',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                avatar,
                const SizedBox(width: 12),
                OutlinedButton.icon(
                  onPressed: _busy ? null : () => _pickLogo(context),
                  icon: const Icon(Icons.image),
                  label: const Text('Upload logo'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const SectionHeader(title: 'Business profile', padding: EdgeInsets.zero),
            const SizedBox(height: 8),
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
            const SectionHeader(title: 'Bank details', padding: EdgeInsets.zero),
            const SizedBox(height: 8),
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
            const SizedBox(height: 20),
            const SectionHeader(title: 'Payments', padding: EdgeInsets.zero),
            const SizedBox(height: 8),
            TextFormField(
              controller: _paymentLinkCtrl,
              decoration: const InputDecoration(labelText: 'Payment link'),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _busy ? null : () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: _busy ? null : () => _save(context),
                    child: _busy
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Save'),
                  ),
                ),
              ],
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
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
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

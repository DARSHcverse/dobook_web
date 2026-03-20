import 'dart:convert';

import 'package:dobook/app/session.dart';
import 'package:dobook/data/models/business.dart';
import 'package:dobook/ui/dashboard/settings/additional_charges_screen.dart';
import 'package:dobook/ui/dashboard/settings/business_information_screen.dart';
import 'package:dobook/ui/dashboard/settings/business_type_screen.dart';
import 'package:dobook/ui/dashboard/settings/contact_support_screen.dart';
import 'package:dobook/ui/dashboard/settings/delete_account_screen.dart';
import 'package:dobook/ui/dashboard/settings/payment_details_screen.dart';
import 'package:dobook/ui/dashboard/settings/reminder_settings_screen.dart';
import 'package:dobook/ui/dashboard/settings/subscription_plan_screen.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:dobook/ui/shared/widgets/page_transitions.dart';
import 'package:dobook/ui/shared/widgets/section_header.dart';
import 'package:flutter/material.dart';
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

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text('Settings'),
        actions: [
          IconButton(
            tooltip: 'Logout',
            onPressed: () => session.logout(),
            icon: const Icon(Icons.logout_rounded, color: Color(0xFF94A3B8)),
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
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              children: [
                _ProfileHeaderCard(
                  business: business,
                  onEdit: () => _openSettingsScreen(
                    context,
                    const BusinessInformationScreen(),
                  ),
                ),
                const SizedBox(height: 24),
                const SectionHeader(label: 'Business'),
                _SettingsCard(
                  children: [
                    _SettingsRow(
                      icon: Icons.domain_outlined,
                      label: 'Business Information',
                      onTap: () => _openSettingsScreen(
                        context,
                        const BusinessInformationScreen(),
                      ),
                    ),
                    const Divider(color: Color(0xFFF3F4F5), height: 1),
                    _SettingsRow(
                      icon: Icons.payments_outlined,
                      label: 'Payment Details',
                      onTap: () => _openSettingsScreen(
                        context,
                        const PaymentDetailsScreen(),
                      ),
                    ),
                    const Divider(color: Color(0xFFF3F4F5), height: 1),
                    _SettingsRow(
                      icon: Icons.receipt_long_outlined,
                      label: 'Additional Charges',
                      onTap: () => _openSettingsScreen(
                        context,
                        const AdditionalChargesScreen(),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const SectionHeader(label: 'Booking'),
                _SettingsCard(
                  children: [
                    _SettingsRow(
                      icon: Icons.notifications_active_outlined,
                      label: 'Reminder Settings',
                      onTap: () => _openSettingsScreen(
                        context,
                        const ReminderSettingsScreen(),
                      ),
                    ),
                    const Divider(color: Color(0xFFF3F4F5), height: 1),
                    _SettingsRow(
                      icon: Icons.category_outlined,
                      label: 'Business Type',
                      onTap: () => _openSettingsScreen(
                        context,
                        const BusinessTypeScreen(),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const SectionHeader(label: 'Account'),
                _SettingsCard(
                  children: [
                    _SettingsRow(
                      icon: Icons.card_membership_outlined,
                      label: 'Subscription Plan',
                      trailing: _PlanBadge(plan: business.subscriptionPlan),
                      onTap: () => _openSettingsScreen(
                        context,
                        const SubscriptionPlanScreen(),
                      ),
                    ),
                    const Divider(color: Color(0xFFF3F4F5), height: 1),
                    _SettingsRow(
                      icon: Icons.contact_support_outlined,
                      label: 'Contact Support',
                      onTap: () => _openSettingsScreen(
                        context,
                        const ContactSupportScreen(),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  'DANGER ZONE',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.8,
                    color: const Color(0xFFBE002B),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFFFDAD6)),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x0A191C1D),
                        blurRadius: 18,
                        offset: Offset(0, 6),
                      ),
                    ],
                  ),
                  child: _SettingsRow(
                    icon: Icons.delete_forever_outlined,
                    label: 'Delete Account',
                    danger: true,
                    onTap: () => _confirmDeleteAccount(context),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _openSettingsScreen(BuildContext context, Widget screen) async {
    await Navigator.of(context).push(slidePageRoute(screen));
    if (mounted) {
      setState(() => _loadFuture = _loadBusiness());
    }
  }

  Future<void> _confirmDeleteAccount(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete this business account?'),
          content: const Text(
            'You can review the final confirmation details on the next screen.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFBE002B),
                foregroundColor: Colors.white,
              ),
              child: const Text('Continue'),
            ),
          ],
        );
      },
    );

    if (confirm == true && context.mounted) {
      await _openSettingsScreen(context, const DeleteAccountScreen());
    }
  }

  Future<void> _loadBusiness() async {
    final session = context.read<AppSession>();
    final token = session.token;
    if (token == null || token.isEmpty) {
      throw Exception('Not authenticated.');
    }
    await session.refreshBusiness();
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
                setState(() => _loadFuture = _loadBusiness());
              },
              child: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileHeaderCard extends StatelessWidget {
  const _ProfileHeaderCard({required this.business, required this.onEdit});

  final Business business;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final imageProvider = _logoImageProvider(business.logoUrl);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A191C1D),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              _BusinessAvatar(
                name: business.businessName,
                size: 80,
                imageProvider: imageProvider,
              ),
              Positioned(
                right: -4,
                bottom: -4,
                child: Material(
                  color: const Color(0xFFBE002B),
                  shape: const CircleBorder(),
                  child: InkWell(
                    onTap: onEdit,
                    customBorder: const CircleBorder(),
                    child: const SizedBox(
                      width: 28,
                      height: 28,
                      child: Icon(
                        Icons.edit_rounded,
                        size: 14,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  business.businessName.isEmpty
                      ? 'Business Name'
                      : business.businessName,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  business.email,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontSize: 14,
                    color: const Color(0xFF94A3B8),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF91F2F4).withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    'Verified Business',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: const Color(0xFF004F51),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  ImageProvider? _logoImageProvider(String logoUrl) {
    if (logoUrl.isEmpty) return null;
    if (logoUrl.startsWith('data:')) {
      final parts = logoUrl.split(',');
      if (parts.length == 2) {
        try {
          return MemoryImage(base64Decode(parts[1]));
        } catch (_) {
          return null;
        }
      }
    }
    if (logoUrl.startsWith('http')) {
      return NetworkImage(logoUrl);
    }
    return null;
  }
}

class _BusinessAvatar extends StatelessWidget {
  const _BusinessAvatar({
    required this.name,
    required this.size,
    this.imageProvider,
  });

  final String name;
  final double size;
  final ImageProvider? imageProvider;

  @override
  Widget build(BuildContext context) {
    if (imageProvider != null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          image: DecorationImage(image: imageProvider!, fit: BoxFit.cover),
        ),
      );
    }

    final initials = _initials(name);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFFBE002B),
        borderRadius: BorderRadius.circular(16),
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }

  String _initials(String value) {
    final parts = value
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty);
    if (parts.isEmpty) return 'DB';
    final list = parts.toList();
    if (list.length == 1) return list.first.substring(0, 1).toUpperCase();
    return '${list.first[0]}${list.last[0]}'.toUpperCase();
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A191C1D),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  const _SettingsRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
    this.danger = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Widget? trailing;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final labelColor = danger
        ? const Color(0xFFBE002B)
        : const Color(0xFF191C1D);
    final iconColor = danger
        ? const Color(0xFFBE002B)
        : const Color(0xFF94A3B8);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Row(
            children: [
              Icon(icon, size: 24, color: iconColor),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: labelColor,
                  ),
                ),
              ),
              if (trailing != null) ...[trailing!, const SizedBox(width: 8)],
              const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlanBadge extends StatelessWidget {
  const _PlanBadge({required this.plan});

  final String plan;

  @override
  Widget build(BuildContext context) {
    final normalized = plan.toLowerCase().contains('pro') ? 'Pro' : 'Free';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: normalized == 'Pro'
            ? const Color(0xFF91F2F4).withValues(alpha: 0.3)
            : const Color(0xFFE7E8E9),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        normalized,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: normalized == 'Pro'
              ? const Color(0xFF004F51)
              : const Color(0xFF5D3F3F),
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

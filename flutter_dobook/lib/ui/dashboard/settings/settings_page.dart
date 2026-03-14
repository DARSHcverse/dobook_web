import 'dart:convert';

import 'package:dobook/app/session.dart';
import 'package:dobook/app/theme.dart';
import 'package:dobook/data/models/business.dart';
import 'package:dobook/ui/dashboard/settings/additional_charges_screen.dart';
import 'package:dobook/ui/dashboard/settings/business_information_screen.dart';
import 'package:dobook/ui/dashboard/settings/business_type_screen.dart';
import 'package:dobook/ui/dashboard/settings/payment_details_screen.dart';
import 'package:dobook/ui/dashboard/settings/reminder_settings_screen.dart';
import 'package:dobook/ui/shared/widgets/page_transitions.dart';
import 'package:dobook/ui/shared/widgets/avatar_widget.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/foundation.dart';
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
                _sectionHeader(context, 'Business'),
                _sectionCard(
                  context,
                  children: [
                    _settingsRow(
                      context,
                      icon: Icons.storefront,
                      label: 'Business Information',
                      color: Theme.of(context).colorScheme.primary,
                      onTap: () => _openSettingsScreen(
                        context,
                        const BusinessInformationScreen(),
                      ),
                    ),
                    _settingsDivider(context),
                    _settingsRow(
                      context,
                      icon: Icons.payments,
                      label: 'Payment Details',
                      color: Theme.of(context).colorScheme.secondary,
                      onTap: () => _openSettingsScreen(
                        context,
                        const PaymentDetailsScreen(),
                      ),
                    ),
                    _settingsDivider(context),
                    _settingsRow(
                      context,
                      icon: Icons.attach_money,
                      label: 'Additional Charges',
                      color: Theme.of(context).colorScheme.tertiary,
                      onTap: () => _openSettingsScreen(
                        context,
                        const AdditionalChargesScreen(),
                      ),
                    ),
                  ],
                ),
                _sectionHeader(context, 'Booking'),
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
                      onTap: () => _openSettingsScreen(
                        context,
                        const ReminderSettingsScreen(),
                      ),
                    ),
                    _settingsDivider(context),
                    _settingsRow(
                      context,
                      icon: Icons.category,
                      label: 'Business Type',
                      color: Theme.of(context).colorScheme.tertiary,
                      onTap: () => _openSettingsScreen(
                        context,
                        const BusinessTypeScreen(),
                      ),
                    ),
                  ],
                ),
                _sectionHeader(context, 'Appearance'),
                _sectionCard(
                  context,
                  children: [
                    _settingsRow(
                      context,
                      icon: Icons.dark_mode,
                      label: 'Dark Mode',
                      color: Theme.of(context).colorScheme.primary,
                      trailing: Switch(
                        value: session.themeMode == ThemeMode.dark,
                        onChanged: (value) {
                          session.setThemeMode(
                            value ? ThemeMode.dark : ThemeMode.light,
                          );
                        },
                      ),
                      showChevron: false,
                      onTap: () {
                        final next = session.themeMode == ThemeMode.dark
                            ? ThemeMode.light
                            : ThemeMode.dark;
                        session.setThemeMode(next);
                      },
                    ),
                  ],
                ),
                _sectionHeader(context, 'Account'),
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
                _sectionHeader(context, 'Danger Zone'),
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
    final isLight = Theme.of(context).brightness == Brightness.light;
    return Container(
      decoration: BoxDecoration(
        color: isLight ? Colors.white : scheme.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
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
              ],
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            decoration: BoxDecoration(
              color: scheme.surfaceContainerHighest,
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(20),
              ),
            ),
            child: FilledButton(
              onPressed: () => _openSettingsScreen(
                context,
                const BusinessInformationScreen(),
              ),
              child: const Text('Edit Profile'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionCard(BuildContext context, {required List<Widget> children}) {
    final scheme = Theme.of(context).colorScheme;
    final isLight = Theme.of(context).brightness == Brightness.light;
    return Container(
      decoration: BoxDecoration(
        color: isLight ? Colors.white : scheme.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _settingsDivider(BuildContext context) {
    return Divider(height: 1, color: Theme.of(context).colorScheme.outlineVariant);
  }

  Widget _sectionHeader(BuildContext context, String label) {
    return Padding(
      padding: const EdgeInsets.only(top: 20, bottom: 8),
      child: Text(
        label.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontSize: 11,
              letterSpacing: 1.4,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF9CA3AF),
            ),
      ),
    );
  }

  Widget _settingsRow(
    BuildContext context, {
    required IconData icon,
    required String label,
    required Color color,
    VoidCallback? onTap,
    Widget? trailing,
    bool danger = false,
    bool showChevron = true,
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
            if (showChevron) ...[
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right, color: Color(0xFFD1D5DB)),
            ],
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

  Future<void> _openSettingsScreen(BuildContext context, Widget screen) async {
    await Navigator.of(context).push(slidePageRoute(screen));
    if (mounted) {
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

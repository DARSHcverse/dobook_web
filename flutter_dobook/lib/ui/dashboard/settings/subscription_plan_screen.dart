import 'package:dobook/app/session.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

const _dashboardUrl = 'https://www.do-book.com/dashboard';
const _brandRed = Color(0xFFBE002B);
const _brandRedBright = Color(0xFFE8193C);

const _proFeatures = <String>[
  'Unlimited bookings',
  'Invoice PDFs',
  'Automated SMS reminders',
  'Google Calendar sync',
  'Multi-step enquiry page',
  'Staff management',
  'Priority support',
];

const _freeMissingFeatures = <String>[
  'Invoice PDFs',
  'SMS reminders',
  'Google Calendar sync',
  'Unlimited bookings',
  'Enquiry page',
  'Priority support',
];

class SubscriptionPlanScreen extends StatelessWidget {
  const SubscriptionPlanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final business = session.business;

    return Scaffold(
      appBar: AppBar(title: const Text('Subscription Plan')),
      body: SafeArea(
        child: session.isInitializing
            ? const LoadingShimmerList()
            : business == null
                ? _ErrorState(
                    message:
                        'Business profile unavailable. Please try again.',
                  )
                : _isPro(business.subscriptionPlan)
                    ? _ProPlanView(
                        bookingCount: business.bookingCount,
                      )
                    : _FreePlanView(
                        bookingCount: business.bookingCount,
                      ),
      ),
    );
  }

  static bool _isPro(String plan) {
    final v = plan.trim().toLowerCase();
    return v == 'pro' || v == 'enterprise';
  }
}

class _FreePlanView extends StatelessWidget {
  const _FreePlanView({required this.bookingCount});

  final int bookingCount;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
      children: [
        _PlanHeaderCard(
          badgeText: 'Free Plan',
          badgeColor: const Color(0xFF9CA3AF),
          backgroundColor: const Color(0xFFF5F5F7),
          title: '50 bookings/month included',
          subtitle: '$bookingCount of 50 bookings used this month',
        ),
        const SizedBox(height: 20),
        Text(
          "You're missing out on",
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
          ),
          child: Column(
            children: [
              for (final feature in _freeMissingFeatures)
                _FeatureRow(label: feature, included: false),
            ],
          ),
        ),
        const SizedBox(height: 24),
        _UpgradeCard(),
      ],
    );
  }
}

class _UpgradeCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _brandRedBright, width: 2),
        boxShadow: [
          BoxShadow(
            color: _brandRedBright.withValues(alpha: 0.12),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Upgrade to Pro',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '\$20 AUD',
                style:
                    Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: _brandRed,
                        ),
              ),
              const SizedBox(width: 6),
              Text(
                '/ month',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Cancel anytime',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 16),
          for (final feature in _proFeatures)
            _FeatureRow(label: feature, included: true),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: _brandRedBright,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: () => _openDashboard(context),
              child: const Text(
                'Upgrade to Pro',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProPlanView extends StatelessWidget {
  const _ProPlanView({required this.bookingCount});

  final int bookingCount;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
      children: [
        _PlanHeaderCard(
          badgeText: 'Pro Plan ✓',
          badgeColor: const Color(0xFF2E7D32),
          backgroundColor: const Color(0xFFE8F5E9),
          title: 'Active',
          subtitle: 'Monthly subscription · \$20 AUD/month',
        ),
        const SizedBox(height: 20),
        Text(
          'What you get',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
          ),
          child: Column(
            children: [
              for (final feature in _proFeatures)
                _FeatureRow(label: feature, included: true),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          '$bookingCount bookings created so far.',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: _brandRed,
              side: const BorderSide(color: _brandRed, width: 1.5),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            onPressed: () => _openDashboard(context),
            child: const Text(
              'Manage Billing',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: TextButton(
            onPressed: () => _confirmCancel(context),
            child: Text(
              'Cancel subscription',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    decoration: TextDecoration.underline,
                  ),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _confirmCancel(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Cancel subscription?'),
          content: const Text(
            'Are you sure you want to cancel? Your Pro access will continue '
            'until the end of your billing period.',
          ),
          actions: [
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: _brandRedBright,
                foregroundColor: Colors.white,
              ),
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Keep Pro'),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text(
                'Cancel Subscription',
                style: TextStyle(color: Color(0xFF6B7280)),
              ),
            ),
          ],
        );
      },
    );

    if (result == true && context.mounted) {
      await _openDashboard(context);
    }
  }
}

Future<void> _openDashboard(BuildContext context) async {
  final uri = Uri.parse(_dashboardUrl);
  final messenger = ScaffoldMessenger.of(context);
  final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!ok) {
    messenger.showSnackBar(
      const SnackBar(
        content: Text(
          'Could not open browser. Visit www.do-book.com/dashboard to manage your subscription.',
        ),
      ),
    );
  }
}

class _PlanHeaderCard extends StatelessWidget {
  const _PlanHeaderCard({
    required this.badgeText,
    required this.badgeColor,
    required this.backgroundColor,
    required this.title,
    required this.subtitle,
  });

  final String badgeText;
  final Color badgeColor;
  final Color backgroundColor;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: badgeColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
            ),
            child: Text(
              badgeText,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: badgeColor,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ],
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  const _FeatureRow({required this.label, required this.included});

  final String label;
  final bool included;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(
            included ? Icons.check_circle : Icons.cancel,
            size: 20,
            color: included
                ? const Color(0xFF2E7D32)
                : const Color(0xFFE8193C),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
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
              message,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => Navigator.of(context).maybePop(),
              child: const Text('Go back'),
            ),
          ],
        ),
      ),
    );
  }
}

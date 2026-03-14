import 'package:dobook/app/session.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class SubscriptionPlanScreen extends StatefulWidget {
  const SubscriptionPlanScreen({super.key});

  @override
  State<SubscriptionPlanScreen> createState() => _SubscriptionPlanScreenState();
}

class _SubscriptionPlanScreenState extends State<SubscriptionPlanScreen> {
  String _selectedPlan = 'Free';
  bool _busy = false;

  static const _plans = ['Free', 'Starter', 'Pro', 'Enterprise'];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final business = context.read<AppSession>().business;
    if (business != null && business.subscriptionPlan.trim().isNotEmpty) {
      _selectedPlan = _normalizePlan(business.subscriptionPlan);
    }
  }

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
                ? _errorState(
                    context,
                    'Business profile unavailable. Please try again.',
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    children: [
                      Text(
                        'Current plan: ${_normalizePlan(business.subscriptionPlan)}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      RadioGroup<String>(
                        groupValue: _selectedPlan,
                        onChanged: (value) {
                          if (value == null) return;
                          setState(() => _selectedPlan = value);
                        },
                        child: Column(
                          children: [
                            for (final plan in _plans)
                              RadioListTile<String>(
                                value: plan,
                                title: Text(plan),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      FilledButton(
                        onPressed: _busy ? null : _save,
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
      ),
    );
  }

  String _normalizePlan(String plan) {
    final value = plan.trim();
    if (value.isEmpty) return 'Free';
    return value[0].toUpperCase() + value.substring(1);
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

  Future<void> _save() async {
    setState(() => _busy = true);
    await Future<void>.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;
    setState(() => _busy = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Plan preference saved')),
    );
  }
}

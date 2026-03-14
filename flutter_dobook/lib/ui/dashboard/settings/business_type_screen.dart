import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class BusinessTypeScreen extends StatefulWidget {
  const BusinessTypeScreen({super.key});

  @override
  State<BusinessTypeScreen> createState() => _BusinessTypeScreenState();
}

class _BusinessTypeScreenState extends State<BusinessTypeScreen> {
  String _businessType = 'Photography';
  bool _busy = false;

  static const _types = [
    'Photography',
    'Events',
    'Hospitality',
    'Retail',
    'Wellness',
    'Other',
  ];

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();

    return Scaffold(
      appBar: AppBar(title: const Text('Business Type')),
      body: SafeArea(
        child: session.isInitializing
            ? const LoadingShimmerList()
            : session.token == null
                ? _errorState(context, 'Not authenticated. Please log in again.')
                : ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    children: [
                      DropdownButtonFormField<String>(
                        initialValue: _businessType,
                        decoration:
                            const InputDecoration(labelText: 'Business type'),
                        items: _types
                            .map(
                              (type) => DropdownMenuItem(
                                value: type,
                                child: Text(type),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          setState(() => _businessType = value ?? _businessType);
                        },
                      ),
                      const SizedBox(height: 24),
                      FilledButton(
                        onPressed: _busy ? null : () => _save(context),
                        child: _busy
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Save'),
                      ),
                    ],
                  ),
      ),
    );
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

  Future<void> _save(BuildContext context) async {
    setState(() => _busy = true);
    try {
      final repo = context.read<DobookRepository>();
      final session = context.read<AppSession>();
      final token = session.token;
      if (token == null || token.isEmpty) {
        throw Exception('Not authenticated.');
      }

      await repo.updateBusinessProfile(token, {
        'business_type': _businessType,
      });

      await session.refreshBusiness();
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Business type saved')),
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

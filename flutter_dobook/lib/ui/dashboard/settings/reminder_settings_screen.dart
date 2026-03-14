import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class ReminderSettingsScreen extends StatefulWidget {
  const ReminderSettingsScreen({super.key});

  @override
  State<ReminderSettingsScreen> createState() => _ReminderSettingsScreenState();
}

class _ReminderSettingsScreenState extends State<ReminderSettingsScreen> {
  bool _remindersEnabled = true;
  int _daysBefore = 2;
  bool _busy = false;

  static const _dayOptions = [1, 2, 3, 5, 7];

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();

    return Scaffold(
      appBar: AppBar(title: const Text('Reminder Settings')),
      body: SafeArea(
        child: session.isInitializing
            ? const LoadingShimmerList()
            : session.token == null
                ? _errorState(context, 'Not authenticated. Please log in again.')
                : ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    children: [
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Enable reminders'),
                        subtitle: const Text('Send reminders before bookings'),
                        value: _remindersEnabled,
                        onChanged: (value) {
                          setState(() => _remindersEnabled = value);
                        },
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<int>(
                        initialValue: _daysBefore,
                        decoration: const InputDecoration(
                          labelText: 'Days before booking',
                        ),
                        items: _dayOptions
                            .map(
                              (day) => DropdownMenuItem(
                                value: day,
                                child: Text('$day day${day == 1 ? '' : 's'}'),
                              ),
                            )
                            .toList(),
                        onChanged: _remindersEnabled
                            ? (value) {
                                setState(() => _daysBefore = value ?? 2);
                              }
                            : null,
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
        'reminders_enabled': _remindersEnabled,
        'reminder_days_before': _daysBefore,
      });

      await session.refreshBusiness();
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Reminder settings saved')),
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

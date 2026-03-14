import 'package:dobook/app/session.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class BookingFieldsExtrasScreen extends StatefulWidget {
  const BookingFieldsExtrasScreen({super.key});

  @override
  State<BookingFieldsExtrasScreen> createState() => _BookingFieldsExtrasScreenState();
}

class _BookingFieldsExtrasScreenState extends State<BookingFieldsExtrasScreen> {
  bool _showNotes = true;
  bool _showParking = true;
  bool _showPackage = true;
  bool _showEventLocation = true;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();

    return Scaffold(
      appBar: AppBar(title: const Text('Booking Fields & Extras')),
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
                        title: const Text('Notes field'),
                        subtitle: const Text('Allow notes for bookings'),
                        value: _showNotes,
                        onChanged: (value) {
                          setState(() => _showNotes = value);
                        },
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Parking information'),
                        subtitle: const Text('Capture parking info'),
                        value: _showParking,
                        onChanged: (value) {
                          setState(() => _showParking = value);
                        },
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Package / duration'),
                        subtitle: const Text('Show package duration field'),
                        value: _showPackage,
                        onChanged: (value) {
                          setState(() => _showPackage = value);
                        },
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Event location'),
                        subtitle: const Text('Show event location field'),
                        value: _showEventLocation,
                        onChanged: (value) {
                          setState(() => _showEventLocation = value);
                        },
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
      const SnackBar(content: Text('Booking fields saved')),
    );
  }
}

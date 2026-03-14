import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class AdditionalChargesScreen extends StatefulWidget {
  const AdditionalChargesScreen({super.key});

  @override
  State<AdditionalChargesScreen> createState() => _AdditionalChargesScreenState();
}

class _AdditionalChargesScreenState extends State<AdditionalChargesScreen> {
  bool _travelEnabled = false;
  bool _cbdEnabled = false;

  final _travelLabelCtrl = TextEditingController(text: 'Travel charge');
  final _travelFreeDistanceCtrl = TextEditingController();
  final _travelRateCtrl = TextEditingController();

  final _cbdLabelCtrl = TextEditingController(text: 'CBD logistics charge');
  final _cbdAmountCtrl = TextEditingController();

  bool _busy = false;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    final business = context.read<AppSession>().business;
    if (business == null) return;
    _travelEnabled = business.travelChargeEnabled;
    _travelLabelCtrl.text = business.travelChargeLabel;
    if (business.travelChargeFreeDistance > 0) {
      _travelFreeDistanceCtrl.text = business.travelChargeFreeDistance.toString();
    }
    if (business.travelChargeRatePerKm > 0) {
      _travelRateCtrl.text = business.travelChargeRatePerKm.toString();
    }
    _cbdEnabled = business.cbdChargeEnabled;
    _cbdLabelCtrl.text = business.cbdChargeLabel;
    if (business.cbdChargeAmount > 0) {
      _cbdAmountCtrl.text = business.cbdChargeAmount.toString();
    }
    _initialized = true;
  }

  @override
  void dispose() {
    _travelLabelCtrl.dispose();
    _travelFreeDistanceCtrl.dispose();
    _travelRateCtrl.dispose();
    _cbdLabelCtrl.dispose();
    _cbdAmountCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();

    return Scaffold(
      appBar: AppBar(title: const Text('Additional Charges')),
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
                        title: const Text('Travel charge'),
                        value: _travelEnabled,
                        onChanged: (value) {
                          setState(() => _travelEnabled = value);
                        },
                      ),
                      const SizedBox(height: 12),
                      _toggleSection(
                        enabled: _travelEnabled,
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _travelLabelCtrl,
                              decoration:
                                  const InputDecoration(labelText: 'Label'),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _travelFreeDistanceCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Free distance (km)',
                              ),
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _travelRateCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Rate per km',
                              ),
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('CBD logistics charge'),
                        value: _cbdEnabled,
                        onChanged: (value) {
                          setState(() => _cbdEnabled = value);
                        },
                      ),
                      const SizedBox(height: 12),
                      _toggleSection(
                        enabled: _cbdEnabled,
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _cbdLabelCtrl,
                              decoration:
                                  const InputDecoration(labelText: 'Label'),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _cbdAmountCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Amount',
                              ),
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                            ),
                          ],
                        ),
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

  Widget _toggleSection({required bool enabled, required Widget child}) {
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 200),
      opacity: enabled ? 1 : 0.4,
      child: IgnorePointer(
        ignoring: !enabled,
        child: child,
      ),
    );
  }

  double? _parseDouble(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    return double.tryParse(trimmed);
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

      final updates = <String, dynamic>{
        'travel_charge_enabled': _travelEnabled,
        'travel_charge_label': _travelLabelCtrl.text.trim(),
        'cbd_charge_enabled': _cbdEnabled,
        'cbd_charge_label': _cbdLabelCtrl.text.trim(),
      };

      final travelFree = _parseDouble(_travelFreeDistanceCtrl.text);
      final travelRate = _parseDouble(_travelRateCtrl.text);
      final cbdAmount = _parseDouble(_cbdAmountCtrl.text);

      if (travelFree != null) {
        updates['travel_charge_free_distance'] = travelFree;
      }
      if (travelRate != null) {
        updates['travel_charge_rate_per_km'] = travelRate;
      }
      if (cbdAmount != null) {
        updates['cbd_charge_amount'] = cbdAmount;
      }

      await repo.updateBusinessProfile(token, updates);
      await session.refreshBusiness();
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Additional charges saved')),
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

import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/ui/shared/widgets/editorial_action_button.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

class AdditionalChargesScreen extends StatefulWidget {
  const AdditionalChargesScreen({super.key});

  @override
  State<AdditionalChargesScreen> createState() =>
      _AdditionalChargesScreenState();
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
      _travelFreeDistanceCtrl.text = business.travelChargeFreeDistance
          .toString();
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
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                children: [
                  _ChargeCard(
                    title: 'Travel Charge',
                    value: _travelEnabled,
                    onChanged: (value) {
                      setState(() => _travelEnabled = value);
                    },
                    child: _AnimatedChargeFields(
                      visible: _travelEnabled,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Divider(color: Color(0xFFF3F4F5), height: 32),
                          _FieldBlock(
                            label: 'Label',
                            child: TextFormField(
                              controller: _travelLabelCtrl,
                              decoration: const InputDecoration(
                                hintText: 'Travel charge',
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          _FieldBlock(
                            label: 'Free Distance (km)',
                            child: TextFormField(
                              controller: _travelFreeDistanceCtrl,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              decoration: const InputDecoration(hintText: '20'),
                            ),
                          ),
                          const SizedBox(height: 20),
                          _FieldBlock(
                            label: 'Rate per km',
                            child: TextFormField(
                              controller: _travelRateCtrl,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              decoration: const InputDecoration(
                                hintText: '1.50',
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Charges are applied only after the free distance threshold is exceeded.',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: const Color(
                                0xFF5D3F3F,
                              ).withValues(alpha: 0.78),
                              height: 1.45,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _ChargeCard(
                    title: 'CBD Logistics Charge',
                    value: _cbdEnabled,
                    onChanged: (value) {
                      setState(() => _cbdEnabled = value);
                    },
                    child: _AnimatedChargeFields(
                      visible: _cbdEnabled,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Divider(color: Color(0xFFF3F4F5), height: 32),
                          _FieldBlock(
                            label: 'Label',
                            child: TextFormField(
                              controller: _cbdLabelCtrl,
                              decoration: const InputDecoration(
                                hintText: 'CBD logistics charge',
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          _FieldBlock(
                            label: 'Amount (\$)',
                            child: TextFormField(
                              controller: _cbdAmountCtrl,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              decoration: const InputDecoration(hintText: '35'),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Applied when postcode is 3000',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: const Color(
                                0xFF5D3F3F,
                              ).withValues(alpha: 0.78),
                              height: 1.45,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  EditorialActionButton(
                    label: 'Save Charges',
                    isLoading: _busy,
                    onPressed: _busy ? null : () => _save(context),
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Additional charges saved')));
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

class _ChargeCard extends StatelessWidget {
  const _ChargeCard({
    required this.title,
    required this.value,
    required this.onChanged,
    required this.child,
  });

  final String title;
  final bool value;
  final ValueChanged<bool> onChanged;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
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
      child: Column(
        children: [
          SwitchListTile.adaptive(
            value: value,
            onChanged: onChanged,
            contentPadding: EdgeInsets.zero,
            activeThumbColor: const Color(0xFFBE002B),
            activeTrackColor: const Color(0xFFBE002B).withValues(alpha: 0.32),
            title: Text(
              title,
              style: GoogleFonts.manrope(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF191C1D),
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}

class _AnimatedChargeFields extends StatelessWidget {
  const _AnimatedChargeFields({required this.visible, required this.child});

  final bool visible;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 220),
      transitionBuilder: (child, animation) {
        return SizeTransition(
          sizeFactor: animation,
          axisAlignment: -1,
          child: FadeTransition(opacity: animation, child: child),
        );
      },
      child: visible
          ? KeyedSubtree(key: const ValueKey('visible'), child: child)
          : const SizedBox.shrink(key: ValueKey('hidden')),
    );
  }
}

class _FieldBlock extends StatelessWidget {
  const _FieldBlock({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.8,
            color: const Color(0xFFAC313A),
          ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

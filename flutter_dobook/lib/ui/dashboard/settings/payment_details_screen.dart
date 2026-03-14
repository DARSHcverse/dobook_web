import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/business.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class PaymentDetailsScreen extends StatefulWidget {
  const PaymentDetailsScreen({super.key});

  @override
  State<PaymentDetailsScreen> createState() => _PaymentDetailsScreenState();
}

class _PaymentDetailsScreenState extends State<PaymentDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _bankNameCtrl;
  late final TextEditingController _accountNameCtrl;
  late final TextEditingController _bsbCtrl;
  late final TextEditingController _accountNumberCtrl;
  late final TextEditingController _paymentLinkCtrl;
  bool _busy = false;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _bankNameCtrl = TextEditingController();
    _accountNameCtrl = TextEditingController();
    _bsbCtrl = TextEditingController();
    _accountNumberCtrl = TextEditingController();
    _paymentLinkCtrl = TextEditingController();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    final business = context.read<AppSession>().business;
    if (business == null) return;
    _bankNameCtrl.text = business.bankName;
    _accountNameCtrl.text = business.accountName;
    _bsbCtrl.text = business.bsb;
    _accountNumberCtrl.text = business.accountNumber;
    _paymentLinkCtrl.text = business.paymentLink;
    _initialized = true;
  }

  @override
  void dispose() {
    _bankNameCtrl.dispose();
    _accountNameCtrl.dispose();
    _bsbCtrl.dispose();
    _accountNumberCtrl.dispose();
    _paymentLinkCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final business = session.business;

    return Scaffold(
      appBar: AppBar(title: const Text('Payment Details')),
      body: SafeArea(
        child: _buildBody(context, business, session),
      ),
    );
  }

  Widget _buildBody(BuildContext context, Business? business, AppSession session) {
    if (session.isInitializing) {
      return const LoadingShimmerList();
    }

    if (business == null) {
      return _errorState(
        context,
        'Business profile unavailable. Please try again.',
        onRetry: () async {
          await session.refreshBusiness();
          if (mounted) setState(() {});
        },
      );
    }

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
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
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _accountNumberCtrl,
            decoration: const InputDecoration(labelText: 'Account number'),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _paymentLinkCtrl,
            decoration: const InputDecoration(labelText: 'Payment link (optional)'),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : () => _save(context),
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
    );
  }

  Widget _errorState(
    BuildContext context,
    String message, {
    required Future<void> Function() onRetry,
  }) {
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
              'Unable to load payment details',
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
              onPressed: onRetry,
              child: const Text('Try again'),
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
      final token = session.token!;

      await repo.updateBusinessProfile(token, {
        'bank_name': _bankNameCtrl.text.trim(),
        'account_name': _accountNameCtrl.text.trim(),
        'bsb': _bsbCtrl.text.trim(),
        'account_number': _accountNumberCtrl.text.trim(),
        'payment_link': _paymentLinkCtrl.text.trim(),
      });

      await session.refreshBusiness();
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Payment details saved')),
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

import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/business.dart';
import 'package:dobook/ui/shared/widgets/editorial_action_button.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
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
      body: SafeArea(child: _buildBody(context, business, session)),
    );
  }

  Widget _buildBody(
    BuildContext context,
    Business? business,
    AppSession session,
  ) {
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
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Text(
            'ACCOUNT SETTINGS',
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.8,
              color: const Color(0xFFAC313A),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Financial Profile',
            style: GoogleFonts.manrope(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF191C1D),
              height: 1.05,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Manage your payout details and the payment options clients see on invoices.',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              color: const Color(0xFF5D3F3F).withValues(alpha: 0.72),
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F4F5),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                _FieldBlock(
                  label: 'Bank Name',
                  child: TextFormField(
                    controller: _bankNameCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Commonwealth Bank',
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                _FieldBlock(
                  label: 'Account Name',
                  child: TextFormField(
                    controller: _accountNameCtrl,
                    decoration: const InputDecoration(
                      hintText: 'DoBook Pty Ltd',
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _FieldBlock(
                        label: 'BSB',
                        child: TextFormField(
                          controller: _bsbCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            hintText: '123-456',
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _FieldBlock(
                        label: 'Account Number',
                        child: TextFormField(
                          controller: _accountNumberCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            hintText: '00012345',
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                _FieldBlock(
                  label: 'Payment Link',
                  child: TextFormField(
                    controller: _paymentLinkCtrl,
                    decoration: const InputDecoration(
                      hintText: 'https://pay.example.com',
                      prefixIcon: Icon(
                        Icons.link_rounded,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF91F2F4).withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.verified_user_rounded,
                  color: Color(0xFF004F51),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Bank Verified',
                    style: GoogleFonts.manrope(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF004F51),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          EditorialActionButton(
            label: 'Save Payment Details',
            isLoading: _busy,
            onPressed: _busy ? null : () => _save(context),
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
            FilledButton(onPressed: onRetry, child: const Text('Try again')),
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Payment details saved')));
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

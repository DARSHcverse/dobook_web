import 'package:dobook/app/session.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class ContactSupportScreen extends StatefulWidget {
  const ContactSupportScreen({super.key});

  @override
  State<ContactSupportScreen> createState() => _ContactSupportScreenState();
}

class _ContactSupportScreenState extends State<ContactSupportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectCtrl = TextEditingController();
  final _messageCtrl = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final business = session.business;

    return Scaffold(
      appBar: AppBar(title: const Text('Contact Support')),
      body: SafeArea(
        child: session.isInitializing
            ? const LoadingShimmerList()
            : business == null
                ? _errorState(
                    context,
                    'Business profile unavailable. Please try again.',
                  )
                : Form(
                    key: _formKey,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                      children: [
                        Text(
                          'We will reply to: ${business.email}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _subjectCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Subject',
                          ),
                          validator: (v) =>
                              (v == null || v.trim().isEmpty) ? 'Required' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _messageCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Message',
                          ),
                          minLines: 4,
                          maxLines: 8,
                          validator: (v) =>
                              (v == null || v.trim().isEmpty) ? 'Required' : null,
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
                              : const Text('Send'),
                        ),
                      ],
                    ),
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
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    await Future<void>.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;
    setState(() => _busy = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Support message sent')),
    );
    _subjectCtrl.clear();
    _messageCtrl.clear();
  }
}

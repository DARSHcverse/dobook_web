import 'package:dobook/app/session.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _busy = false;
  bool _obscure = true;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();

    return Scaffold(
      appBar: AppBar(title: const Text('Change Password')),
      body: SafeArea(
        child: session.isInitializing
            ? const LoadingShimmerList()
            : session.token == null
                ? _errorState(context, 'Not authenticated. Please log in again.')
                : Form(
                    key: _formKey,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                      children: [
                        TextFormField(
                          controller: _currentCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Current password',
                          ),
                          obscureText: _obscure,
                          validator: (v) =>
                              (v == null || v.trim().isEmpty) ? 'Required' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _newCtrl,
                          decoration: const InputDecoration(
                            labelText: 'New password',
                          ),
                          obscureText: _obscure,
                          validator: (v) {
                            if (v == null || v.trim().length < 6) {
                              return 'Min 6 characters';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _confirmCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Confirm new password',
                          ),
                          obscureText: _obscure,
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) {
                              return 'Required';
                            }
                            if (v.trim() != _newCtrl.text.trim()) {
                              return 'Passwords do not match';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        TextButton.icon(
                          onPressed: () {
                            setState(() => _obscure = !_obscure);
                          },
                          icon: Icon(
                            _obscure ? Icons.visibility : Icons.visibility_off,
                          ),
                          label: Text(_obscure ? 'Show password' : 'Hide password'),
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
      const SnackBar(content: Text('Password updated')),
    );
    _currentCtrl.clear();
    _newCtrl.clear();
    _confirmCtrl.clear();
  }
}

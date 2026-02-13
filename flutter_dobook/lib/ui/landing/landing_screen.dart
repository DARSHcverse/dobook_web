import 'package:dobook/app/session.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLogin = true;

  final _businessNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  @override
  void dispose() {
    _businessNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset('assets/brand/dobook-logo.png', height: 28),
            const SizedBox(width: 12),
            const Text('DoBook'),
          ],
        ),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      _isLogin ? 'Sign in' : 'Create account',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 16),
                    if (!_isLogin) ...[
                      TextFormField(
                        controller: _businessNameCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Business name',
                        ),
                        textInputAction: TextInputAction.next,
                        validator: (v) {
                          if (_isLogin) return null;
                          if (v == null || v.trim().length < 2) {
                            return 'Enter a business name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _phoneCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Phone (optional)',
                        ),
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: 12),
                    ],
                    TextFormField(
                      controller: _emailCtrl,
                      decoration: const InputDecoration(labelText: 'Email'),
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) {
                          return 'Enter an email';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _passwordCtrl,
                      decoration: const InputDecoration(labelText: 'Password'),
                      obscureText: true,
                      textInputAction: TextInputAction.done,
                      validator: (v) {
                        if (v == null || v.length < 6) {
                          return 'Minimum 6 characters';
                        }
                        return null;
                      },
                      onFieldSubmitted: (_) => _submit(context),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: session.isBusy ? null : () => _submit(context),
                      child: Text(_isLogin ? 'Sign in' : 'Create account'),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: session.isBusy
                          ? null
                          : () {
                              setState(() => _isLogin = !_isLogin);
                            },
                      child: Text(
                        _isLogin
                            ? 'Create an account'
                            : 'Already have an account? Sign in',
                      ),
                    ),
                    if (session.error != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        session.error!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submit(BuildContext context) async {
    final session = context.read<AppSession>();
    if (!_formKey.currentState!.validate()) return;

    try {
      if (_isLogin) {
        await session.login(
          email: _emailCtrl.text,
          password: _passwordCtrl.text,
        );
      } else {
        await session.register(
          businessName: _businessNameCtrl.text,
          email: _emailCtrl.text,
          password: _passwordCtrl.text,
          phone: _phoneCtrl.text,
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }
}

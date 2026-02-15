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
  bool _obscurePassword = true;

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
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              scheme.surface,
              scheme.surfaceContainerLowest,
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
                children: [
                  const SizedBox(height: 8),
                  Center(
                    child: Image.asset(
                      'assets/brand/dobook-logo.png',
                      height: 72,
                      fit: BoxFit.contain,
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    _isLogin ? 'Login' : 'Create account',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.2,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _isLogin
                        ? 'Welcome back to DoBook.'
                        : 'Start managing bookings in minutes.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: 18),
                  Card(
                    elevation: 0,
                    color: scheme.surface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(color: scheme.outlineVariant),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          SegmentedButton<bool>(
                            segments: const [
                              ButtonSegment(value: true, label: Text('Login')),
                              ButtonSegment(value: false, label: Text('Create')),
                            ],
                            selected: {_isLogin},
                            onSelectionChanged: session.isBusy
                                ? null
                                : (s) {
                                    setState(() => _isLogin = s.first);
                                  },
                          ),
                          const SizedBox(height: 16),
                          Form(
                            key: _formKey,
                            child: AutofillGroup(
                              child: Column(
                                children: [
                                  if (!_isLogin) ...[
                                    TextFormField(
                                      controller: _businessNameCtrl,
                                      decoration: const InputDecoration(
                                        labelText: 'Business name',
                                      ),
                                      textInputAction: TextInputAction.next,
                                      autofillHints: const [
                                        AutofillHints.organizationName,
                                      ],
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
                                      autofillHints: const [AutofillHints.telephoneNumber],
                                    ),
                                    const SizedBox(height: 12),
                                  ],
                                  TextFormField(
                                    controller: _emailCtrl,
                                    decoration: const InputDecoration(
                                      labelText: 'Email',
                                    ),
                                    keyboardType: TextInputType.emailAddress,
                                    textInputAction: TextInputAction.next,
                                    autofillHints: const [AutofillHints.email],
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
                                    decoration: InputDecoration(
                                      labelText: 'Password',
                                      suffixIcon: IconButton(
                                        tooltip: _obscurePassword
                                            ? 'Show password'
                                            : 'Hide password',
                                        onPressed: () {
                                          setState(() {
                                            _obscurePassword = !_obscurePassword;
                                          });
                                        },
                                        icon: Icon(
                                          _obscurePassword
                                              ? Icons.visibility
                                              : Icons.visibility_off,
                                        ),
                                      ),
                                    ),
                                    obscureText: _obscurePassword,
                                    textInputAction: TextInputAction.done,
                                    autofillHints: _isLogin
                                        ? const [AutofillHints.password]
                                        : const [AutofillHints.newPassword],
                                    validator: (v) {
                                      if (v == null || v.length < 6) {
                                        return 'Minimum 6 characters';
                                      }
                                      return null;
                                    },
                                    onFieldSubmitted: (_) => _submit(context),
                                  ),
                                  if (session.error != null) ...[
                                    const SizedBox(height: 12),
                                    Text(
                                      session.error!,
                                      textAlign: TextAlign.left,
                                      style: TextStyle(color: scheme.error),
                                    ),
                                  ],
                                  const SizedBox(height: 16),
                                  FilledButton(
                                    onPressed: session.isBusy
                                        ? null
                                        : () => _submit(context),
                                    child: session.isBusy
                                        ? const SizedBox(
                                            height: 18,
                                            width: 18,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2.2,
                                            ),
                                          )
                                        : Text(
                                            _isLogin
                                                ? 'Login'
                                                : 'Create account',
                                          ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Tip: After login, use the bottom tabs to manage bookings, calendar, and settings.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                ],
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

import 'package:dobook/app/session.dart';
import 'package:dobook/app/theme.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _PatternPainter(color: brand?.patternColor ?? scheme.primaryContainer),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: Column(
                children: [
                  const SizedBox(height: 32),
                  Center(
                    child: Image.asset(
                      'assets/brand/dobook-logo.png',
                      height: 90,
                      fit: BoxFit.contain,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Smart booking for your business',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                  const Spacer(),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => _openAuthSheet(context, isLogin: false),
                      child: const Text('Get Started'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => _openAuthSheet(context, isLogin: true),
                    child: Text(
                      'I already have an account',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _openAuthSheet(BuildContext context, {required bool isLogin}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _AuthSheet(initialIsLogin: isLogin),
    );
  }
}

class _AuthSheet extends StatefulWidget {
  const _AuthSheet({required this.initialIsLogin});

  final bool initialIsLogin;

  @override
  State<_AuthSheet> createState() => _AuthSheetState();
}

class _AuthSheetState extends State<_AuthSheet> {
  final _formKey = GlobalKey<FormState>();
  bool _isLogin = true;
  bool _obscurePassword = true;

  final _businessNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _isLogin = widget.initialIsLogin;
  }

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

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: 16 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Form(
        key: _formKey,
        child: ListView(
          shrinkWrap: true,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: scheme.outlineVariant,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _isLogin ? 'Welcome back' : 'Create your account',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              _isLogin
                  ? 'Log in to manage your bookings.'
                  : 'Start managing bookings in minutes.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: session.isBusy
                        ? null
                        : () => setState(() => _isLogin = true),
                    child: const Text('Login'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: session.isBusy
                        ? null
                        : () => setState(() => _isLogin = false),
                    child: const Text('Create'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (!_isLogin) ...[
              TextFormField(
                controller: _businessNameCtrl,
                decoration: const InputDecoration(labelText: 'Business name'),
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
                decoration: const InputDecoration(labelText: 'Phone (optional)'),
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
                    _obscurePassword ? Icons.visibility : Icons.visibility_off,
                  ),
                ),
              ),
              obscureText: _obscurePassword,
              textInputAction: TextInputAction.done,
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
              onPressed: session.isBusy ? null : () => _submit(context),
              child: session.isBusy
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2.2),
                    )
                  : Text(_isLogin ? 'Login' : 'Create account'),
            ),
            const SizedBox(height: 12),
          ],
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }
}

class _PatternPainter extends CustomPainter {
  _PatternPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final width = size.width;
    final height = size.height;

    canvas.drawCircle(Offset(width * 0.2, height * 0.2), 120, paint);
    canvas.drawCircle(Offset(width * 0.85, height * 0.3), 90, paint);
    canvas.drawCircle(Offset(width * 0.7, height * 0.8), 140, paint);
    canvas.drawCircle(Offset(width * 0.1, height * 0.75), 100, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

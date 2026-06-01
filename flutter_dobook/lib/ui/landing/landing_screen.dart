import 'package:dobook/app/session.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: constraints.maxHeight - 48,
                    ),
                    child: Column(
                      children: [
                        const SizedBox(height: 24),
                        const _LandingHeader(),
                        const SizedBox(height: 40),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(24),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x0A000000),
                                blurRadius: 24,
                                offset: Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              children: [
                                TextFormField(
                                  controller: _emailCtrl,
                                  keyboardType: TextInputType.emailAddress,
                                  textInputAction: TextInputAction.next,
                                  decoration: const InputDecoration(
                                    labelText: 'Email',
                                    suffixIcon: Icon(
                                      Icons.mail_outline_rounded,
                                      color: Color(0xFFAC313A),
                                    ),
                                  ),
                                  validator: (value) {
                                    if (value == null || value.trim().isEmpty) {
                                      return 'Enter an email';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 24),
                                TextFormField(
                                  controller: _passwordCtrl,
                                  obscureText: true,
                                  textInputAction: TextInputAction.done,
                                  decoration: const InputDecoration(
                                    labelText: 'Password',
                                    suffixIcon: Icon(
                                      Icons.lock_outline_rounded,
                                      color: Color(0xFFAC313A),
                                    ),
                                  ),
                                  validator: (value) {
                                    if (value == null || value.length < 6) {
                                      return 'Minimum 6 characters';
                                    }
                                    return null;
                                  },
                                  onFieldSubmitted: (_) => _submit(context),
                                ),
                                if (session.error != null) ...[
                                  const SizedBox(height: 16),
                                  Align(
                                    alignment: Alignment.centerLeft,
                                    child: Text(
                                      session.error!,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(color: scheme.error),
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 24),
                                _EditorialButton(
                                  label: 'Login',
                                  height: 56,
                                  gradient: const LinearGradient(
                                    colors: [
                                      Color(0xFFBE002B),
                                      Color(0xFFE8193C),
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  textColor: Colors.white,
                                  onTap: session.isBusy
                                      ? null
                                      : () => _submit(context),
                                  child: session.isBusy
                                      ? const SizedBox(
                                          width: 22,
                                          height: 22,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.4,
                                            valueColor:
                                                AlwaysStoppedAnimation<Color>(
                                              Colors.white,
                                            ),
                                          ),
                                        )
                                      : null,
                                ),
                                const SizedBox(height: 16),
                                _EditorialButton(
                                  label: 'Sign Up',
                                  height: 56,
                                  backgroundColor: const Color(0xFFE7E8E9),
                                  textColor: const Color(0xFFBE002B),
                                  onTap: session.isBusy
                                      ? null
                                      : () => _openAuthSheet(
                                            context,
                                            isLogin: false,
                                          ),
                                ),
                                const SizedBox(height: 14),
                                TextButton(
                                  onPressed: session.isBusy
                                      ? null
                                      : () => _showForgotPasswordNotice(
                                            context,
                                          ),
                                  child: Text(
                                    'Forgot password?',
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: const Color(0xFFBE002B),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const Spacer(),
                        const SizedBox(height: 24),
                        const _LandingFooter(),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  void _openAuthSheet(BuildContext context, {required bool isLogin}) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _AuthSheet(initialIsLogin: isLogin),
    );
  }

  Future<void> _submit(BuildContext context) async {
    final session = context.read<AppSession>();
    if (!_formKey.currentState!.validate()) return;

    try {
      await session.login(
        email: _emailCtrl.text,
        password: _passwordCtrl.text,
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }

  void _showForgotPasswordNotice(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Password reset is not available in the app yet.'),
      ),
    );
  }
}

class _LandingHeader extends StatelessWidget {
  const _LandingHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Image.asset(
          'assets/icon/app_icon.png',
          width: 120,
          fit: BoxFit.contain,
        ),
        const SizedBox(height: 16),
        Text(
          'DoBook',
          style: GoogleFonts.manrope(
            fontSize: 32,
            fontWeight: FontWeight.w700,
            color: const Color(0xFFBE002B),
            letterSpacing: -1,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Smart booking for your business',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            color: const Color(0xFF6B7280),
          ),
        ),
      ],
    );
  }
}

class _LandingFooter extends StatelessWidget {
  const _LandingFooter();

  @override
  Widget build(BuildContext context) {
    final style = GoogleFonts.inter(
      fontSize: 12,
      fontWeight: FontWeight.w500,
      color: const Color(0xFF9CA3AF),
    );
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text('🇦🇺', style: TextStyle(fontSize: 14)),
        const SizedBox(width: 6),
        Text('Made in Australia', style: style),
        const SizedBox(width: 8),
        Text('•', style: style),
        const SizedBox(width: 8),
        Text('Version 1.0.0', style: style),
      ],
    );
  }
}

class _EditorialButton extends StatelessWidget {
  const _EditorialButton({
    required this.label,
    required this.height,
    required this.textColor,
    this.onTap,
    this.backgroundColor,
    this.gradient,
    this.child,
  });

  final String label;
  final double height;
  final VoidCallback? onTap;
  final Color textColor;
  final Color? backgroundColor;
  final Gradient? gradient;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final isEnabled = onTap != null;
    return Opacity(
      opacity: isEnabled ? 1 : 0.6,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: backgroundColor,
          gradient: gradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: gradient == null
              ? null
              : const [
                  BoxShadow(
                    color: Color(0x33BE002B),
                    blurRadius: 16,
                    offset: Offset(0, 8),
                  ),
                ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              width: double.infinity,
              height: height,
              child: Center(
                child: child ??
                    Text(
                      label,
                      style: GoogleFonts.manrope(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: textColor,
                      ),
                    ),
              ),
            ),
          ),
        ),
      ),
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
                validator: (value) {
                  if (_isLogin) return null;
                  if (value == null || value.trim().length < 2) {
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
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
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
                  tooltip:
                      _obscurePassword ? 'Show password' : 'Hide password',
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
              validator: (value) {
                if (value == null || value.length < 6) {
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

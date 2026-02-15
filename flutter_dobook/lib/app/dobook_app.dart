import 'package:dobook/app/session.dart';
import 'package:dobook/app/theme.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/ui/dashboard/dashboard_screen.dart';
import 'package:dobook/ui/landing/landing_screen.dart';
import 'package:dobook/ui/splash/splash_screen.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class DobookApp extends StatelessWidget {
  const DobookApp({super.key, required this.repo});

  final DobookRepository repo;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider.value(value: repo),
        ChangeNotifierProvider(create: (_) => AppSession(repo: repo)..init()),
      ],
      child: MaterialApp(
        title: 'DoBook',
        theme: buildDobookTheme(),
        debugShowCheckedModeBanner: false,
        home: const _Home(),
      ),
    );
  }
}

class _Home extends StatefulWidget {
  const _Home();

  @override
  State<_Home> createState() => _HomeState();
}

class _HomeState extends State<_Home> {
  static const _minSplash = Duration(milliseconds: 1100);
  bool _minSplashElapsed = false;

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(_minSplash, () {
      if (!mounted) return;
      setState(() => _minSplashElapsed = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final showSplash = session.isInitializing || !_minSplashElapsed;

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 220),
      child: showSplash
          ? const SplashScreen()
          : (session.business == null
              ? const LandingScreen()
              : const DashboardScreen()),
    );
  }
}

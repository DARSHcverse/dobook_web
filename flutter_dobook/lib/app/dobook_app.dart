import 'package:dobook/app/session.dart';
import 'package:dobook/app/theme.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/ui/dashboard/dashboard_screen.dart';
import 'package:dobook/ui/landing/landing_screen.dart';
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
        home: const _Home(),
      ),
    );
  }
}

class _Home extends StatelessWidget {
  const _Home();

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    if (session.isInitializing) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (session.business == null) return const LandingScreen();
    return const DashboardScreen();
  }
}

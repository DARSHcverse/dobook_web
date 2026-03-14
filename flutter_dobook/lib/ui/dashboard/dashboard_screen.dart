import 'package:dobook/ui/dashboard/bookings/bookings_page.dart';
import 'package:dobook/ui/dashboard/calendar/calendar_page.dart';
import 'package:dobook/ui/dashboard/clients/clients_page.dart';
import 'package:dobook/ui/dashboard/overview/overview_page.dart';
import 'package:dobook/ui/dashboard/staff/staff_page.dart';
import 'package:dobook/ui/dashboard/settings/settings_page.dart';
import 'package:dobook/ui/shared/widgets/fade_indexed_stack.dart';
import 'package:dobook/ui/shared/widgets/floating_nav_bar.dart';
import 'package:flutter/material.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      const OverviewPage(),
      const BookingsPage(),
      const ClientsPage(),
      const StaffPage(),
      const CalendarPage(),
      const SettingsPage(),
    ];

    return Scaffold(
      extendBody: true,
      body: Stack(
        children: [
          FadeIndexedStack(index: _index, children: pages),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: FloatingNavBar(
              currentIndex: _index,
              onTap: (i) => setState(() => _index = i),
              items: const [
                FloatingNavItem(icon: Icons.dashboard_rounded, label: 'Overview'),
                FloatingNavItem(icon: Icons.list_alt, label: 'Bookings'),
                FloatingNavItem(icon: Icons.contacts, label: 'Clients'),
                FloatingNavItem(icon: Icons.people, label: 'Staff'),
                FloatingNavItem(icon: Icons.calendar_month, label: 'Calendar'),
                FloatingNavItem(icon: Icons.settings, label: 'Settings'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

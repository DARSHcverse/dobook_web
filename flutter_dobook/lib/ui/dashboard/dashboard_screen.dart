import 'package:dobook/ui/dashboard/bookings/bookings_page.dart';
import 'package:dobook/ui/dashboard/calendar/calendar_page.dart';
import 'package:dobook/ui/dashboard/clients/clients_page.dart';
import 'package:dobook/ui/dashboard/overview/overview_page.dart';
import 'package:dobook/ui/dashboard/staff/staff_page.dart';
import 'package:dobook/ui/dashboard/settings/settings_page.dart';
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
    final scheme = Theme.of(context).colorScheme;
    final pages = <Widget>[
      const OverviewPage(),
      const BookingsPage(),
      const ClientsPage(),
      const StaffPage(),
      const CalendarPage(),
      const SettingsPage(),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: scheme.outlineVariant)),
        ),
        child: NavigationBar(
          backgroundColor: scheme.surface,
          selectedIndex: _index,
          onDestinationSelected: (i) => setState(() => _index = i),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.dashboard_rounded),
              label: 'Overview',
            ),
            NavigationDestination(
              icon: Icon(Icons.list_alt),
              label: 'Bookings',
            ),
            NavigationDestination(
              icon: Icon(Icons.contacts),
              label: 'Clients',
            ),
            NavigationDestination(
              icon: Icon(Icons.people),
              label: 'Staff',
            ),
            NavigationDestination(
              icon: Icon(Icons.calendar_month),
              label: 'Calendar',
            ),
            NavigationDestination(
              icon: Icon(Icons.settings),
              label: 'Settings',
            ),
          ],
        ),
      ),
    );
  }
}

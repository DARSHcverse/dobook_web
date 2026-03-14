import 'package:dobook/app/theme.dart';
import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.status,
  });

  final String status;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<StatusColors>()!;
    final value = status.toLowerCase();
    Color background;
    Color foreground;
    String label;

    if (value == 'cancelled') {
      background = colors.cancelledBg;
      foreground = colors.cancelledFg;
      label = 'Cancelled';
    } else if (value == 'pending') {
      background = colors.pendingBg;
      foreground = colors.pendingFg;
      label = 'Pending';
    } else if (value == 'completed') {
      background = colors.completedBg;
      foreground = colors.completedFg;
      label = 'Completed';
    } else {
      background = colors.confirmedBg;
      foreground = colors.confirmedFg;
      label = 'Confirmed';
    }

    return PillBadge(
      label: label,
      background: background,
      foreground: foreground,
    );
  }
}

class PillBadge extends StatelessWidget {
  const PillBadge({
    super.key,
    required this.label,
    required this.background,
    required this.foreground,
  });

  final String label;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

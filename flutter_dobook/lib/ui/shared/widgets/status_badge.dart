import 'package:dobook/app/theme.dart';
import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<StatusColors>();
    final scheme = Theme.of(context).colorScheme;
    final resolved = _resolve(colors, scheme);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: resolved.background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        resolved.label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: resolved.foreground,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }

  StatusColorsResolved _resolve(
    StatusColors? colors,
    ColorScheme scheme,
  ) {
    final value = status.trim().toLowerCase();
    if (value == 'cancelled') {
      return StatusColorsResolved(
        label: 'Cancelled',
        background: colors?.cancelledBg ?? scheme.errorContainer,
        foreground: colors?.cancelledFg ?? scheme.error,
      );
    }
    if (value == 'completed') {
      return StatusColorsResolved(
        label: 'Completed',
        background: colors?.completedBg ?? scheme.surfaceContainerHighest,
        foreground: colors?.completedFg ?? scheme.onSurfaceVariant,
      );
    }
    if (value == 'pending') {
      return StatusColorsResolved(
        label: 'Pending',
        background: colors?.pendingBg ?? scheme.tertiaryContainer,
        foreground: colors?.pendingFg ?? scheme.tertiary,
      );
    }
    return StatusColorsResolved(
      label: 'Confirmed',
      background: colors?.confirmedBg ?? scheme.secondaryContainer,
      foreground: colors?.confirmedFg ?? scheme.secondary,
    );
  }

  static Color accentColor(BuildContext context, String status) {
    final colors = Theme.of(context).extension<StatusColors>();
    final scheme = Theme.of(context).colorScheme;
    final value = status.trim().toLowerCase();
    if (value == 'cancelled') return colors?.cancelledFg ?? scheme.error;
    if (value == 'completed') return colors?.completedFg ?? scheme.onSurfaceVariant;
    if (value == 'pending') return colors?.pendingFg ?? scheme.tertiary;
    return colors?.confirmedFg ?? scheme.secondary;
  }
}

class StatusColorsResolved {
  const StatusColorsResolved({
    required this.label,
    required this.background,
    required this.foreground,
  });

  final String label;
  final Color background;
  final Color foreground;
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
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: foreground,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

import 'package:dobook/app/theme.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<StatusColors>();
    final resolved = _resolve(colors);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: resolved.background,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        resolved.label.toUpperCase(),
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
          color: resolved.foreground,
        ),
      ),
    );
  }

  StatusColorsResolved _resolve(StatusColors? colors) {
    final value = status.trim().toLowerCase();
    if (value == 'cancelled') {
      return StatusColorsResolved(
        label: 'Cancelled',
        background: colors?.cancelledBg ??
            const Color(0xFFFFDAD6).withValues(alpha: 0.5),
        foreground: colors?.cancelledFg ?? const Color(0xFF93000A),
      );
    }
    if (value == 'completed') {
      return StatusColorsResolved(
        label: 'Completed',
        background: colors?.completedBg ?? const Color(0xFFE7E8E9),
        foreground: colors?.completedFg ?? const Color(0xFF5D3F3F),
      );
    }
    if (value == 'pending') {
      return StatusColorsResolved(
        label: 'Pending',
        background: colors?.pendingBg ?? const Color(0xFFFFF3CD),
        foreground: colors?.pendingFg ?? const Color(0xFF856404),
      );
    }
    return StatusColorsResolved(
      label: 'Confirmed',
      background: colors?.confirmedBg ??
          const Color(0xFF91F2F4).withValues(alpha: 0.3),
      foreground: colors?.confirmedFg ?? const Color(0xFF004F51),
    );
  }

  static Color accentColor(BuildContext context, String status) {
    final value = status.trim().toLowerCase();
    if (value == 'confirmed') return const Color(0xFF008486);
    if (value == 'cancelled') return const Color(0xFFBA1A1A);
    return const Color(0xFF94A3B8);
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
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label.toUpperCase(),
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
          color: foreground,
        ),
      ),
    );
  }
}

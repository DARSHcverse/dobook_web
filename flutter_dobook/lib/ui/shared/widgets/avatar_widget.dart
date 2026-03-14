import 'package:dobook/app/theme.dart';
import 'package:flutter/material.dart';

class AvatarWidget extends StatelessWidget {
  const AvatarWidget({
    super.key,
    required this.name,
    this.size = 44,
    this.textStyle,
  });

  final String name;
  final double size;
  final TextStyle? textStyle;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();
    final initials = _initials(name);
    final colors = brand?.avatarPalette ?? [scheme.primary];
    final colorIndex = _hashIndex(name, colors.length);
    final background = colors[colorIndex];

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: background,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withValues(alpha: 0.12),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: (textStyle ?? Theme.of(context).textTheme.titleMedium)?.copyWith(
              color: scheme.onPrimary,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }

  String _initials(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return '?';
    final parts = trimmed.split(RegExp(r'\s+'));
    if (parts.length == 1) {
      return parts.first.substring(0, 1).toUpperCase();
    }
    final first = parts.first.isNotEmpty ? parts.first[0] : '';
    final last = parts.last.isNotEmpty ? parts.last[0] : '';
    final joined = (first + last).trim();
    return joined.isEmpty ? '?' : joined.toUpperCase();
  }

  int _hashIndex(String value, int max) {
    if (max <= 0) return 0;
    var hash = 0;
    for (final rune in value.runes) {
      hash = (hash + rune) % max;
    }
    return hash.abs() % max;
  }
}

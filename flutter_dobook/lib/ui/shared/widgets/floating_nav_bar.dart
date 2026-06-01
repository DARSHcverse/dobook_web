import 'dart:ui' show ImageFilter;

import 'package:dobook/app/theme.dart';
import 'package:flutter/material.dart';

class FloatingNavBar extends StatelessWidget {
  const FloatingNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<FloatingNavItem> items;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();
    final isLight = Theme.of(context).brightness == Brightness.light;
    final selectedColor = brand?.brandRed ?? scheme.primary;
    final bottomInset = MediaQuery.of(context).padding.bottom;

    final tintColor = isLight
        ? Colors.white.withValues(alpha: 0.85)
        : const Color(0xFF1C1C1E).withValues(alpha: 0.85);
    final borderColor = isLight
        ? Colors.white.withValues(alpha: 0.5)
        : Colors.white.withValues(alpha: 0.12);

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 24 + bottomInset * 0.25),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(28),
              color: tintColor,
              border: Border.all(color: borderColor, width: 1),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.12),
                  blurRadius: 32,
                  offset: const Offset(0, 8),
                ),
                BoxShadow(
                  color: const Color(0xFFE8193C).withValues(alpha: 0.08),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
            child: Row(
              children: List.generate(items.length, (index) {
                final item = items[index];
                final isSelected = index == currentIndex;
                return Expanded(
                  child: _NavTab(
                    item: item,
                    isSelected: isSelected,
                    selectedColor: selectedColor,
                    onTap: () => onTap(index),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavTab extends StatelessWidget {
  const _NavTab({
    required this.item,
    required this.isSelected,
    required this.selectedColor,
    required this.onTap,
  });

  final FloatingNavItem item;
  final bool isSelected;
  final Color selectedColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const inactiveColor = Color(0xFF9CA3AF);
    final iconColor = isSelected ? selectedColor : inactiveColor;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(item.icon, color: iconColor, size: 24),
              AnimatedSize(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOut,
                child: isSelected
                    ? Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          item.label.toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                            color: selectedColor,
                          ),
                        ),
                      )
                    : const SizedBox(height: 0, width: 0),
              ),
              const SizedBox(height: 4),
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOut,
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isSelected ? selectedColor : Colors.transparent,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class FloatingNavItem {
  const FloatingNavItem({required this.icon, required this.label});

  final IconData icon;
  final String label;
}

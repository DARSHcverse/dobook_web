import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

const _dobookRed = Color(0xFFE8193C);
const _dobookRedDark = Color(0xFFB01029);

ThemeData buildDobookTheme({Brightness brightness = Brightness.light}) {
  final scheme = _buildScheme(brightness);
  final brand = _buildBrandColors(brightness, scheme);
  final baseTextTheme =
      GoogleFonts.interTextTheme(ThemeData(brightness: brightness).textTheme);
  final textTheme = baseTextTheme.copyWith(
    displaySmall: baseTextTheme.displaySmall?.copyWith(
      fontWeight: FontWeight.w800,
      letterSpacing: -0.6,
    ),
    headlineLarge: baseTextTheme.headlineLarge?.copyWith(
      fontWeight: FontWeight.w800,
      letterSpacing: -0.4,
    ),
    headlineSmall: baseTextTheme.headlineSmall?.copyWith(
      fontWeight: FontWeight.w700,
      letterSpacing: -0.2,
    ),
    titleLarge: baseTextTheme.titleLarge?.copyWith(
      fontWeight: FontWeight.w700,
      letterSpacing: -0.1,
    ),
    titleMedium: baseTextTheme.titleMedium?.copyWith(
      fontWeight: FontWeight.w600,
    ),
    bodyLarge: baseTextTheme.bodyLarge?.copyWith(
      fontSize: 16,
    ),
    bodyMedium: baseTextTheme.bodyMedium?.copyWith(
      fontSize: 14,
    ),
    bodySmall: baseTextTheme.bodySmall?.copyWith(
      fontSize: 12,
    ),
    labelLarge: baseTextTheme.labelLarge?.copyWith(
      fontWeight: FontWeight.w600,
      letterSpacing: 0.2,
    ),
  );
  final appBarForeground =
      brightness == Brightness.light ? scheme.onSurface : scheme.primary;

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    textTheme: textTheme,
    scaffoldBackgroundColor:
        brightness == Brightness.light ? const Color(0xFFF8F9FA) : scheme.surface,
    appBarTheme: AppBarTheme(
      backgroundColor:
          brightness == Brightness.light ? Colors.white : scheme.surface,
      foregroundColor: appBarForeground,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
      titleTextStyle: textTheme.titleLarge?.copyWith(
        color: appBarForeground,
      ),
      iconTheme: IconThemeData(color: appBarForeground),
      actionsIconTheme: IconThemeData(color: appBarForeground),
      shape: Border(bottom: BorderSide(color: scheme.outlineVariant)),
    ),
    cardTheme: CardThemeData(
      color: scheme.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      shadowColor: brand.cardShadow,
    ),
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    ),
    dividerTheme: DividerThemeData(
      color: scheme.outlineVariant,
      thickness: 1,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: scheme.inverseSurface,
      contentTextStyle: TextStyle(color: scheme.onInverseSurface),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: scheme.surfaceContainerLowest,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: scheme.primary, width: 1.4),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: scheme.error, width: 1.2),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: scheme.error, width: 1.4),
      ),
      labelStyle: TextStyle(color: scheme.onSurfaceVariant),
      floatingLabelStyle: TextStyle(color: scheme.primary),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: scheme.primary,
        foregroundColor: scheme.onPrimary,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: scheme.primary,
      foregroundColor: scheme.onPrimary,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: scheme.primary,
        side: BorderSide(color: scheme.primary),
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: scheme.primary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: scheme.surface,
      indicatorColor: scheme.primary.withValues(alpha: 0.12),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final color = states.contains(WidgetState.selected)
            ? scheme.primary
            : scheme.onSurfaceVariant;
        return textTheme.labelSmall?.copyWith(color: color);
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final color = states.contains(WidgetState.selected)
            ? scheme.primary
            : scheme.onSurfaceVariant;
        return IconThemeData(color: color);
      }),
    ),
    chipTheme: ChipThemeData(
      selectedColor: scheme.primaryContainer,
      labelStyle: textTheme.labelLarge,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: scheme.primary,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: scheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      titleTextStyle: textTheme.titleMedium,
      contentTextStyle: textTheme.bodyMedium,
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: scheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      showDragHandle: true,
    ),
    extensions: [
      const StatusColors(
        confirmedBg: Color(0xFFE8F5E9),
        confirmedFg: Color(0xFF2E7D32),
        cancelledBg: Color(0xFFFFEBEE),
        cancelledFg: Color(0xFFC62828),
        pendingBg: Color(0xFFFFF8E1),
        pendingFg: Color(0xFFF57F17),
        completedBg: Color(0xFFF5F5F5),
        completedFg: Color(0xFF616161),
      ),
      brand,
    ],
  );
}

ColorScheme _buildScheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  final base = ColorScheme.fromSeed(
    seedColor: _dobookRed,
    brightness: brightness,
  );
  return base.copyWith(
    primary: _dobookRed,
    onPrimary: Colors.white,
    secondary: const Color(0xFF1FA971),
    onSecondary: Colors.white,
    tertiary: const Color(0xFF2563EB),
    onTertiary: Colors.white,
    error: const Color(0xFFC62828),
    onError: Colors.white,
    surface: isDark ? const Color(0xFF0F1115) : Colors.white,
    onSurface: isDark ? const Color(0xFFF9FAFB) : const Color(0xFF1A1A2E),
    surfaceContainerHighest:
        isDark ? const Color(0xFF1B1F27) : const Color(0xFFF3F4F6),
    surfaceContainerLow:
        isDark ? const Color(0xFF151922) : const Color(0xFFF8F9FA),
    surfaceContainerLowest:
        isDark ? const Color(0xFF0F1115) : Colors.white,
    onSurfaceVariant:
        isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
    outline: isDark ? const Color(0xFF2D3340) : const Color(0xFFE5E7EB),
    outlineVariant:
        isDark ? const Color(0xFF2D3340) : const Color(0xFFE5E7EB),
    shadow: Colors.black,
    inverseSurface:
        isDark ? const Color(0xFFF9FAFB) : const Color(0xFF111827),
    onInverseSurface: isDark ? const Color(0xFF111827) : Colors.white,
    inversePrimary:
        isDark ? const Color(0xFFFF5A6E) : const Color(0xFFFF5A6E),
    primaryContainer:
        isDark ? const Color(0xFF3B0A18) : const Color(0xFFFFE3E7),
    onPrimaryContainer:
        isDark ? const Color(0xFFFFD1D9) : const Color(0xFF680018),
    secondaryContainer:
        isDark ? const Color(0xFF0E2F22) : const Color(0xFFDFF7ED),
    onSecondaryContainer:
        isDark ? const Color(0xFFB7F5D5) : const Color(0xFF0B3D26),
    tertiaryContainer:
        isDark ? const Color(0xFF132447) : const Color(0xFFE0EAFF),
    onTertiaryContainer:
        isDark ? const Color(0xFFC7D8FF) : const Color(0xFF0E2A66),
    errorContainer:
        isDark ? const Color(0xFF3A1212) : const Color(0xFFFFE5E5),
    onErrorContainer:
        isDark ? const Color(0xFFFFDADA) : const Color(0xFF7A1111),
  );
}

BrandColors _buildBrandColors(Brightness brightness, ColorScheme scheme) {
  final isDark = brightness == Brightness.dark;
  return BrandColors(
    brandRed: _dobookRed,
    brandRedDark: _dobookRedDark,
    headerGradientStart: _dobookRed,
    headerGradientEnd: _dobookRedDark,
    cardShadow: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
    navShadow: Colors.black.withValues(alpha: isDark ? 0.45 : 0.18),
    patternColor: _dobookRed.withValues(alpha: isDark ? 0.12 : 0.08),
    avatarPalette: const [
      Color(0xFFFF6B6B),
      Color(0xFF4ECDC4),
      Color(0xFF45B7D1),
      Color(0xFF96CEB4),
      Color(0xFFDDA0DD),
      Color(0xFFF7DC6F),
    ],
    statIconRed: scheme.primary,
    statIconBlue: scheme.tertiary,
    statIconGreen: scheme.secondary,
    iconTileBg: scheme.surfaceContainerHighest,
  );
}

@immutable
class StatusColors extends ThemeExtension<StatusColors> {
  const StatusColors({
    required this.confirmedBg,
    required this.confirmedFg,
    required this.cancelledBg,
    required this.cancelledFg,
    required this.pendingBg,
    required this.pendingFg,
    required this.completedBg,
    required this.completedFg,
  });

  final Color confirmedBg;
  final Color confirmedFg;
  final Color cancelledBg;
  final Color cancelledFg;
  final Color pendingBg;
  final Color pendingFg;
  final Color completedBg;
  final Color completedFg;

  @override
  StatusColors copyWith({
    Color? confirmedBg,
    Color? confirmedFg,
    Color? cancelledBg,
    Color? cancelledFg,
    Color? pendingBg,
    Color? pendingFg,
    Color? completedBg,
    Color? completedFg,
  }) {
    return StatusColors(
      confirmedBg: confirmedBg ?? this.confirmedBg,
      confirmedFg: confirmedFg ?? this.confirmedFg,
      cancelledBg: cancelledBg ?? this.cancelledBg,
      cancelledFg: cancelledFg ?? this.cancelledFg,
      pendingBg: pendingBg ?? this.pendingBg,
      pendingFg: pendingFg ?? this.pendingFg,
      completedBg: completedBg ?? this.completedBg,
      completedFg: completedFg ?? this.completedFg,
    );
  }

  @override
  StatusColors lerp(ThemeExtension<StatusColors>? other, double t) {
    if (other is! StatusColors) return this;
    return StatusColors(
      confirmedBg: Color.lerp(confirmedBg, other.confirmedBg, t)!,
      confirmedFg: Color.lerp(confirmedFg, other.confirmedFg, t)!,
      cancelledBg: Color.lerp(cancelledBg, other.cancelledBg, t)!,
      cancelledFg: Color.lerp(cancelledFg, other.cancelledFg, t)!,
      pendingBg: Color.lerp(pendingBg, other.pendingBg, t)!,
      pendingFg: Color.lerp(pendingFg, other.pendingFg, t)!,
      completedBg: Color.lerp(completedBg, other.completedBg, t)!,
      completedFg: Color.lerp(completedFg, other.completedFg, t)!,
    );
  }
}

@immutable
class BrandColors extends ThemeExtension<BrandColors> {
  const BrandColors({
    required this.brandRed,
    required this.brandRedDark,
    required this.headerGradientStart,
    required this.headerGradientEnd,
    required this.cardShadow,
    required this.navShadow,
    required this.patternColor,
    required this.avatarPalette,
    required this.statIconRed,
    required this.statIconBlue,
    required this.statIconGreen,
    required this.iconTileBg,
  });

  static const BrandColors lightDefaults = BrandColors(
    brandRed: _dobookRed,
    brandRedDark: _dobookRedDark,
    headerGradientStart: _dobookRed,
    headerGradientEnd: _dobookRedDark,
    cardShadow: Color(0x14000000),
    navShadow: Color(0x2D000000),
    patternColor: Color(0x14E8193C),
    avatarPalette: [
      Color(0xFFFF6B6B),
      Color(0xFF4ECDC4),
      Color(0xFF45B7D1),
      Color(0xFF96CEB4),
      Color(0xFFDDA0DD),
      Color(0xFFF7DC6F),
    ],
    statIconRed: _dobookRed,
    statIconBlue: Color(0xFF3B82F6),
    statIconGreen: Color(0xFF22C55E),
    iconTileBg: Color(0xFFF3F4F6),
  );

  final Color brandRed;
  final Color brandRedDark;
  final Color headerGradientStart;
  final Color headerGradientEnd;
  final Color cardShadow;
  final Color navShadow;
  final Color patternColor;
  final List<Color> avatarPalette;
  final Color statIconRed;
  final Color statIconBlue;
  final Color statIconGreen;
  final Color iconTileBg;

  @override
  BrandColors copyWith({
    Color? brandRed,
    Color? brandRedDark,
    Color? headerGradientStart,
    Color? headerGradientEnd,
    Color? cardShadow,
    Color? navShadow,
    Color? patternColor,
    List<Color>? avatarPalette,
    Color? statIconRed,
    Color? statIconBlue,
    Color? statIconGreen,
    Color? iconTileBg,
  }) {
    return BrandColors(
      brandRed: brandRed ?? this.brandRed,
      brandRedDark: brandRedDark ?? this.brandRedDark,
      headerGradientStart: headerGradientStart ?? this.headerGradientStart,
      headerGradientEnd: headerGradientEnd ?? this.headerGradientEnd,
      cardShadow: cardShadow ?? this.cardShadow,
      navShadow: navShadow ?? this.navShadow,
      patternColor: patternColor ?? this.patternColor,
      avatarPalette: avatarPalette ?? this.avatarPalette,
      statIconRed: statIconRed ?? this.statIconRed,
      statIconBlue: statIconBlue ?? this.statIconBlue,
      statIconGreen: statIconGreen ?? this.statIconGreen,
      iconTileBg: iconTileBg ?? this.iconTileBg,
    );
  }

  @override
  BrandColors lerp(ThemeExtension<BrandColors>? other, double t) {
    if (other is! BrandColors) return this;
    final palette = avatarPalette.length == other.avatarPalette.length
        ? List<Color>.generate(
            avatarPalette.length,
            (i) => Color.lerp(avatarPalette[i], other.avatarPalette[i], t)!,
          )
        : avatarPalette;
    return BrandColors(
      brandRed: Color.lerp(brandRed, other.brandRed, t)!,
      brandRedDark: Color.lerp(brandRedDark, other.brandRedDark, t)!,
      headerGradientStart:
          Color.lerp(headerGradientStart, other.headerGradientStart, t)!,
      headerGradientEnd:
          Color.lerp(headerGradientEnd, other.headerGradientEnd, t)!,
      cardShadow: Color.lerp(cardShadow, other.cardShadow, t)!,
      navShadow: Color.lerp(navShadow, other.navShadow, t)!,
      patternColor: Color.lerp(patternColor, other.patternColor, t)!,
      avatarPalette: palette,
      statIconRed: Color.lerp(statIconRed, other.statIconRed, t)!,
      statIconBlue: Color.lerp(statIconBlue, other.statIconBlue, t)!,
      statIconGreen: Color.lerp(statIconGreen, other.statIconGreen, t)!,
      iconTileBg: Color.lerp(iconTileBg, other.iconTileBg, t)!,
    );
  }
}

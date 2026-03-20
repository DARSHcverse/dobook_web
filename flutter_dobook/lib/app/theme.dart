import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

const _primary = Color(0xFFBE002B);
const _primaryContainer = Color(0xFFE8193C);
const _background = Color(0xFFF8F9FA);
const _surface = Color(0xFFF8F9FA);
const _surfaceLowest = Color(0xFFFFFFFF);
const _surfaceLow = Color(0xFFF3F4F5);
const _surfaceContainer = Color(0xFFEDEEEF);
const _surfaceHigh = Color(0xFFE7E8E9);
const _onSurface = Color(0xFF191C1D);
const _onSurfaceVariant = Color(0xFF5D3F3F);
const _outlineVariant = Color(0xFFE6BCBB);
const _error = Color(0xFFBA1A1A);
const _tertiaryFixed = Color(0xFF91F2F4);
const _onTertiaryFixedVariant = Color(0xFF004F51);
const _labelColor = Color(0xFFAC313A);
const _navUnselected = Color(0xFF94A3B8);
const _cardShadow = Color(0x0A191C1D);
const _buttonShadow = Color(0x33BE002B);

const _avatarPalette = [
  Color(0xFF6366F1),
  Color(0xFF0891B2),
  Color(0xFF059669),
  Color(0xFFD97706),
  Color(0xFFDC2626),
  Color(0xFF7C3AED),
  Color(0xFFDB2777),
];

ThemeData buildDobookTheme({Brightness brightness = Brightness.light}) {
  final scheme = _buildScheme(brightness);
  final brand = _buildBrandColors(brightness, scheme);
  final textTheme = _buildTextTheme(brightness);
  final isLight = brightness == Brightness.light;
  final appBarForeground = isLight ? _onSurface : scheme.onSurface;
  final appBarBackground = (isLight ? _background : scheme.surface)
      .withValues(alpha: 0.8);

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    textTheme: textTheme,
    scaffoldBackgroundColor: isLight ? _background : scheme.surface,
    appBarTheme: AppBarTheme(
      backgroundColor: appBarBackground,
      foregroundColor: appBarForeground,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
      titleTextStyle: GoogleFonts.manrope(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: appBarForeground,
      ),
      iconTheme: IconThemeData(color: appBarForeground),
      actionsIconTheme: IconThemeData(color: appBarForeground),
    ),
    cardTheme: CardThemeData(
      color: isLight ? _surfaceLowest : scheme.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      shadowColor: _cardShadow,
    ),
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    ),
    dividerTheme: const DividerThemeData(
      color: _outlineVariant,
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
      fillColor: isLight ? _surfaceLow : scheme.surfaceContainerLow,
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: UnderlineInputBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      enabledBorder: UnderlineInputBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      focusedBorder: const UnderlineInputBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
        borderSide: BorderSide(color: _primary, width: 2),
      ),
      errorBorder: const UnderlineInputBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
        borderSide: BorderSide(color: _error, width: 1.4),
      ),
      focusedErrorBorder: const UnderlineInputBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
        borderSide: BorderSide(color: _error, width: 2),
      ),
      labelStyle: GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.5,
        color: _labelColor,
      ),
      floatingLabelStyle: GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.5,
        color: _labelColor,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: _primary,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        shadowColor: _buttonShadow,
        elevation: 2,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _primary,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        shadowColor: _buttonShadow,
        elevation: 2,
      ),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: _primary,
      foregroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: _primary,
        side: const BorderSide(color: _primary, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: _primary,
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: appBarBackground,
      indicatorColor: _primary.withValues(alpha: 0.12),
      elevation: 0,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final color = states.contains(WidgetState.selected)
            ? _primary
            : _navUnselected;
        return GoogleFonts.inter(
          fontSize: 10,
          fontWeight:
              states.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
          letterSpacing: 1.2,
          color: color,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final color = states.contains(WidgetState.selected)
            ? _primary
            : _navUnselected;
        return IconThemeData(color: color);
      }),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: appBarBackground,
      selectedItemColor: _primary,
      unselectedItemColor: _navUnselected,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
      selectedLabelStyle: GoogleFonts.inter(
        fontSize: 10,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
      ),
      unselectedLabelStyle: GoogleFonts.inter(
        fontSize: 10,
        fontWeight: FontWeight.w500,
        letterSpacing: 1.2,
      ),
      selectedIconTheme: const IconThemeData(color: _primary),
      unselectedIconTheme: const IconThemeData(color: _navUnselected),
    ),
    chipTheme: ChipThemeData(
      selectedColor: _primaryContainer,
      labelStyle: textTheme.labelLarge,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: _primary,
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
      StatusColors(
        confirmedBg: _tertiaryFixed.withValues(alpha: 0.3),
        confirmedFg: _onTertiaryFixedVariant,
        cancelledBg: const Color(0xFFFFDAD6).withValues(alpha: 0.5),
        cancelledFg: const Color(0xFF93000A),
        pendingBg: const Color(0xFFFFF3CD),
        pendingFg: const Color(0xFF856404),
        completedBg: _surfaceHigh,
        completedFg: _onSurfaceVariant,
      ),
      brand,
    ],
  );
}

TextTheme _buildTextTheme(Brightness brightness) {
  final base = ThemeData(brightness: brightness).textTheme;
  final inter = GoogleFonts.interTextTheme(base);

  TextStyle? manrope(TextStyle? style, FontWeight weight) {
    if (style == null) return null;
    return GoogleFonts.manrope(textStyle: style).copyWith(fontWeight: weight);
  }

  return inter.copyWith(
    displayLarge: manrope(inter.displayLarge, FontWeight.w800),
    displayMedium: manrope(inter.displayMedium, FontWeight.w800),
    displaySmall: manrope(inter.displaySmall, FontWeight.w800),
    headlineLarge: manrope(inter.headlineLarge, FontWeight.w800),
    headlineMedium: manrope(inter.headlineMedium, FontWeight.w700),
    headlineSmall: manrope(inter.headlineSmall, FontWeight.w700),
    titleLarge: manrope(inter.titleLarge, FontWeight.w700),
    titleMedium: manrope(inter.titleMedium, FontWeight.w700),
    titleSmall: manrope(inter.titleSmall, FontWeight.w700),
    bodyLarge: inter.bodyLarge?.copyWith(fontWeight: FontWeight.w400),
    bodyMedium: inter.bodyMedium?.copyWith(fontWeight: FontWeight.w400),
    bodySmall: inter.bodySmall?.copyWith(fontWeight: FontWeight.w400),
    labelLarge: inter.labelLarge?.copyWith(fontWeight: FontWeight.w600),
    labelMedium: inter.labelMedium?.copyWith(fontWeight: FontWeight.w600),
    labelSmall: inter.labelSmall?.copyWith(fontWeight: FontWeight.w600),
  );
}

ColorScheme _buildScheme(Brightness brightness) {
  if (brightness == Brightness.dark) {
    final base = ColorScheme.fromSeed(
      seedColor: _primary,
      brightness: Brightness.dark,
    );
    return base.copyWith(
      primary: _primary,
      onPrimary: Colors.white,
      primaryContainer: const Color(0xFF3B0A18),
      onPrimaryContainer: const Color(0xFFFFD1D9),
      error: _error,
      onError: Colors.white,
      tertiary: _tertiaryFixed,
      onTertiary: _onTertiaryFixedVariant,
      tertiaryFixed: _tertiaryFixed,
      tertiaryFixedDim: _tertiaryFixed,
      onTertiaryFixed: _onTertiaryFixedVariant,
      onTertiaryFixedVariant: _onTertiaryFixedVariant,
      surfaceContainerLowest: base.surface,
      surfaceContainerLow: base.surfaceContainerLow,
      surfaceContainer: base.surfaceContainer,
      surfaceContainerHigh: base.surfaceContainerHigh,
      surfaceContainerHighest: base.surfaceContainerHighest,
    );
  }

  final base = ColorScheme.fromSeed(
    seedColor: _primary,
    brightness: Brightness.light,
  );
  return base.copyWith(
    primary: _primary,
    onPrimary: Colors.white,
    primaryContainer: _primaryContainer,
    onPrimaryContainer: Colors.white,
    secondary: _labelColor,
    onSecondary: Colors.white,
    secondaryContainer: const Color(0xFFF6E6E6),
    onSecondaryContainer: _onSurface,
    tertiary: _tertiaryFixed,
    onTertiary: _onTertiaryFixedVariant,
    tertiaryContainer: _tertiaryFixed,
    onTertiaryContainer: _onTertiaryFixedVariant,
    tertiaryFixed: _tertiaryFixed,
    tertiaryFixedDim: _tertiaryFixed,
    onTertiaryFixed: _onTertiaryFixedVariant,
    onTertiaryFixedVariant: _onTertiaryFixedVariant,
    error: _error,
    onError: Colors.white,
    errorContainer: const Color(0xFFFFDAD6),
    onErrorContainer: const Color(0xFF93000A),
    surface: _surface,
    onSurface: _onSurface,
    onSurfaceVariant: _onSurfaceVariant,
    outline: _outlineVariant,
    outlineVariant: _outlineVariant,
    inverseSurface: _onSurface,
    onInverseSurface: _background,
    inversePrimary: _primaryContainer,
    surfaceTint: _primary,
    surfaceContainerLowest: _surfaceLowest,
    surfaceContainerLow: _surfaceLow,
    surfaceContainer: _surfaceContainer,
    surfaceContainerHigh: _surfaceHigh,
    surfaceContainerHighest: _surfaceHigh,
  );
}

BrandColors _buildBrandColors(Brightness brightness, ColorScheme scheme) {
  final isDark = brightness == Brightness.dark;
  return BrandColors(
    brandRed: _primary,
    brandRedDark: _primaryContainer,
    headerGradientStart: _primary,
    headerGradientEnd: _primaryContainer,
    cardShadow: isDark ? Colors.black.withValues(alpha: 0.4) : _cardShadow,
    navShadow: isDark ? Colors.black.withValues(alpha: 0.45) : _cardShadow,
    patternColor: _primary.withValues(alpha: isDark ? 0.16 : 0.08),
    avatarPalette: _avatarPalette,
    statIconRed: _primary,
    statIconBlue: const Color(0xFF6366F1),
    statIconGreen: const Color(0xFF059669),
    iconTileBg: isDark ? scheme.surfaceContainerHigh : _surfaceLow,
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
    brandRed: _primary,
    brandRedDark: _primaryContainer,
    headerGradientStart: _primary,
    headerGradientEnd: _primaryContainer,
    cardShadow: _cardShadow,
    navShadow: _cardShadow,
    patternColor: Color(0x14BE002B),
    avatarPalette: _avatarPalette,
    statIconRed: _primary,
    statIconBlue: Color(0xFF6366F1),
    statIconGreen: Color(0xFF059669),
    iconTileBg: _surfaceLow,
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

import 'dart:convert';

import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/business.dart';
import 'package:dobook/ui/shared/widgets/editorial_action_button.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

class BusinessInformationScreen extends StatefulWidget {
  const BusinessInformationScreen({super.key});

  @override
  State<BusinessInformationScreen> createState() =>
      _BusinessInformationScreenState();
}

class _BusinessInformationScreenState extends State<BusinessInformationScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _businessNameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _abnCtrl;
  String _industry = '';
  bool _busy = false;
  bool _initialized = false;

  static const _industries = [
    'Events',
    'Photography',
    'Hospitality',
    'Retail',
    'Wellness',
    'Other',
  ];

  @override
  void initState() {
    super.initState();
    _businessNameCtrl = TextEditingController();
    _phoneCtrl = TextEditingController();
    _addressCtrl = TextEditingController();
    _abnCtrl = TextEditingController();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    final business = context.read<AppSession>().business;
    if (business == null) return;
    _businessNameCtrl.text = business.businessName;
    _phoneCtrl.text = business.phone ?? '';
    _addressCtrl.text = business.businessAddress;
    _abnCtrl.text = business.abn;
    _industry = business.industry.trim();
    _initialized = true;
  }

  @override
  void dispose() {
    _businessNameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _abnCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final business = session.business;

    return Scaffold(
      appBar: AppBar(title: const Text('Business Info')),
      body: SafeArea(child: _buildBody(context, business, session)),
    );
  }

  Widget _buildBody(
    BuildContext context,
    Business? business,
    AppSession session,
  ) {
    if (session.isInitializing) {
      return const LoadingShimmerList();
    }

    if (business == null) {
      return _errorState(
        context,
        'Business profile unavailable. Please try again.',
        onRetry: () async {
          await session.refreshBusiness();
          if (mounted) setState(() {});
        },
      );
    }

    final industryOptions = [
      ..._industries,
      if (_industry.isNotEmpty && !_industries.contains(_industry)) _industry,
    ];
    final imageProvider = _logoImageProvider(business.logoUrl);

    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Center(
            child: Column(
              children: [
                GestureDetector(
                  onTap: _busy ? null : () => _pickLogo(context),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      _LogoAvatar(
                        name: business.businessName,
                        imageProvider: imageProvider,
                      ),
                      Positioned(
                        right: 4,
                        bottom: 4,
                        child: Material(
                          color: const Color(0xFFBE002B),
                          shape: const CircleBorder(),
                          child: InkWell(
                            onTap: _busy ? null : () => _pickLogo(context),
                            customBorder: const CircleBorder(),
                            child: const SizedBox(
                              width: 34,
                              height: 34,
                              child: Icon(
                                Icons.edit_rounded,
                                color: Colors.white,
                                size: 18,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                TextButton(
                  onPressed: _busy ? null : () => _pickLogo(context),
                  child: Text(
                    'Update Branding',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.8,
                      color: const Color(0xFFBE002B),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          _FieldBlock(
            label: 'Business Name *',
            child: TextFormField(
              controller: _businessNameCtrl,
              decoration: const InputDecoration(hintText: 'DoBook Studio'),
              validator: (value) {
                if (value == null || value.trim().length < 2) {
                  return 'Required';
                }
                return null;
              },
            ),
          ),
          const SizedBox(height: 24),
          _FieldBlock(
            label: 'Phone',
            child: TextFormField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(hintText: '0412 345 678'),
            ),
          ),
          const SizedBox(height: 24),
          _FieldBlock(
            label: 'Industry',
            child: DropdownButtonFormField<String>(
              initialValue: _industry.isEmpty ? null : _industry,
              decoration: const InputDecoration(hintText: 'Select industry'),
              items: industryOptions
                  .map(
                    (item) => DropdownMenuItem<String>(
                      value: item,
                      child: Text(item),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                setState(() => _industry = value?.trim() ?? '');
              },
            ),
          ),
          const SizedBox(height: 24),
          _FieldBlock(
            label: 'Address',
            child: TextFormField(
              controller: _addressCtrl,
              minLines: 3,
              maxLines: 5,
              decoration: const InputDecoration(hintText: 'Studio address'),
            ),
          ),
          const SizedBox(height: 24),
          _FieldBlock(
            label: 'ABN',
            child: TextFormField(
              controller: _abnCtrl,
              decoration: const InputDecoration(hintText: '51 824 753 556'),
            ),
          ),
          const SizedBox(height: 32),
          EditorialActionButton(
            label: 'Save Changes',
            isLoading: _busy,
            onPressed: _busy ? null : () => _save(context),
          ),
        ],
      ),
    );
  }

  Widget _errorState(
    BuildContext context,
    String message, {
    required Future<void> Function() onRetry,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 40,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 12),
            Text(
              'Unable to load business profile',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }

  ImageProvider? _logoImageProvider(String logoUrl) {
    if (logoUrl.isEmpty) return null;
    if (logoUrl.startsWith('data:')) {
      final parts = logoUrl.split(',');
      if (parts.length == 2) {
        try {
          return MemoryImage(base64Decode(parts[1]));
        } catch (_) {
          return null;
        }
      }
    }
    if (logoUrl.startsWith('http')) {
      return NetworkImage(logoUrl);
    }
    return null;
  }

  Future<void> _pickLogo(BuildContext context) async {
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    final repo = context.read<DobookRepository>();
    final session = context.read<AppSession>();

    try {
      final picker = ImagePicker();
      final xfile = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
      );
      if (xfile == null) return;
      final bytes = await xfile.readAsBytes();
      final mime = _mimeFromPath(xfile.name);

      await repo.uploadLogo(session.token!, bytes: bytes, contentType: mime);
      await session.refreshBusiness();
      if (!mounted) return;
      messenger.showSnackBar(const SnackBar(content: Text('Logo updated')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _mimeFromPath(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  Future<void> _save(BuildContext context) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);

    try {
      final repo = context.read<DobookRepository>();
      final session = context.read<AppSession>();
      final token = session.token!;

      await repo.updateBusinessProfile(token, {
        'business_name': _businessNameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'business_address': _addressCtrl.text.trim(),
        'abn': _abnCtrl.text.trim(),
        if (_industry.trim().isNotEmpty) 'industry': _industry.trim(),
      });

      await session.refreshBusiness();
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Business information saved')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

class _FieldBlock extends StatelessWidget {
  const _FieldBlock({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.8,
            color: const Color(0xFFAC313A),
          ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

class _LogoAvatar extends StatelessWidget {
  const _LogoAvatar({required this.name, this.imageProvider});

  final String name;
  final ImageProvider? imageProvider;

  @override
  Widget build(BuildContext context) {
    final child = imageProvider == null
        ? DecoratedBox(
            decoration: const BoxDecoration(
              color: Color(0xFFE8193C),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                _initials(name),
                style: GoogleFonts.manrope(
                  fontSize: 34,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ),
          )
        : DecoratedBox(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              image: DecorationImage(image: imageProvider!, fit: BoxFit.cover),
            ),
          );

    return Container(
      width: 128,
      height: 128,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFFF3F4F5),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A191C1D),
            blurRadius: 24,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }

  String _initials(String value) {
    final parts = value
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) return 'DB';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/vsp_colors.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/locale_provider.dart';

class PendingApprovalScreen extends StatelessWidget {
  const PendingApprovalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final localeProv = context.watch<LocaleProvider>();
    final authProvider = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: VSPColors.background,
      body: Center(
        child: Container(
          width: 480,
          padding: const EdgeInsets.all(36),
          decoration: BoxDecoration(
            color: VSPColors.surface,
            borderRadius: BorderRadius.circular(VSPRadius.md),
            border: Border.all(color: VSPColors.warning.withValues(alpha: 0.5), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: VSPColors.warning.withValues(alpha: 0.1),
                blurRadius: 30,
                spreadRadius: 5,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: VSPColors.warning.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.hourglass_top_rounded, size: 48, color: VSPColors.warning),
              ),
              const SizedBox(height: 24),
              Text(
                localeProv.translate('pending_title'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: VSPColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                localeProv.translate('pending_sub'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: VSPColors.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: VSPColors.surfaceAlt,
                  borderRadius: BorderRadius.circular(VSPRadius.sm),
                  border: Border.all(color: VSPColors.borderLight),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: VSPColors.accent, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        localeProv.translate('pending_note'),
                        style: const TextStyle(fontSize: 12, color: VSPColors.accent),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              ElevatedButton.icon(
                onPressed: () async {
                  await authProvider.signOut();
                  if (context.mounted) context.go('/login');
                },
                icon: const Icon(Icons.logout, color: Colors.black, size: 18),
                label: Text(localeProv.translate('btn_signout_pending')),
                style: ElevatedButton.styleFrom(
                  backgroundColor: VSPColors.accent,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

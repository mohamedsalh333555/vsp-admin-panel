import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/vsp_colors.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/locale_provider.dart';

class AdminSidebar extends StatelessWidget {
  final String currentRoute;

  const AdminSidebar({super.key, required this.currentRoute});

  @override
  Widget build(BuildContext context) {
    final localeProv = context.watch<LocaleProvider>();
    final authProv = context.watch<AuthProvider>();

    final userEmail = authProv.user?.email ?? 'mohamedsalh333555@gmail.com';
    final roleLabel = authProv.roleLabel == 'Co-Founder' ? localeProv.translate('cofounder') : 'Admin';

    return Container(
      width: 260,
      color: VSPColors.surface,
      child: Column(
        children: [
          // Logo Header
          Container(
            padding: const EdgeInsets.all(20),
            alignment: Alignment.centerLeft,
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: VSPColors.accent,
                    borderRadius: BorderRadius.circular(VSPRadius.sm),
                  ),
                  child: const Icon(Icons.sports_soccer, color: Colors.black, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        localeProv.translate('app_title'),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: VSPColors.textPrimary,
                          letterSpacing: 1.0,
                        ),
                      ),
                      Text(
                        localeProv.translate('app_subtitle'),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: VSPColors.accent,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(color: VSPColors.divider, height: 1),

          // Navigation Links
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
              children: [
                _buildNavItem(context, localeProv.translate('dashboard'), Icons.dashboard_outlined, '/dashboard'),
                _buildNavItem(context, localeProv.translate('owner_audits'), Icons.verified_user_outlined, '/owner-audits'),
                _buildNavItem(context, localeProv.translate('users'), Icons.people_outline, '/users'),
                _buildNavItem(context, localeProv.translate('tournaments'), Icons.emoji_events_outlined, '/tournaments'),
                _buildNavItem(context, localeProv.translate('disputes'), Icons.gavel_outlined, '/disputes'),
                _buildNavItem(context, localeProv.translate('league_1v1'), Icons.flash_on_outlined, '/league-1v1'),
                _buildNavItem(context, localeProv.translate('settings'), Icons.settings_outlined, '/settings'),
              ],
            ),
          ),

          const Divider(color: VSPColors.divider, height: 1),

          // Co-Founder Profile Footer
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: InkWell(
              onTap: () {
                context.read<AuthProvider>().signOut();
                context.go('/login');
              },
              borderRadius: BorderRadius.circular(VSPRadius.sm),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: VSPColors.surfaceAlt,
                  borderRadius: BorderRadius.circular(VSPRadius.sm),
                  border: Border.all(color: VSPColors.glassBorderAccent),
                ),
                child: Row(
                  children: [
                    const CircleAvatar(
                      radius: 18,
                      backgroundColor: VSPColors.accent,
                      child: Icon(Icons.stars, color: Colors.black, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            roleLabel,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: VSPColors.accent),
                          ),
                          Directionality(
                            textDirection: TextDirection.ltr,
                            child: Text(
                              userEmail,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 10, color: VSPColors.textSecondary),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            localeProv.translate('logout'),
                            style: const TextStyle(fontSize: 10, color: VSPColors.error, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.logout, color: VSPColors.textSecondary, size: 16),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem(BuildContext context, String title, IconData icon, String route) {
    final isSelected = currentRoute == route;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: InkWell(
        onTap: () => context.go(route),
        borderRadius: BorderRadius.circular(VSPRadius.sm),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? VSPColors.accentSoft : Colors.transparent,
            borderRadius: BorderRadius.circular(VSPRadius.sm),
            border: isSelected ? Border.all(color: VSPColors.glassBorderAccent, width: 1) : null,
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: isSelected ? VSPColors.accent : VSPColors.textSecondary,
                size: 20,
              ),
              const SizedBox(width: 14),
              Text(
                title,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? VSPColors.accent : VSPColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

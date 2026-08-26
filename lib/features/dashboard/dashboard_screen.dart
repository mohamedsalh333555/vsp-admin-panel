import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/vsp_colors.dart';
import '../../core/services/supabase_admin_service.dart';
import '../../core/providers/locale_provider.dart';
import '../../shared/widgets/admin_header.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final SupabaseAdminService _adminService = SupabaseAdminService();
  bool _isLoading = true;
  Map<String, dynamic> _stats = {};

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _isLoading = true);
    final data = await _adminService.fetchDashboardStats();
    if (mounted) {
      setState(() {
        _stats = data;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final localeProv = context.watch<LocaleProvider>();

    return Scaffold(
      backgroundColor: VSPColors.background,
      body: Column(
        children: [
          AdminHeader(
            title: localeProv.translate('dashboard_title'),
            subtitle: localeProv.translate('dashboard_sub'),
            action: ElevatedButton.icon(
              onPressed: _loadStats,
              icon: const Icon(Icons.refresh, size: 18),
              label: Text(localeProv.translate('refresh_data')),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: VSPColors.accent))
                : LayoutBuilder(
                    builder: (context, constraints) {
                      final width = constraints.maxWidth;
                      int crossAxisCount = 4;
                      if (width < 700) {
                        crossAxisCount = 1;
                      } else if (width < 1100) {
                        crossAxisCount = 2;
                      }

                      return SingleChildScrollView(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            GridView.count(
                              crossAxisCount: crossAxisCount,
                              crossAxisSpacing: 16,
                              mainAxisSpacing: 16,
                              shrinkWrap: true,
                              childAspectRatio: crossAxisCount == 1 ? 2.5 : 1.6,
                              physics: const NeverScrollableScrollPhysics(),
                              children: [
                                _buildKpiCard(
                                  title: localeProv.translate('total_users'),
                                  value: '${_stats['totalUsers'] ?? 0}',
                                  icon: Icons.people_alt_outlined,
                                  color: VSPColors.info,
                                ),
                                _buildKpiCard(
                                  title: localeProv.translate('registered_stadiums'),
                                  value: '${_stats['totalStadiums'] ?? 0}',
                                  icon: Icons.stadium_outlined,
                                  color: VSPColors.accent,
                                ),
                                _buildKpiCard(
                                  title: localeProv.translate('total_bookings'),
                                  value: '${_stats['totalBookings'] ?? 0}',
                                  icon: Icons.confirmation_number_outlined,
                                  color: VSPColors.warning,
                                ),
                                _buildKpiCard(
                                  title: localeProv.translate('league_players'),
                                  value: '${_stats['total1v1Players'] ?? 0}',
                                  icon: Icons.bolt_outlined,
                                  color: VSPColors.success,
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),

                            Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: VSPColors.surface,
                                borderRadius: BorderRadius.circular(VSPRadius.md),
                                border: Border.all(color: VSPColors.glassBorderAccent),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.shield_outlined, color: VSPColors.accent, size: 28),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          localeProv.translate('system_status_title'),
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: VSPColors.textPrimary),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          localeProv.translate('system_status_sub'),
                                          style: const TextStyle(color: VSPColors.textSecondary, fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: VSPColors.surface,
        borderRadius: BorderRadius.circular(VSPRadius.md),
        border: Border.all(color: VSPColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 12, color: VSPColors.textSecondary, fontWeight: FontWeight.w600),
              ),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(VSPRadius.sm),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
            ],
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: VSPColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/vsp_colors.dart';
import '../../core/services/supabase_admin_service.dart';
import '../../core/providers/locale_provider.dart';
import '../../shared/widgets/admin_header.dart';

class DisputesScreen extends StatefulWidget {
  const DisputesScreen({super.key});

  @override
  State<DisputesScreen> createState() => _DisputesScreenState();
}

class _DisputesScreenState extends State<DisputesScreen> {
  final SupabaseAdminService _adminService = SupabaseAdminService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _disputes = [];

  @override
  void initState() {
    super.initState();
    _loadDisputes();
  }

  Future<void> _loadDisputes() async {
    setState(() => _isLoading = true);
    final data = await _adminService.fetchDisputedBookings();
    if (mounted) {
      setState(() {
        _disputes = data;
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
            title: localeProv.translate('disputes_title'),
            subtitle: localeProv.translate('disputes_sub'),
            action: ElevatedButton.icon(
              onPressed: _loadDisputes,
              icon: const Icon(Icons.refresh, size: 18),
              label: Text(localeProv.translate('refresh_disputes')),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: VSPColors.accent))
                : _disputes.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.check_circle_outline, color: VSPColors.success, size: 48),
                            const SizedBox(height: 12),
                            Text(localeProv.translate('no_disputes'), style: const TextStyle(color: VSPColors.textSecondary, fontSize: 14)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(20),
                        itemCount: _disputes.length,
                        itemBuilder: (context, index) {
                          final dispute = _disputes[index];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: VSPColors.surface,
                              borderRadius: BorderRadius.circular(VSPRadius.md),
                              border: Border.all(color: VSPColors.borderLight),
                            ),
                            child: Wrap(
                              spacing: 12,
                              runSpacing: 12,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              alignment: WrapAlignment.spaceBetween,
                              children: [
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.gavel, color: VSPColors.warning, size: 28),
                                    const SizedBox(width: 16),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Booking ID: #${dispute['id'].toString().substring(0, dispute['id'].toString().length > 8 ? 8 : dispute['id'].toString().length)}',
                                          style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Status: ${dispute['match_result_status'] ?? 'Disputed'} | Amount: ${dispute['total_price'] ?? 0} EGP',
                                          style: const TextStyle(color: VSPColors.textSecondary, fontSize: 13),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                ElevatedButton(
                                  onPressed: () async {
                                    final ok = await _adminService.resolveDispute(dispute['id'].toString(), 'Admin override result');
                                    if (mounted) {
                                      if (ok) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('🎉 تم تسوية النزاع بنجاح!'), backgroundColor: Colors.green),
                                        );
                                        _loadDisputes();
                                      } else {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('❌ تعذر تسوية النزاع.'), backgroundColor: VSPColors.error),
                                        );
                                      }
                                    }
                                  },
                                  style: ElevatedButton.styleFrom(backgroundColor: VSPColors.accent),
                                  child: Text(localeProv.translate('resolve_dispute')),
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
}

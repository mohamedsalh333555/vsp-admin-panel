import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/vsp_colors.dart';
import '../../core/services/supabase_admin_service.dart';
import '../../core/providers/locale_provider.dart';
import '../../shared/widgets/admin_header.dart';

class TournamentControlScreen extends StatefulWidget {
  const TournamentControlScreen({super.key});

  @override
  State<TournamentControlScreen> createState() => _TournamentControlScreenState();
}

class _TournamentControlScreenState extends State<TournamentControlScreen> {
  final SupabaseAdminService _adminService = SupabaseAdminService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _championships = [];

  @override
  void initState() {
    super.initState();
    _loadChampionships();
  }

  Future<void> _loadChampionships() async {
    setState(() => _isLoading = true);
    final data = await _adminService.fetchChampionships();
    if (mounted) {
      setState(() {
        _championships = data;
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
            title: localeProv.translate('tournaments_title'),
            subtitle: localeProv.translate('tournaments_sub'),
            action: ElevatedButton.icon(
              onPressed: _loadChampionships,
              icon: const Icon(Icons.refresh, size: 18),
              label: Text(localeProv.translate('reload_tournaments')),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: VSPColors.accent))
                : _championships.isEmpty
                    ? Center(
                        child: Text(localeProv.translate('no_tournaments'), style: const TextStyle(color: VSPColors.textSecondary)),
                      )
                    : SingleChildScrollView(
                        padding: const EdgeInsets.all(20),
                        child: Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: VSPColors.surface,
                            borderRadius: BorderRadius.circular(VSPRadius.md),
                            border: Border.all(color: VSPColors.borderLight),
                          ),
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: DataTable(
                              columnSpacing: 36,
                              horizontalMargin: 20,
                              headingRowColor: WidgetStateProperty.all(VSPColors.surfaceAlt),
                              columns: [
                                DataColumn(label: Text(localeProv.translate('col_tournament_name'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
                                DataColumn(label: Text(localeProv.translate('col_format'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
                                DataColumn(label: Text(localeProv.translate('col_teams'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
                                DataColumn(label: Text(localeProv.translate('col_status'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
                                DataColumn(label: Text(localeProv.translate('col_actions'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
                              ],
                              rows: _championships.map((champ) {
                                final status = champ['status'] ?? 'upcoming';
                                return DataRow(
                                  cells: [
                                    DataCell(Text(champ['title'] ?? champ['name'] ?? 'VSP Cup', style: const TextStyle(color: VSPColors.textPrimary, fontWeight: FontWeight.bold))),
                                    DataCell(Text(champ['format'] ?? 'Knockout', style: const TextStyle(color: VSPColors.textSecondary))),
                                    DataCell(Text('${champ['teams_count'] ?? 16}', style: const TextStyle(color: VSPColors.textSecondary))),
                                    DataCell(
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: VSPColors.accentSoft,
                                          borderRadius: BorderRadius.circular(VSPRadius.sm),
                                        ),
                                        child: Text(
                                          status.toString().toUpperCase(),
                                          style: const TextStyle(color: VSPColors.accent, fontSize: 11, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ),
                                    DataCell(
                                      OutlinedButton.icon(
                                        onPressed: () => _showManageTournamentDialog(champ),
                                        icon: const Icon(Icons.edit, size: 16, color: VSPColors.accent),
                                        label: Text(localeProv.translate('col_manage_brackets'), style: const TextStyle(color: VSPColors.accent, fontSize: 12)),
                                      ),
                                    ),
                                  ],
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  void _showManageTournamentDialog(Map<String, dynamic> champ) {
    String selectedStatus = champ['status'] ?? 'upcoming';
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: VSPColors.surface,
          title: Text('🏆 إدارة البطولة: ${champ['title'] ?? champ['name'] ?? 'VSP Cup'}',
              style: const TextStyle(color: VSPColors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: ['upcoming', 'live', 'completed'].contains(selectedStatus) ? selectedStatus : 'upcoming',
                dropdownColor: VSPColors.surfaceAlt,
                style: const TextStyle(color: VSPColors.textPrimary),
                decoration: const InputDecoration(labelText: 'حالة البطولة (Status)'),
                items: const [
                  DropdownMenuItem(value: 'upcoming', child: Text('⏳ قادمة (Upcoming)')),
                  DropdownMenuItem(value: 'live', child: Text('🔥 جارية (Live)')),
                  DropdownMenuItem(value: 'completed', child: Text('✅ مكتملة (Completed)')),
                ],
                onChanged: (val) {
                  if (val != null) setDialogState(() => selectedStatus = val);
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('إلغاء', style: TextStyle(color: VSPColors.textSecondary)),
            ),
            ElevatedButton(
              onPressed: () async {
                final ok = await _adminService.updateChampionshipStatus(champ['id'].toString(), selectedStatus);
                if (ctx.mounted) Navigator.pop(ctx);
                if (ok) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('🎉 تم تحديث حالة البطولة بنجاح!'), backgroundColor: Colors.green),
                    );
                  }
                  _loadChampionships();
                }
              },
              child: const Text('حفظ التعديلات'),
            ),
          ],
        ),
      ),
    );
  }
}

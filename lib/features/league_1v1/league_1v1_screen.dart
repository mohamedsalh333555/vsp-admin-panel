import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/vsp_colors.dart';
import '../../core/services/supabase_admin_service.dart';
import '../../core/providers/locale_provider.dart';
import '../../shared/widgets/admin_header.dart';

class League1v1Screen extends StatefulWidget {
  const League1v1Screen({super.key});

  @override
  State<League1v1Screen> createState() => _League1v1ScreenState();
}

class _League1v1ScreenState extends State<League1v1Screen> with SingleTickerProviderStateMixin {
  final SupabaseAdminService _adminService = SupabaseAdminService();
  late TabController _tabController;

  bool _isLoading = true;
  bool _isRegistrationOpen = true;
  List<Map<String, dynamic>> _players = [];
  List<Map<String, dynamic>> _pendingRegistrations = [];
  int _approvedCount = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadLeagueData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadLeagueData() async {
    setState(() => _isLoading = true);
    final isOpen = await _adminService.fetch1v1RegistrationOpenStatus();
    final players = await _adminService.fetch1v1LeaguePlayers();
    final approvedCount = await _adminService.fetch1v1ApprovedCount();
    final pendingRegs = await _adminService.fetch1v1PendingRegistrations();

    if (mounted) {
      setState(() {
        _isRegistrationOpen = isOpen;
        _players = players;
        _approvedCount = approvedCount;
        _pendingRegistrations = pendingRegs;
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleRegistrationStatus(bool isOpen) async {
    setState(() => _isRegistrationOpen = isOpen);
    final ok = await _adminService.set1v1RegistrationOpenStatus(isOpen);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isOpen ? '1v1 Registrations OPENED 🟢' : '1v1 Registrations CLOSED 🔴'),
          backgroundColor: isOpen ? VSPColors.success : VSPColors.error,
        ),
      );
    }
    if (!ok) {
      _loadLeagueData();
    }
  }

  void _showScarySeasonWipeConfirmationDialog(LocaleProvider localeProv) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: VSPColors.surface,
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: VSPColors.error, size: 32),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                localeProv.translate('scary_wipe_title'),
                style: const TextStyle(color: VSPColors.error, fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          localeProv.translate('scary_wipe_body'),
          style: const TextStyle(color: VSPColors.textSecondary, fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: VSPColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: VSPColors.error,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await _adminService.startNew1v1SeasonWipeRegistrations();
              if (ok) {
                await _loadLeagueData();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Wiped all registrations! New season initialized.'),
                      backgroundColor: VSPColors.error,
                    ),
                  );
                }
              }
            },
            child: const Text('PERMANENTLY WIPE & START FRESH'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleApproveRegistration(Map<String, dynamic> reg) async {
    final regId = reg['id'].toString();
    final userId = (reg['user_id'] ?? reg['player_id'] ?? '').toString();

    String playerName = 'Player';
    String? avatarUrl;
    if (reg['users'] is Map) {
      playerName = reg['users']['name'] ?? 'Player';
      avatarUrl = reg['users']['avatar_url'];
    } else {
      playerName = reg['player_name'] ?? reg['name'] ?? 'Player';
    }

    final ok = await _adminService.approve1v1Registration(
      registrationId: regId,
      userId: userId,
      name: playerName,
      avatarUrl: avatarUrl,
    );

    if (ok) {
      _loadLeagueData();
    }
  }

  Future<void> _handleRejectRegistration(String regId) async {
    final ok = await _adminService.reject1v1Registration(regId);
    if (ok) {
      _loadLeagueData();
    }
  }

  void _showAddPlayerModal() {
    final nameCtrl = TextEditingController();
    final avatarCtrl = TextEditingController();
    final pointsCtrl = TextEditingController(text: '100');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: VSPColors.surface,
        title: const Text('Register New 1v1 Street Player', style: TextStyle(color: VSPColors.textPrimary)),
        content: SizedBox(
          width: 400,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Player Full Name')),
              const SizedBox(height: 12),
              TextField(controller: avatarCtrl, decoration: const InputDecoration(labelText: 'Avatar Image URL')),
              const SizedBox(height: 12),
              TextField(controller: pointsCtrl, decoration: const InputDecoration(labelText: 'Initial Ranking Points')),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: VSPColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () async {
              final ok = await _adminService.add1v1Player(
                name: nameCtrl.text.trim(),
                avatarUrl: avatarCtrl.text.trim(),
                initialPoints: int.tryParse(pointsCtrl.text.trim()) ?? 100,
              );
              if (ctx.mounted) Navigator.pop(ctx);
              if (ok) _loadLeagueData();
            },
            child: const Text('Add Player'),
          ),
        ],
      ),
    );
  }

  void _showQuickEditModal(Map<String, dynamic> player) {
    final totalPointsCtrl = TextEditingController(text: '${player['total_points'] ?? 0}');
    final skillPointsCtrl = TextEditingController(text: '${player['skill_points'] ?? 0}');
    final goalsCtrl = TextEditingController(text: '${player['goals'] ?? 0}');
    final tacklesCtrl = TextEditingController(text: '${player['tackles'] ?? 0}');
    final titlesCtrl = TextEditingController(text: '${player['titles'] ?? 0}');
    String selectedTrend = player['trend'] ?? 'stable';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            backgroundColor: VSPColors.surface,
            title: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.flash_on, color: VSPColors.accent),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('Quick Edit Matchday Stats: ${player['name']}',
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: VSPColors.textPrimary, fontSize: 16)),
                ),
              ],
            ),
            content: SizedBox(
              width: 440,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(child: TextField(controller: totalPointsCtrl, decoration: const InputDecoration(labelText: 'Total Points'))),
                        const SizedBox(width: 12),
                        Expanded(child: TextField(controller: skillPointsCtrl, decoration: const InputDecoration(labelText: 'Skill Points'))),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: TextField(controller: goalsCtrl, decoration: const InputDecoration(labelText: 'Goals Scored'))),
                        const SizedBox(width: 12),
                        Expanded(child: TextField(controller: tacklesCtrl, decoration: const InputDecoration(labelText: 'Tackles / Defense'))),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: TextField(controller: titlesCtrl, decoration: const InputDecoration(labelText: 'Titles Won'))),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: selectedTrend,
                            dropdownColor: VSPColors.surfaceAlt,
                            style: const TextStyle(color: VSPColors.textPrimary),
                            decoration: const InputDecoration(labelText: 'Trend Direction'),
                            items: const [
                              DropdownMenuItem(value: 'up', child: Text('⬆️ Rising (Up)')),
                              DropdownMenuItem(value: 'down', child: Text('⬇️ Dropping (Down)')),
                              DropdownMenuItem(value: 'stable', child: Text('➖ Stable')),
                            ],
                            onChanged: (val) {
                              if (val != null) setDialogState(() => selectedTrend = val);
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel', style: TextStyle(color: VSPColors.textSecondary)),
              ),
              ElevatedButton(
                onPressed: () async {
                  final ok = await _adminService.update1v1PlayerStats(
                    playerId: player['id'],
                    totalPoints: int.tryParse(totalPointsCtrl.text.trim()) ?? 0,
                    skillPoints: int.tryParse(skillPointsCtrl.text.trim()) ?? 0,
                    goals: int.tryParse(goalsCtrl.text.trim()) ?? 0,
                    tackles: int.tryParse(tacklesCtrl.text.trim()) ?? 0,
                    titles: int.tryParse(titlesCtrl.text.trim()) ?? 0,
                    trend: selectedTrend,
                  );
                  if (ctx.mounted) Navigator.pop(ctx);
                  if (ok) _loadLeagueData();
                },
                child: const Text('Save Matchday Stats'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final localeProv = context.watch<LocaleProvider>();
    final bool isRosterLocked = _approvedCount >= 32;

    return Scaffold(
      backgroundColor: VSPColors.background,
      body: Column(
        children: [
          AdminHeader(
            title: localeProv.translate('league_1v1_title'),
            subtitle: localeProv.translate('league_1v1_sub'),
            action: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                ElevatedButton.icon(
                  onPressed: _loadLeagueData,
                  icon: const Icon(Icons.refresh, size: 16),
                  label: Text(localeProv.translate('refresh_data')),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: VSPColors.surfaceAlt,
                    foregroundColor: VSPColors.textPrimary,
                    side: const BorderSide(color: VSPColors.borderLight),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: _showAddPlayerModal,
                  child: Text(localeProv.translate('register_player_btn')),
                ),
              ],
            ),
          ),

          // TOURNAMENT MASTER CONTROLS CARD (TASK 2)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: VSPColors.surface,
                borderRadius: BorderRadius.circular(VSPRadius.md),
                border: Border.all(color: VSPColors.glassBorderAccent, width: 1.5),
              ),
              child: Wrap(
                spacing: 16,
                runSpacing: 12,
                crossAxisAlignment: WrapCrossAlignment.center,
                alignment: WrapAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: VSPColors.accentSoft,
                          borderRadius: BorderRadius.circular(VSPRadius.sm),
                        ),
                        child: const Icon(Icons.tune, color: VSPColors.accent, size: 24),
                      ),
                      const SizedBox(width: 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            localeProv.translate('master_controls_title'),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: VSPColors.textPrimary),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            localeProv.translate('master_controls_sub'),
                            style: const TextStyle(fontSize: 11, color: VSPColors.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  ),

                  // REGISTRATION GATE TOGGLE SWITCH
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _isRegistrationOpen ? localeProv.translate('status_open') : localeProv.translate('status_closed'),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: _isRegistrationOpen ? VSPColors.success : VSPColors.error,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Switch(
                        value: _isRegistrationOpen,
                        activeColor: VSPColors.accent,
                        onChanged: (val) => _toggleRegistrationStatus(val),
                      ),
                    ],
                  ),

                  // START NEW SEASON BUTTON
                  ElevatedButton.icon(
                    onPressed: () => _showScarySeasonWipeConfirmationDialog(localeProv),
                    icon: const Icon(Icons.bolt, size: 16, color: Colors.white),
                    label: Text(localeProv.translate('start_new_season_btn'), style: const TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: VSPColors.error,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // CAPACITY INDICATOR BANNER
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: isRosterLocked ? VSPColors.error.withValues(alpha: 0.15) : VSPColors.accentSoft,
                borderRadius: BorderRadius.circular(VSPRadius.md),
                border: Border.all(
                  color: isRosterLocked ? VSPColors.error : VSPColors.glassBorderAccent,
                  width: 1.5,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    isRosterLocked ? Icons.lock : Icons.groups,
                    color: isRosterLocked ? VSPColors.error : VSPColors.accent,
                    size: 22,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      isRosterLocked
                          ? localeProv.translate('roster_locked_warning')
                          : localeProv.translate('approved_counter').replaceAll('{count}', '$_approvedCount'),
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: isRosterLocked ? VSPColors.error : VSPColors.accent,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: isRosterLocked ? VSPColors.error : VSPColors.accent,
                      borderRadius: BorderRadius.circular(VSPRadius.sm),
                    ),
                    child: Text(
                      '$_approvedCount / 32',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                        color: isRosterLocked ? Colors.white : Colors.black,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // SUB-MODULE TABS
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Align(
              alignment: Alignment.centerLeft,
              child: TabBar(
                controller: _tabController,
                isScrollable: true,
                indicatorColor: VSPColors.accent,
                labelColor: VSPColors.accent,
                unselectedLabelColor: VSPColors.textSecondary,
                tabs: [
                  Tab(
                    child: Row(
                      children: [
                        const Icon(Icons.leaderboard, size: 18),
                        const SizedBox(width: 8),
                        Text(localeProv.translate('tab_standings')),
                      ],
                    ),
                  ),
                  Tab(
                    child: Row(
                      children: [
                        const Icon(Icons.how_to_reg, size: 18),
                        const SizedBox(width: 8),
                        Text(localeProv.translate('tab_registrations')),
                        if (_pendingRegistrations.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: VSPColors.warning,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${_pendingRegistrations.length}',
                              style: const TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),

          // TAB VIEWS CONTENT
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: VSPColors.accent))
                : TabBarView(
                    controller: _tabController,
                    children: [
                      // TAB 1: OFFICIAL STANDINGS & LEADERBOARD (NO MOCK DATA)
                      _buildStandingsTab(localeProv),

                      // TAB 2: 1v1 REGISTRATION REQUESTS
                      _buildRegistrationRequestsTab(localeProv),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStandingsTab(LocaleProvider localeProv) {
    if (_players.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.emoji_events_outlined, color: VSPColors.textSecondary, size: 48),
            const SizedBox(height: 12),
            Text(
              localeProv.translate('no_players_found'),
              style: const TextStyle(color: VSPColors.textSecondary, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
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
            dataRowMinHeight: 64,
            dataRowMaxHeight: 64,
            columns: [
              DataColumn(label: Text(localeProv.translate('col_rank'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
              DataColumn(label: Text(localeProv.translate('col_player'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
              DataColumn(label: Text(localeProv.translate('col_total_points'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
              DataColumn(label: Text(localeProv.translate('col_skill_points'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
              DataColumn(label: Text(localeProv.translate('col_goals'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
              DataColumn(label: Text(localeProv.translate('col_tackles'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
              DataColumn(label: Text(localeProv.translate('col_titles'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
              DataColumn(label: Text(localeProv.translate('col_trend'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
              DataColumn(label: Text(localeProv.translate('col_quick_edit'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
            ],
            rows: List.generate(_players.length, (index) {
              final player = _players[index];
              final rank = index + 1;
              final trend = player['trend'] ?? 'stable';

              Widget trendWidget;
              if (trend == 'up') {
                trendWidget = Text(localeProv.translate('trend_up'), style: const TextStyle(color: VSPColors.success, fontWeight: FontWeight.bold));
              } else if (trend == 'down') {
                trendWidget = Text(localeProv.translate('trend_down'), style: const TextStyle(color: VSPColors.error, fontWeight: FontWeight.bold));
              } else {
                trendWidget = Text(localeProv.translate('trend_stable'), style: const TextStyle(color: VSPColors.textSecondary));
              }

              return DataRow(
                cells: [
                  DataCell(
                    Text(
                      '#$rank',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: rank == 1 ? VSPColors.accent : (rank <= 3 ? VSPColors.warning : VSPColors.textPrimary),
                      ),
                    ),
                  ),
                  DataCell(
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: VSPColors.accentSoft,
                          backgroundImage: player['avatar_url'] != null && (player['avatar_url'] as String).startsWith('http')
                              ? NetworkImage(player['avatar_url'])
                              : null,
                          child: player['avatar_url'] == null || !(player['avatar_url'] as String).startsWith('http')
                              ? Text(
                                  (player['name'] as String? ?? 'P')[0].toUpperCase(),
                                  style: const TextStyle(color: VSPColors.accent, fontWeight: FontWeight.bold),
                                )
                              : null,
                        ),
                        const SizedBox(width: 10),
                        Text(player['name'] ?? 'Street King', style: const TextStyle(color: VSPColors.textPrimary, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  DataCell(Text('${player['total_points'] ?? 0}', style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.accent))),
                  DataCell(Text('${player['skill_points'] ?? 0}', style: const TextStyle(color: VSPColors.textPrimary))),
                  DataCell(Text('${player['goals'] ?? 0}', style: const TextStyle(color: VSPColors.textPrimary))),
                  DataCell(Text('${player['tackles'] ?? 0}', style: const TextStyle(color: VSPColors.textPrimary))),
                  DataCell(Text('${player['titles'] ?? 0}', style: const TextStyle(color: VSPColors.warning, fontWeight: FontWeight.bold))),
                  DataCell(trendWidget),
                  DataCell(
                    ElevatedButton(
                      onPressed: () => _showQuickEditModal(player),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        backgroundColor: VSPColors.accent,
                      ),
                      child: Text(localeProv.translate('update_results'), style: const TextStyle(fontSize: 12)),
                    ),
                  ),
                ],
              );
            }),
          ),
        ),
      ),
    );
  }

  Widget _buildRegistrationRequestsTab(LocaleProvider localeProv) {
    if (_pendingRegistrations.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle_outline, color: VSPColors.success, size: 48),
            const SizedBox(height: 12),
            Text(
              localeProv.translate('no_pending_registrations'),
              style: const TextStyle(color: VSPColors.textSecondary, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
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
            dataRowMinHeight: 64,
            dataRowMaxHeight: 64,
            columns: [
              DataColumn(label: Text(localeProv.translate('col_player'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
              DataColumn(label: Text(localeProv.translate('col_phone'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
              DataColumn(label: Text(localeProv.translate('col_status'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
              DataColumn(label: Text(localeProv.translate('col_actions'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
            ],
            rows: _pendingRegistrations.map((reg) {
              String name = 'Player';
              String phone = '-';
              String? avatarUrl;

              if (reg['users'] is Map) {
                name = reg['users']['name'] ?? 'Player';
                phone = reg['users']['phone'] ?? reg['users']['email'] ?? '-';
                avatarUrl = reg['users']['avatar_url'];
              } else {
                name = reg['player_name'] ?? reg['name'] ?? 'Player';
                phone = reg['phone'] ?? '-';
              }

              return DataRow(
                cells: [
                  DataCell(
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: VSPColors.accentSoft,
                          backgroundImage: avatarUrl != null && avatarUrl.startsWith('http') ? NetworkImage(avatarUrl) : null,
                          child: avatarUrl == null || !avatarUrl.startsWith('http')
                              ? Text(name[0].toUpperCase(), style: const TextStyle(color: VSPColors.accent, fontWeight: FontWeight.bold))
                              : null,
                        ),
                        const SizedBox(width: 12),
                        Text(name, style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary)),
                      ],
                    ),
                  ),
                  DataCell(Text(phone, style: const TextStyle(color: VSPColors.textSecondary))),
                  DataCell(
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: VSPColors.warning.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(VSPRadius.sm),
                      ),
                      child: Text(
                        localeProv.translate('status_pending'),
                        style: const TextStyle(color: VSPColors.warning, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  DataCell(
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ElevatedButton.icon(
                          onPressed: () => _handleApproveRegistration(reg),
                          icon: const Icon(Icons.check, size: 14, color: Colors.black),
                          label: Text(localeProv.translate('approve_btn'), style: const TextStyle(fontSize: 11)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: VSPColors.accent,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: () => _handleRejectRegistration(reg['id'].toString()),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: VSPColors.error,
                            side: const BorderSide(color: VSPColors.error),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          child: Text(localeProv.translate('reject_btn'), style: const TextStyle(fontSize: 11)),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

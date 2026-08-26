import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/vsp_colors.dart';
import '../../core/services/supabase_admin_service.dart';
import '../../core/providers/locale_provider.dart';
import '../../shared/widgets/admin_header.dart';

class UsersModerationScreen extends StatefulWidget {
  const UsersModerationScreen({super.key});

  @override
  State<UsersModerationScreen> createState() => _UsersModerationScreenState();
}

class _UsersModerationScreenState extends State<UsersModerationScreen> {
  final SupabaseAdminService _adminService = SupabaseAdminService();
  final TextEditingController _searchController = TextEditingController();
  bool _isLoading = true;
  List<Map<String, dynamic>> _users = [];

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() => _isLoading = true);
    final users = await _adminService.fetchAllUsers(searchQuery: _searchController.text.trim());
    if (mounted) {
      setState(() {
        _users = users;
        _isLoading = false;
      });
    }
  }

  Future<void> _approveAdminRequest(String userId) async {
    try {
      await _adminService.client.from('users').update({
        'role': 'admin',
        'status': 'active',
      }).eq('id', userId);
      _loadUsers();
    } catch (e) {
      print('Error approving admin request: $e');
    }
  }

  Future<void> _rejectAdminRequest(String userId) async {
    try {
      await _adminService.client.from('users').update({
        'role': 'player',
        'status': 'blocked',
      }).eq('id', userId);
      _loadUsers();
    } catch (e) {
      print('Error rejecting admin request: $e');
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
            title: localeProv.translate('users_title'),
            subtitle: localeProv.translate('users_sub'),
            action: SizedBox(
              width: 280,
              child: TextField(
                controller: _searchController,
                onSubmitted: (_) => _loadUsers(),
                decoration: InputDecoration(
                  hintText: localeProv.translate('search_placeholder'),
                  prefixIcon: const Icon(Icons.search, color: VSPColors.textSecondary),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.clear, color: VSPColors.textSecondary),
                    onPressed: () {
                      _searchController.clear();
                      _loadUsers();
                    },
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: VSPColors.accent))
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
                          columnSpacing: 40,
                          horizontalMargin: 20,
                          headingRowColor: WidgetStateProperty.all(VSPColors.surfaceAlt),
                          dataRowMinHeight: 60,
                          dataRowMaxHeight: 60,
                          columns: [
                            DataColumn(label: Text(localeProv.translate('col_name'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
                            DataColumn(label: Text(localeProv.translate('col_phone'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
                            DataColumn(label: Text(localeProv.translate('col_role'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
                            DataColumn(label: Text(localeProv.translate('col_gov'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
                            DataColumn(label: Text(localeProv.translate('col_noshow'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
                            DataColumn(label: Text(localeProv.translate('col_status'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
                            DataColumn(label: Text(localeProv.translate('col_actions'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary))),
                          ],
                          rows: _users.map((user) {
                            final role = (user['role'] ?? 'player').toString();
                            final isPendingAdmin = role == 'pending_admin' || (user['is_approved'] == false && role == 'admin');
                            final isBlocked = user['status'] == 'blocked' || user['is_blocked'] == true;
                            final int noShowCount = user['no_show_count'] ?? 0;
                            final isCoFounder = (user['email'] ?? '').toString().toLowerCase() == 'mohamedsalh333555@gmail.com' || role == 'co_founder';

                            String roleDisplay = localeProv.translate('role_player');
                            if (isCoFounder) {
                              roleDisplay = localeProv.translate('role_cofounder');
                            } else if (role == 'owner') {
                              roleDisplay = localeProv.translate('role_owner');
                            } else if (role == 'admin') {
                              roleDisplay = 'ADMIN';
                            } else if (isPendingAdmin) {
                              roleDisplay = 'PENDING ADMIN';
                            }

                            return DataRow(
                              cells: [
                                DataCell(
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      CircleAvatar(
                                        radius: 14,
                                        backgroundColor: isCoFounder ? VSPColors.accent : VSPColors.accentSoft,
                                        child: Text(
                                          (user['name'] as String? ?? 'U')[0].toUpperCase(),
                                          style: TextStyle(
                                            color: isCoFounder ? Colors.black : VSPColors.accent,
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Text(
                                        user['name'] ?? 'Unnamed',
                                        style: TextStyle(
                                          color: isCoFounder ? VSPColors.accent : VSPColors.textPrimary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                DataCell(Text(user['phone'] ?? user['email'] ?? '-', style: const TextStyle(color: VSPColors.textSecondary))),
                                DataCell(
                                  FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                      decoration: BoxDecoration(
                                        color: isCoFounder
                                            ? VSPColors.accent
                                            : (role == 'owner' ? VSPColors.info.withValues(alpha: 0.15) : VSPColors.surfaceAlt),
                                        borderRadius: BorderRadius.circular(VSPRadius.sm),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            roleDisplay,
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: isCoFounder ? Colors.black : (role == 'owner' ? VSPColors.info : VSPColors.textSecondary),
                                            ),
                                          ),
                                          if (isCoFounder) ...[
                                            const SizedBox(width: 4),
                                            const Icon(Icons.stars, size: 13, color: Colors.black),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                DataCell(Text(user['governorate'] ?? 'Cairo', style: const TextStyle(color: VSPColors.textSecondary))),
                                DataCell(
                                  Text(
                                    '$noShowCount',
                                    style: TextStyle(
                                      color: noShowCount > 2 ? VSPColors.error : VSPColors.textPrimary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                DataCell(
                                  FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: isPendingAdmin
                                            ? VSPColors.warning.withValues(alpha: 0.2)
                                            : (isBlocked ? VSPColors.error.withValues(alpha: 0.15) : VSPColors.success.withValues(alpha: 0.15)),
                                        borderRadius: BorderRadius.circular(VSPRadius.sm),
                                      ),
                                      child: Text(
                                        isPendingAdmin
                                            ? localeProv.translate('status_pending')
                                            : (isBlocked ? localeProv.translate('status_blocked') : localeProv.translate('status_active')),
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          color: isPendingAdmin ? VSPColors.warning : (isBlocked ? VSPColors.error : VSPColors.success),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                DataCell(
                                  isPendingAdmin
                                      ? Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            ElevatedButton.icon(
                                              onPressed: () => _approveAdminRequest(user['id']),
                                              icon: const Icon(Icons.check, size: 14, color: Colors.black),
                                              label: Text(localeProv.translate('approve_admin_btn'), style: const TextStyle(fontSize: 11)),
                                              style: ElevatedButton.styleFrom(backgroundColor: VSPColors.accent, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6)),
                                            ),
                                            const SizedBox(width: 8),
                                            OutlinedButton(
                                              onPressed: () => _rejectAdminRequest(user['id']),
                                              style: OutlinedButton.styleFrom(foregroundColor: VSPColors.error, side: const BorderSide(color: VSPColors.error), padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6)),
                                              child: Text(localeProv.translate('reject_admin_btn'), style: const TextStyle(fontSize: 11)),
                                            ),
                                          ],
                                        )
                                      : Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            if (!isCoFounder)
                                              IconButton(
                                                tooltip: isBlocked ? 'Unblock' : 'Block',
                                                icon: Icon(
                                                  isBlocked ? Icons.lock_open : Icons.block,
                                                  color: isBlocked ? VSPColors.success : VSPColors.error,
                                                  size: 18,
                                                ),
                                                onPressed: () async {
                                                  final ok = await _adminService.toggleUserBlockStatus(user['id'], !isBlocked);
                                                  if (ok) _loadUsers();
                                                },
                                              ),
                                            if (noShowCount > 0)
                                              IconButton(
                                                tooltip: 'Reset No-Show',
                                                icon: const Icon(Icons.restore, color: VSPColors.warning, size: 18),
                                                onPressed: () async {
                                                  final ok = await _adminService.resetNoShowCount(user['id']);
                                                  if (ok) _loadUsers();
                                                },
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
                  ),
          ),
        ],
      ),
    );
  }
}

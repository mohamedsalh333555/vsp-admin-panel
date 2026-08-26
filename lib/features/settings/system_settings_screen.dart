import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/vsp_colors.dart';
import '../../core/services/supabase_admin_service.dart';
import '../../core/providers/locale_provider.dart';
import '../../shared/widgets/admin_header.dart';

class SystemSettingsScreen extends StatefulWidget {
  const SystemSettingsScreen({super.key});

  @override
  State<SystemSettingsScreen> createState() => _SystemSettingsScreenState();
}

class _SystemSettingsScreenState extends State<SystemSettingsScreen> {
  final SupabaseAdminService _adminService = SupabaseAdminService();
  bool _maintenanceMode = false;
  bool _isSending = false;

  final _pushTitleController = TextEditingController();
  final _pushBodyController = TextEditingController();
  final _supportPhoneController = TextEditingController(text: '+20 100 000 0000');

  String _targetAudience = 'all'; // 'all', 'players', 'owners'
  String _notificationType = 'info'; // 'info', 'warning', 'success'

  @override
  Widget build(BuildContext context) {
    final localeProv = context.watch<LocaleProvider>();

    return Scaffold(
      backgroundColor: VSPColors.background,
      body: Column(
        children: [
          AdminHeader(
            title: localeProv.translate('settings_title'),
            subtitle: localeProv.translate('settings_sub'),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // CRM BROADCAST CENTER CARD
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: VSPColors.surface,
                      borderRadius: BorderRadius.circular(VSPRadius.md),
                      border: Border.all(color: VSPColors.glassBorderAccent),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.campaign, color: VSPColors.accent, size: 28),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    localeProv.translate('crm_title'),
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: VSPColors.textPrimary),
                                  ),
                                  Text(
                                    localeProv.translate('crm_sub'),
                                    style: const TextStyle(color: VSPColors.textSecondary, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        LayoutBuilder(
                          builder: (context, constraints) {
                            final isNarrow = constraints.maxWidth < 800;
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                TextField(
                                  controller: _pushTitleController,
                                  decoration: InputDecoration(
                                    labelText: localeProv.translate('notif_title_label'),
                                    prefixIcon: const Icon(Icons.title, color: VSPColors.textSecondary),
                                  ),
                                ),
                                const SizedBox(height: 14),
                                TextField(
                                  controller: _pushBodyController,
                                  maxLines: 3,
                                  decoration: InputDecoration(
                                    labelText: localeProv.translate('notif_body_label'),
                                    prefixIcon: const Icon(Icons.message_outlined, color: VSPColors.textSecondary),
                                  ),
                                ),
                                const SizedBox(height: 20),

                                isNarrow
                                    ? Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          _buildAudienceSelector(localeProv),
                                          const SizedBox(height: 16),
                                          _buildTypeSelector(localeProv),
                                        ],
                                      )
                                    : Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Expanded(child: _buildAudienceSelector(localeProv)),
                                          const SizedBox(width: 24),
                                          Expanded(child: _buildTypeSelector(localeProv)),
                                        ],
                                      ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 24),

                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isSending ? null : _sendBroadcastNotification,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              backgroundColor: VSPColors.accent,
                            ),
                            child: _isSending
                                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                                : Text(
                                    localeProv.translate('dispatch_btn'),
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // MAINTENANCE MODE CARD
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: VSPColors.surface,
                      borderRadius: BorderRadius.circular(VSPRadius.md),
                      border: Border.all(color: VSPColors.borderLight),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(localeProv.translate('maintenance_title'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: VSPColors.textPrimary)),
                              const SizedBox(height: 4),
                              Text(localeProv.translate('maintenance_sub'), style: const TextStyle(color: VSPColors.textSecondary, fontSize: 13)),
                            ],
                          ),
                        ),
                        Switch(
                          value: _maintenanceMode,
                          activeColor: VSPColors.accent,
                          onChanged: (val) async {
                            setState(() => _maintenanceMode = val);
                            await _adminService.setMaintenanceMode(val);
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // SUPPORT CONTACT HOTLINE
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: VSPColors.surface,
                      borderRadius: BorderRadius.circular(VSPRadius.md),
                      border: Border.all(color: VSPColors.borderLight),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(localeProv.translate('hotline_title'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: VSPColors.textPrimary)),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _supportPhoneController,
                                decoration: InputDecoration(labelText: localeProv.translate('hotline_label')),
                              ),
                            ),
                            const SizedBox(width: 16),
                            ElevatedButton(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Support Number Updated.')),
                                );
                              },
                              child: Text(localeProv.translate('save_number')),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAudienceSelector(LocaleProvider localeProv) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(localeProv.translate('target_audience_label'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary, fontSize: 14)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: VSPColors.surfaceAlt,
            borderRadius: BorderRadius.circular(VSPRadius.sm),
            border: Border.all(color: VSPColors.borderLight),
          ),
          child: Column(
            children: [
              RadioListTile<String>(
                title: Text(localeProv.translate('target_all'), style: const TextStyle(color: VSPColors.textPrimary, fontSize: 13)),
                value: 'all',
                groupValue: _targetAudience,
                activeColor: VSPColors.accent,
                onChanged: (val) => setState(() => _targetAudience = val!),
              ),
              RadioListTile<String>(
                title: Text(localeProv.translate('target_players'), style: const TextStyle(color: VSPColors.textPrimary, fontSize: 13)),
                value: 'players',
                groupValue: _targetAudience,
                activeColor: VSPColors.accent,
                onChanged: (val) => setState(() => _targetAudience = val!),
              ),
              RadioListTile<String>(
                title: Text(localeProv.translate('target_owners'), style: const TextStyle(color: VSPColors.textPrimary, fontSize: 13)),
                value: 'owners',
                groupValue: _targetAudience,
                activeColor: VSPColors.accent,
                onChanged: (val) => setState(() => _targetAudience = val!),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTypeSelector(LocaleProvider localeProv) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(localeProv.translate('notif_cat_label'), style: const TextStyle(fontWeight: FontWeight.bold, color: VSPColors.textPrimary, fontSize: 14)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: VSPColors.surfaceAlt,
            borderRadius: BorderRadius.circular(VSPRadius.sm),
            border: Border.all(color: VSPColors.borderLight),
          ),
          child: Column(
            children: [
              RadioListTile<String>(
                title: Text(localeProv.translate('cat_info'), style: const TextStyle(color: VSPColors.textPrimary, fontSize: 13)),
                value: 'info',
                groupValue: _notificationType,
                activeColor: VSPColors.accent,
                onChanged: (val) => setState(() => _notificationType = val!),
              ),
              RadioListTile<String>(
                title: Text(localeProv.translate('cat_success'), style: const TextStyle(color: VSPColors.textPrimary, fontSize: 13)),
                value: 'success',
                groupValue: _notificationType,
                activeColor: VSPColors.accent,
                onChanged: (val) => setState(() => _notificationType = val!),
              ),
              RadioListTile<String>(
                title: Text(localeProv.translate('cat_warning'), style: const TextStyle(color: VSPColors.textPrimary, fontSize: 13)),
                value: 'warning',
                groupValue: _notificationType,
                activeColor: VSPColors.accent,
                onChanged: (val) => setState(() => _notificationType = val!),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _sendBroadcastNotification() async {
    final title = _pushTitleController.text.trim();
    final body = _pushBodyController.text.trim();

    if (title.isEmpty || body.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill out both Title and Body fields.')),
      );
      return;
    }

    setState(() => _isSending = true);

    final res = await _adminService.sendTargetedBroadcastNotification(
      title: title,
      body: body,
      targetAudience: _targetAudience,
      notificationType: _notificationType,
    );

    setState(() => _isSending = false);

    if (mounted) {
      if (res['success'] == true) {
        _pushTitleController.clear();
        _pushBodyController.clear();
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: VSPColors.surface,
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: VSPColors.success),
                SizedBox(width: 8),
                Text('Broadcast Dispatched!', style: TextStyle(color: VSPColors.textPrimary)),
              ],
            ),
            content: Text(
              'Successfully dispatched notification to ${res['count']} users in Supabase database.',
              style: const TextStyle(color: VSPColors.textSecondary),
            ),
            actions: [
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: ${res['error']}')),
        );
      }
    }
  }
}

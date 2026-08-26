import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/vsp_colors.dart';
import '../../core/services/supabase_admin_service.dart';
import '../../core/providers/locale_provider.dart';
import '../../shared/widgets/admin_header.dart';

class OwnerAuditsScreen extends StatefulWidget {
  const OwnerAuditsScreen({super.key});

  @override
  State<OwnerAuditsScreen> createState() => _OwnerAuditsScreenState();
}

class _OwnerAuditsScreenState extends State<OwnerAuditsScreen> {
  final SupabaseAdminService _adminService = SupabaseAdminService();
  bool _isLoading = true;
  bool _isActionProcessing = false;
  List<Map<String, dynamic>> _pendingOwners = [];
  Map<String, dynamic>? _selectedOwner;
  Map<String, dynamic>? _linkedStadium;
  final _rejectionReasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadPendingOwners();
  }

  Future<void> _loadPendingOwners() async {
    setState(() => _isLoading = true);
    final owners = await _adminService.fetchPendingOwners();
    setState(() {
      _pendingOwners = owners;
      _isLoading = false;
      if (_pendingOwners.isNotEmpty) {
        _selectOwner(_pendingOwners.first);
      } else {
        _selectedOwner = null;
        _linkedStadium = null;
      }
    });
  }

  Future<void> _selectOwner(Map<String, dynamic> owner) async {
    setState(() {
      _selectedOwner = owner;
      _linkedStadium = null;
    });
    final stadium = await _adminService.fetchStadiumForOwner(owner['id']);
    if (mounted) {
      setState(() => _linkedStadium = stadium);
    }
  }

  void _showAddOwnerModal() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final stadiumNameCtrl = TextEditingController();
    final govCtrl = TextEditingController(text: 'Cairo');
    final priceCtrl = TextEditingController(text: '350');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: VSPColors.surface,
        title: const Text('Add Verified Owner & Stadium Manually', style: TextStyle(color: VSPColors.textPrimary)),
        content: SizedBox(
          width: 480,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Owner Full Name')),
                const SizedBox(height: 12),
                TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'Phone Number')),
                const SizedBox(height: 12),
                TextField(controller: emailCtrl, decoration: const InputDecoration(labelText: 'Email Address')),
                const SizedBox(height: 12),
                TextField(controller: stadiumNameCtrl, decoration: const InputDecoration(labelText: 'Stadium Name')),
                const SizedBox(height: 12),
                TextField(controller: govCtrl, decoration: const InputDecoration(labelText: 'Governorate')),
                const SizedBox(height: 12),
                TextField(controller: priceCtrl, decoration: const InputDecoration(labelText: 'Price Per Hour (EGP)')),
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
              final success = await _adminService.createOwnerAndStadiumManually(
                name: nameCtrl.text.trim(),
                phone: phoneCtrl.text.trim(),
                email: emailCtrl.text.trim(),
                stadiumName: stadiumNameCtrl.text.trim(),
                governorate: govCtrl.text.trim(),
                pricePerHour: double.tryParse(priceCtrl.text.trim()) ?? 350.0,
              );
              if (ctx.mounted) Navigator.pop(ctx);
              if (success) _loadPendingOwners();
            },
            child: const Text('Add & Verify Instantly'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final localeProv = context.watch<LocaleProvider>();

    return Scaffold(
      backgroundColor: VSPColors.background,
      body: Column(
        children: [
          AdminHeader(
            title: localeProv.translate('owner_audits_title'),
            subtitle: localeProv.translate('owner_audits_sub'),
            action: ElevatedButton(
              onPressed: _showAddOwnerModal,
              child: Text(localeProv.translate('add_owner_btn')),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: VSPColors.accent))
                : LayoutBuilder(
                    builder: (context, constraints) {
                      final double sidebarWidth = constraints.maxWidth < 700
                          ? 220.0
                          : (constraints.maxWidth < 1000 ? 260.0 : 320.0);
                      return Row(
                        children: [
                          // Master Left List
                          Container(
                            width: sidebarWidth,
                        decoration: const BoxDecoration(
                          color: VSPColors.surface,
                          border: Border(right: BorderSide(color: VSPColors.divider)),
                        ),
                        child: _pendingOwners.isEmpty
                            ? Center(
                                child: Text(localeProv.translate('no_pending_audits'), style: const TextStyle(color: VSPColors.textSecondary)),
                              )
                            : ListView.builder(
                                itemCount: _pendingOwners.length,
                                itemBuilder: (context, index) {
                                  final owner = _pendingOwners[index];
                                  final isSelected = _selectedOwner?['id'] == owner['id'];
                                  return ListTile(
                                    selected: isSelected,
                                    selectedTileColor: VSPColors.accentSoft,
                                    onTap: () => _selectOwner(owner),
                                    title: Text(
                                      owner['name'] ?? 'Unnamed Owner',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: isSelected ? VSPColors.accent : VSPColors.textPrimary,
                                      ),
                                    ),
                                    subtitle: Text(
                                      owner['phone'] ?? '',
                                      style: const TextStyle(color: VSPColors.textSecondary, fontSize: 12),
                                    ),
                                    trailing: const Icon(Icons.chevron_right, color: VSPColors.textSecondary),
                                  );
                                },
                              ),
                      ),

                      // Detail Right Panel
                      Expanded(
                        child: _selectedOwner == null
                            ? Center(
                                child: Text(localeProv.translate('select_owner_prompt'), style: const TextStyle(color: VSPColors.textSecondary)),
                              )
                            : SingleChildScrollView(
                                padding: const EdgeInsets.all(24),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildSectionTitle(localeProv.translate('owner_info_title')),
                                    const SizedBox(height: 12),
                                    Container(
                                      padding: const EdgeInsets.all(20),
                                      decoration: BoxDecoration(
                                        color: VSPColors.surface,
                                        borderRadius: BorderRadius.circular(VSPRadius.md),
                                        border: Border.all(color: VSPColors.borderLight),
                                      ),
                                      child: Column(
                                        children: [
                                          _buildDetailRow(localeProv.translate('owner_name'), _selectedOwner!['name'] ?? 'N/A'),
                                          _buildDetailRow(localeProv.translate('phone_number'), _selectedOwner!['phone'] ?? 'N/A'),
                                          _buildDetailRow(localeProv.translate('email'), _selectedOwner!['email'] ?? 'N/A'),
                                          _buildDetailRow(localeProv.translate('governorate'), _selectedOwner!['governorate'] ?? 'N/A'),
                                          _buildDetailRow(localeProv.translate('status'), _selectedOwner!['verification_status'] ?? 'pending'),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 24),

                                    _buildSectionTitle(localeProv.translate('linked_stadium_title')),
                                    const SizedBox(height: 12),
                                    Container(
                                      padding: const EdgeInsets.all(20),
                                      decoration: BoxDecoration(
                                        color: VSPColors.surface,
                                        borderRadius: BorderRadius.circular(VSPRadius.md),
                                        border: Border.all(color: VSPColors.borderLight),
                                      ),
                                      child: _linkedStadium == null
                                          ? Text(localeProv.translate('no_linked_stadium'), style: const TextStyle(color: VSPColors.textSecondary))
                                          : Column(
                                              children: [
                                                _buildDetailRow(localeProv.translate('stadium_name'), _linkedStadium!['name'] ?? 'N/A'),
                                                _buildDetailRow(localeProv.translate('location_gov'), _linkedStadium!['governorate'] ?? 'N/A'),
                                                _buildDetailRow(localeProv.translate('hourly_rate'), '${_linkedStadium!['price_per_hour'] ?? 0} EGP'),
                                              ],
                                            ),
                                    ),
                                    const SizedBox(height: 24),

                                    _buildSectionTitle(localeProv.translate('legal_docs_title')),
                                    const SizedBox(height: 12),
                                    _buildDocumentsGrid(_selectedOwner!['additional_data']),
                                    const SizedBox(height: 32),

                                    Wrap(
                                      spacing: 12,
                                      runSpacing: 12,
                                      children: [
                                        ElevatedButton.icon(
                                          onPressed: _isActionProcessing
                                              ? null
                                              : () async {
                                                  setState(() => _isActionProcessing = true);
                                                  final ok = await _adminService.approveOwner(
                                                    ownerId: _selectedOwner!['id'],
                                                    stadiumId: _linkedStadium?['id'],
                                                  );
                                                  if (mounted) {
                                                    setState(() => _isActionProcessing = false);
                                                    if (ok) {
                                                      ScaffoldMessenger.of(context).showSnackBar(
                                                        const SnackBar(
                                                          content: Text('🎉 تم توثيق المالك والملعب بنجاح!'),
                                                          backgroundColor: Colors.green,
                                                          duration: Duration(seconds: 3),
                                                        ),
                                                      );
                                                      _loadPendingOwners();
                                                    } else {
                                                      ScaffoldMessenger.of(context).showSnackBar(
                                                        const SnackBar(
                                                          content: Text('❌ حدث خطأ أثناء توثيق المالك، يرجى المحاولة مرة أخرى.'),
                                                          backgroundColor: VSPColors.error,
                                                          duration: Duration(seconds: 4),
                                                        ),
                                                      );
                                                    }
                                                  }
                                                },
                                          icon: _isActionProcessing
                                              ? const SizedBox(
                                                  width: 16,
                                                  height: 16,
                                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                                                )
                                              : const Icon(Icons.check_circle_outline, color: Colors.black),
                                          label: Text(localeProv.translate('approve_btn')),
                                          style: ElevatedButton.styleFrom(backgroundColor: VSPColors.accent),
                                        ),
                                        ElevatedButton.icon(
                                          onPressed: _isActionProcessing
                                              ? null
                                              : () {
                                                  _showRejectDialog(_selectedOwner!['id']);
                                                },
                                          icon: const Icon(Icons.cancel_outlined, color: Colors.white),
                                          label: Text(localeProv.translate('reject_btn')),
                                          style: ElevatedButton.styleFrom(backgroundColor: VSPColors.error, foregroundColor: Colors.white),
                                        ),
                                        const SizedBox(width: 8),
                                        ElevatedButton.icon(
                                          onPressed: _isActionProcessing
                                              ? null
                                              : () async {
                                                  setState(() => _isActionProcessing = true);
                                                  final ok = await _adminService.activateVspPro(ownerId: _selectedOwner!['id']);
                                                  if (mounted) {
                                                    setState(() => _isActionProcessing = false);
                                                    if (ok) {
                                                      ScaffoldMessenger.of(context).showSnackBar(
                                                        const SnackBar(content: Text('🎉 تم تفعيل باقة VSP PRO للمالك بنجاح (30 يوم)! 👑'), backgroundColor: Colors.amber),
                                                      );
                                                    } else {
                                                      ScaffoldMessenger.of(context).showSnackBar(
                                                        const SnackBar(content: Text('❌ فشل تفعيل باقة PRO، يرجى إعادة المحاولة.'), backgroundColor: VSPColors.error),
                                                      );
                                                    }
                                                  }
                                                },
                                          icon: const Icon(Icons.workspace_premium, color: Colors.black, size: 18),
                                          label: const Text('تفعيل PRO', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                                          style: ElevatedButton.styleFrom(backgroundColor: Colors.amber),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                      ),
                    ],
                  );
                },
              ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: VSPColors.textPrimary),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: VSPColors.textSecondary, fontSize: 13)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
              maxLines: 2,
              style: const TextStyle(color: VSPColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentsGrid(dynamic additionalData) {
    Map<String, dynamic> docs = {};
    dynamic parsedData = additionalData;
    if (additionalData is String && additionalData.isNotEmpty) {
      try {
        parsedData = jsonDecode(additionalData);
      } catch (_) {}
    }
    if (parsedData is Map && parsedData['verificationDocuments'] is Map) {
      docs = Map<String, dynamic>.from(parsedData['verificationDocuments']);
    }

    final docKeys = [
      {'key': 'nationalIdFrontUrl', 'altKey': 'idFront', 'title': 'National ID (Front)'},
      {'key': 'nationalIdBackUrl', 'altKey': 'idBack', 'title': 'National ID (Back)'},
      {'key': 'commercialRegisterUrl', 'altKey': 'commercialRegister', 'title': 'Commercial Register'},
      {'key': 'taxCardUrl', 'altKey': 'taxCard', 'title': 'Tax Card'},
    ];

    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: docKeys.map((item) {
        final url = (docs[item['key']] ?? docs[item['altKey']]) as String?;
        return Container(
          constraints: const BoxConstraints(maxWidth: 220, minWidth: 160),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: VSPColors.surface,
            borderRadius: BorderRadius.circular(VSPRadius.sm),
            border: Border.all(color: VSPColors.borderLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                item['title']!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: VSPColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 12),
              ),
              const SizedBox(height: 8),
              url == null || url.isEmpty
                  ? const Text('Document Not Provided', style: TextStyle(color: VSPColors.textSecondary, fontSize: 11))
                  : OutlinedButton.icon(
                      onPressed: () => _viewDocument(context, item['title']!, url),
                      icon: const Icon(Icons.file_present, size: 16, color: VSPColors.accent),
                      label: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: const Text('View Document', style: TextStyle(color: VSPColors.accent, fontSize: 12)),
                      ),
                    ),
            ],
          ),
        );
      }).toList(),
    );
  }

  void _viewDocument(BuildContext context, String title, String rawUrl) {
    final String url = rawUrl.trim();
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: VSPColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(VSPRadius.md)),
        child: Container(
          width: 800,
          height: 650,
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: VSPColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: VSPColors.textPrimary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const Divider(color: VSPColors.borderLight),
              const SizedBox(height: 8),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(VSPRadius.sm),
                  child: Container(
                    color: Colors.black26,
                    child: Center(
                      child: InteractiveViewer(
                        minScale: 0.5,
                        maxScale: 5.0,
                        child: _buildDocumentImageWidget(url),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'يمكنك التكبير/التصغير والسحب لمعاينة التفاصيل | Zoom & Pan Enabled',
                style: TextStyle(color: VSPColors.textSecondary, fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDocumentImageWidget(String url) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return Image.network(
        url,
        fit: BoxFit.contain,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Center(
            child: CircularProgressIndicator(
              value: loadingProgress.expectedTotalBytes != null
                  ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                  : null,
              color: VSPColors.accent,
            ),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          return Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.broken_image, color: VSPColors.error, size: 48),
              const SizedBox(height: 8),
              Text(
                'تعذر تحميل الصورة من الرابط:\n$url',
                style: const TextStyle(color: VSPColors.textSecondary, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          );
        },
      );
    } else if (url.startsWith('data:image')) {
      try {
        final base64Data = url.split(',').last;
        final bytes = base64Decode(base64Data);
        return Image.memory(bytes, fit: BoxFit.contain);
      } catch (e) {
        return Text('خطأ في فك تشفير الصورة: $e', style: const TextStyle(color: VSPColors.error));
      }
    } else {
      try {
        final bytes = base64Decode(url);
        return Image.memory(bytes, fit: BoxFit.contain);
      } catch (_) {
        return const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 48),
            SizedBox(height: 8),
            Text('رابط المستند تالف أو غير صالح', style: TextStyle(color: VSPColors.textSecondary)),
          ],
        );
      }
    }
  }

  void _showRejectDialog(String ownerId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: VSPColors.surface,
        title: const Text('Reject Verification Request', style: TextStyle(color: VSPColors.textPrimary)),
        content: TextField(
          controller: _rejectionReasonController,
          decoration: const InputDecoration(labelText: 'Reason for Rejection'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: VSPColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: VSPColors.error, foregroundColor: Colors.white),
            onPressed: () async {
              final ok = await _adminService.rejectOwner(
                ownerId: ownerId,
                reason: _rejectionReasonController.text.trim(),
              );
              if (ctx.mounted) Navigator.pop(ctx);
              if (mounted) {
                if (ok) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('تم رفض طلب التوثيق.'),
                      backgroundColor: Colors.orange,
                    ),
                  );
                  _loadPendingOwners();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('❌ فشل تنفيذ عملية الرفض.'),
                      backgroundColor: VSPColors.error,
                    ),
                  );
                }
              }
            },
            child: const Text('Confirm Rejection'),
          ),
        ],
      ),
    );
  }
}

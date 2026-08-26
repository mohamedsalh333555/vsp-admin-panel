import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/vsp_colors.dart';
import '../../core/providers/locale_provider.dart';

class AdminHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget? action;

  const AdminHeader({
    super.key,
    required this.title,
    required this.subtitle,
    this.action,
  });

  void _openDrawer(BuildContext context) {
    ScaffoldState? targetScaffold;
    context.visitAncestorElements((element) {
      if (element.widget is Scaffold) {
        final state = (element as StatefulElement).state as ScaffoldState;
        if (state.hasDrawer) {
          targetScaffold = state;
          return false;
        }
      }
      return true;
    });

    if (targetScaffold != null) {
      targetScaffold!.openDrawer();
    } else {
      try {
        Scaffold.of(context).openDrawer();
      } catch (_) {}
    }
  }

  @override
  Widget build(BuildContext context) {
    final localeProv = context.watch<LocaleProvider>();

    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 900;

        return Container(
          padding: EdgeInsets.symmetric(
            horizontal: isCompact ? 14 : 24,
            vertical: isCompact ? 12 : 18,
          ),
          decoration: const BoxDecoration(
            color: VSPColors.surface,
            border: Border(bottom: BorderSide(color: VSPColors.divider, width: 1)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (isCompact) ...[
                    IconButton(
                      icon: const Icon(Icons.menu, color: VSPColors.accent),
                      onPressed: () => _openDrawer(context),
                    ),
                    const SizedBox(width: 4),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: isCompact ? 16 : 22,
                            fontWeight: FontWeight.bold,
                            color: VSPColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          subtitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: isCompact ? 11 : 13,
                            color: VSPColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (!isCompact) ...[
                    const SizedBox(width: 12),
                    OutlinedButton.icon(
                      onPressed: () => localeProv.toggleLocale(),
                      icon: const Icon(Icons.language, color: VSPColors.accent, size: 16),
                      label: Text(
                        localeProv.translate('lang_button'),
                        style: const TextStyle(color: VSPColors.accent, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: VSPColors.glassBorderAccent),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      ),
                    ),
                    if (action != null) ...[
                      const SizedBox(width: 12),
                      action!,
                    ],
                  ],
                ],
              ),
              if (isCompact) ...[
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => localeProv.toggleLocale(),
                      icon: const Icon(Icons.language, color: VSPColors.accent, size: 14),
                      label: Text(
                        localeProv.translate('lang_button'),
                        style: const TextStyle(color: VSPColors.accent, fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: VSPColors.glassBorderAccent),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      ),
                    ),
                    if (action != null) action!,
                  ],
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

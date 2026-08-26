import 'package:flutter/material.dart';
import '../../core/theme/vsp_colors.dart';
import 'admin_sidebar.dart';

class AdminLayout extends StatelessWidget {
  final Widget child;
  final String currentRoute;

  const AdminLayout({
    super.key,
    required this.child,
    required this.currentRoute,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= 900;

        return Scaffold(
          backgroundColor: VSPColors.background,
          drawer: isDesktop
              ? null
              : Drawer(
                  backgroundColor: VSPColors.surface,
                  child: AdminSidebar(currentRoute: currentRoute),
                ),
          body: Row(
            children: [
              if (isDesktop) ...[
                AdminSidebar(currentRoute: currentRoute),
                const VerticalDivider(color: VSPColors.divider, width: 1),
              ],
              Expanded(
                child: child,
              ),
            ],
          ),
        );
      },
    );
  }
}

import 'package:go_router/go_router.dart';
import '../../shared/widgets/admin_layout.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/pending_approval_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/owner_audits/owner_audits_screen.dart';
import '../../features/users/users_moderation_screen.dart';
import '../../features/tournaments/tournament_control_screen.dart';
import '../../features/disputes/disputes_screen.dart';
import '../../features/league_1v1/league_1v1_screen.dart';
import '../../features/settings/system_settings_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/dashboard',
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/pending-approval',
      builder: (context, state) => const PendingApprovalScreen(),
    ),
    ShellRoute(
      builder: (context, state, child) {
        return AdminLayout(
          currentRoute: state.uri.path,
          child: child,
        );
      },
      routes: [
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardScreen(),
        ),
        GoRoute(
          path: '/owner-audits',
          builder: (context, state) => const OwnerAuditsScreen(),
        ),
        GoRoute(
          path: '/users',
          builder: (context, state) => const UsersModerationScreen(),
        ),
        GoRoute(
          path: '/tournaments',
          builder: (context, state) => const TournamentControlScreen(),
        ),
        GoRoute(
          path: '/disputes',
          builder: (context, state) => const DisputesScreen(),
        ),
        GoRoute(
          path: '/league-1v1',
          builder: (context, state) => const League1v1Screen(),
        ),
        GoRoute(
          path: '/settings',
          builder: (context, state) => const SystemSettingsScreen(),
        ),
      ],
    ),
  ],
);

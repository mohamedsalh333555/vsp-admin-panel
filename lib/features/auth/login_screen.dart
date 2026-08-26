import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/vsp_colors.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/locale_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isSignUpMode = false;

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final localeProv = context.watch<LocaleProvider>();

    return Scaffold(
      backgroundColor: VSPColors.background,
      body: Center(
        child: Container(
          width: 440,
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: VSPColors.surface,
            borderRadius: BorderRadius.circular(VSPRadius.md),
            border: Border.all(color: VSPColors.glassBorderAccent, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: VSPColors.accent.withValues(alpha: 0.1),
                blurRadius: 30,
                spreadRadius: 5,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Logo
              Center(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: VSPColors.accent,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.sports_soccer, size: 36, color: Colors.black),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                _isSignUpMode ? localeProv.translate('register_title') : localeProv.translate('login_title'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: VSPColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _isSignUpMode ? localeProv.translate('register_sub') : localeProv.translate('login_sub'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: VSPColors.textSecondary),
              ),
              const SizedBox(height: 24),

              // Mode Tabs Switcher
              Container(
                decoration: BoxDecoration(
                  color: VSPColors.surfaceAlt,
                  borderRadius: BorderRadius.circular(VSPRadius.sm),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _isSignUpMode = false),
                        borderRadius: BorderRadius.circular(VSPRadius.sm),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: !_isSignUpMode ? VSPColors.accent : Colors.transparent,
                            borderRadius: BorderRadius.circular(VSPRadius.sm),
                          ),
                          child: Text(
                            localeProv.translate('tab_login'),
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: !_isSignUpMode ? Colors.black : VSPColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _isSignUpMode = true),
                        borderRadius: BorderRadius.circular(VSPRadius.sm),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _isSignUpMode ? VSPColors.accent : Colors.transparent,
                            borderRadius: BorderRadius.circular(VSPRadius.sm),
                          ),
                          child: Text(
                            localeProv.translate('tab_register'),
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: _isSignUpMode ? Colors.black : VSPColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              if (authProvider.errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: VSPColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(VSPRadius.sm),
                    border: Border.all(color: VSPColors.error),
                  ),
                  child: Text(
                    authProvider.errorMessage!,
                    style: const TextStyle(color: VSPColors.error, fontSize: 12),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Sign Up Name field
              if (_isSignUpMode) ...[
                TextField(
                  controller: _nameController,
                  decoration: InputDecoration(
                    labelText: localeProv.translate('full_name'),
                    prefixIcon: const Icon(Icons.person_outline, color: VSPColors.textSecondary),
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // Email Field
              TextField(
                controller: _emailController,
                decoration: InputDecoration(
                  labelText: localeProv.translate('email'),
                  prefixIcon: const Icon(Icons.email_outlined, color: VSPColors.textSecondary),
                ),
              ),
              const SizedBox(height: 14),

              // Sign Up Phone field
              if (_isSignUpMode) ...[
                TextField(
                  controller: _phoneController,
                  decoration: InputDecoration(
                    labelText: localeProv.translate('phone'),
                    prefixIcon: const Icon(Icons.phone_outlined, color: VSPColors.textSecondary),
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // Password Field
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: localeProv.translate('password'),
                  prefixIcon: const Icon(Icons.lock_outline, color: VSPColors.textSecondary),
                ),
              ),
              const SizedBox(height: 24),

              // Submit Button
              ElevatedButton(
                onPressed: authProvider.isLoading
                    ? null
                    : () async {
                        final email = _emailController.text.trim();
                        final password = _passwordController.text.trim();

                        if (_isSignUpMode) {
                          final name = _nameController.text.trim();
                          final phone = _phoneController.text.trim();
                          final ok = await authProvider.signUp(
                            name: name,
                            email: email,
                            phone: phone,
                            password: password,
                          );
                          if (ok && mounted) {
                            if (authProvider.isApproved) {
                              context.go('/dashboard');
                            } else {
                              context.go('/pending-approval');
                            }
                          }
                        } else {
                          final ok = await authProvider.signIn(email, password);
                          if (ok && mounted) {
                            if (authProvider.isApproved) {
                              context.go('/dashboard');
                            } else {
                              context.go('/pending-approval');
                            }
                          }
                        }
                      },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: VSPColors.accent,
                ),
                child: authProvider.isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                      )
                    : Text(
                        _isSignUpMode ? localeProv.translate('btn_register') : localeProv.translate('btn_login'),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

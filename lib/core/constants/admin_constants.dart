class AdminConstants {
  static const String supabaseUrl = 'https://mktqkddbcddrxjxabdua.supabase.co';
  static const String supabaseAnonKey = 'sb_publishable_I6UoUL32GmnFZcXQ5ioasA_WLgizloE';
  
  // Service role key passed by user or fallback
  static const String supabaseServiceRoleKey = '[YOUR_SERVICE_ROLE_KEY]';
  
  static String get activeApiKey {
    if (supabaseServiceRoleKey.isNotEmpty && !supabaseServiceRoleKey.contains('[YOUR_SERVICE_ROLE_KEY]')) {
      return supabaseServiceRoleKey;
    }
    return supabaseAnonKey;
  }
}

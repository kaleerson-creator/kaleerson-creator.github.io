// Creates window.SB (Supabase client) when config.js is filled in; otherwise SB stays null
// and pages fall back to offline behaviour.
(function () {
  var c = window.SITE_CONFIG || {};
  window.SB = null;
  if (c.supabaseUrl && c.supabaseKey && window.supabase) {
    window.SB = window.supabase.createClient(c.supabaseUrl, c.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' }
    });
  }
})();

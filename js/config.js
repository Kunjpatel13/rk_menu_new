/*
  1. Create a Supabase project.
  2. Copy Project URL and anon/public key from Project Settings > API.
  3. Paste them below. The anon key is designed for browser use; protect data with RLS.
  NEVER put a service_role key in this file.
*/
window.RESTAURANT_CONFIG = {
  supabaseUrl: "https://nelbliauxuojewmxoqwc.supabase.co",
  supabaseAnonKey: "sb_publishable_Xo8682M5p3MXB3EF7JHa3g_i6A9Jgrt",
  currency: "INR",
  currencySymbol: "₹",
  defaultRestaurantName: "RK Food",
  defaultWhatsAppNumber: "919974285746"
};

window.db = null;
if (window.supabase && window.RESTAURANT_CONFIG.supabaseUrl.startsWith("https://") &&
  !window.RESTAURANT_CONFIG.supabaseUrl.includes("YOUR-PROJECT") &&
  !window.RESTAURANT_CONFIG.supabaseAnonKey.includes("YOUR_SUPABASE")) {
  window.db = window.supabase.createClient(
    window.RESTAURANT_CONFIG.supabaseUrl,
    window.RESTAURANT_CONFIG.supabaseAnonKey
  );
}

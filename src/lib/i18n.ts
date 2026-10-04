/**
 * Lightweight, dependency-free UI copy for English and Amharic.
 * Only user-facing interface strings live here; shop/product names and
 * other DB content stay as the merchant entered them.
 */
export const LANGUAGES = ["en", "am"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  am: "አማርኛ",
};

const en = {
  // Header
  nav_categories: "Categories",
  nav_shops: "Shops",
  nav_special_moments: "Special Moments",
  nav_offers: "Offers",
  nav_track_order: "Track order",
  search_placeholder: "Search for burgers, milk, pharmacy…",
  search_label: "Search የኔ Go",
  menu: "Menu",
  become_rider: "Become a rider",
  language: "Language",
  switch_language: "Switch language",

  // Account menu
  account: "Account",
  my_account: "My account",
  my_orders: "My orders",
  saved_products: "Saved products",
  addresses: "Addresses",
  notifications: "Notifications",
  rider_portal: "Rider portal",
  merchant_portal: "Merchant portal",
  admin_dashboard: "Admin dashboard",
  sign_out: "Sign out",
  login: "Login",
  sign_up: "Sign up",

  // Mobile tab bar
  tab_home: "Home",
  tab_shops: "Shops",
  tab_cart: "Cart",
  tab_orders: "Orders",
  tab_account: "Account",

  // Footer
  footer_explore: "Explore",
  footer_work: "Work with us",
  footer_contact: "Contact",
  footer_help: "Help & support",
  footer_rights: "All rights reserved.",
  footer_developed_by: "Developed by",

  // Home
  home_see_all: "See all",
  home_all: "All",
  home_view_all_in: "View all in",
  home_category: "category",
  home_feature_avg: "30 min average",
  home_feature_riders: "Local riders",
  home_feature_payments: "Verified payments",
  home_no_shops: "No shops in this category yet — try another one.",
  home_moments_title: "Make every moment count.",
  home_moments_subtitle: "Gifts, surprises, catering and decoration — arranged from one place.",
  home_explore_moments: "Explore Special Moments",
  home_quick_filter: "Quick category filter",
};

const am: typeof en = {
  // Header
  nav_categories: "ምድቦች",
  nav_shops: "መሸጫዎች",
  nav_special_moments: "ልዩ ጊዜዎች",
  nav_offers: "ቅናሾች",
  nav_track_order: "ትዕዛዝ ይከታተሉ",
  search_placeholder: "በርገር፣ ወተት፣ ፋርማሲ… ይፈልጉ",
  search_label: "የኔ Go ይፈልጉ",
  menu: "ምናሌ",
  become_rider: "ራይደር ይሁኑ",
  language: "ቋንቋ",
  switch_language: "ቋንቋ ይቀይሩ",

  // Account menu
  account: "መዝገብ",
  my_account: "የእኔ መዝገብ",
  my_orders: "የእኔ ትዕዛዞች",
  saved_products: "የተቀመጡ ምርቶች",
  addresses: "አድራሻዎች",
  notifications: "ማሳወቂያዎች",
  rider_portal: "የራይደር ፖርታል",
  merchant_portal: "የነጋዴ ፖርታል",
  admin_dashboard: "የአስተዳዳሪ ዳሽቦርድ",
  sign_out: "ውጣ",
  login: "ግባ",
  sign_up: "ይመዝገቡ",

  // Mobile tab bar
  tab_home: "መነሻ",
  tab_shops: "መሸጫዎች",
  tab_cart: "ጋሪ",
  tab_orders: "ትዕዛዞች",
  tab_account: "መዝገብ",

  // Footer
  footer_explore: "ያስሱ",
  footer_work: "ከእኛ ጋር ይስሩ",
  footer_contact: "አግኙን",
  footer_help: "እርዳታ እና ድጋፍ",
  footer_rights: "መብቱ በህግ የተጠበቀ ነው።",
  footer_developed_by: "የተሰራው በ",

  // Home
  home_see_all: "ሁሉንም ይመልከቱ",
  home_all: "ሁሉም",
  home_view_all_in: "ሁሉንም ይመልከቱ በ",
  home_category: "ምድብ",
  home_feature_avg: "በአማካይ 30 ደቂቃ",
  home_feature_riders: "የአካባቢ ራይደሮች",
  home_feature_payments: "የተረጋገጡ ክፍያዎች",
  home_no_shops: "በዚህ ምድብ ውስጥ እስካሁን መሸጫ የለም — ሌላ ይሞክሩ።",
  home_moments_title: "እያንዳንዱን ጊዜ ትርጉም ይስጡት።",
  home_moments_subtitle: "ስጦታዎች፣ አስገራሚ ነገሮች፣ ኬተሪንግ እና ማስዋብ — ከአንድ ቦታ።",
  home_explore_moments: "ልዩ ጊዜዎችን ያስሱ",
  home_quick_filter: "ፈጣን የምድብ ማጣሪያ",
};

export const translations: Record<Language, typeof en> = { en, am };
export type TranslationKey = keyof typeof en;

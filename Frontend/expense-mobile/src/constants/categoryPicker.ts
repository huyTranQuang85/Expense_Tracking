// key
const LEGACY_ICON_ITEMS = [
  { key: "bank", icon: "🏦" },
  { key: "money", icon: "💰" },
  { key: "wallet", icon: "👛" },
  { key: "shopping-cart", icon: "🛒" },
  { key: "hospital", icon: "🏥" },
  { key: "music", icon: "🎵" },
  { key: "football", icon: "⚽" },
  { key: "economics", icon: "📈" },
  { key: "travel", icon: "✈️" },
  { key: "motorcycle", icon: "🏍️" },
  { key: "bibimbap", icon: "🍜" },
  { key: "resume", icon: "💼" },
];

//Web preset
const PRESET_ICONS = [
  "🍽️",
  "🚗",
  "🛍️",
  "🏠",
  "⚡",
  "💊",
  "🎮",
  "📚",
  "✈️",
  "🎬",
  "💰",
  "💼",
  "📈",
  "🏆",
  "🎁",
  "💻",
  "🔧",
  "🎨",
  "🏃",
  "☕",
  "🍴",
  "🛒",
  "⛽",
  "🚌",
  "🚕",
  "🏥",
  "⚽",
  "🎵",
  "📱",
  "🌮",
];

// (Tuỳ chọn) normalize để tránh Android fail với FE0F
const normalizeEmoji = (s: string) => s.replace(/\uFE0F/g, "");

// tạo items cho preset (key chỉ để render list; khi lưu mình sẽ lưu emoji)
const PRESET_ICON_ITEMS = PRESET_ICONS.map((icon, idx) => ({
  key: `emoji_${idx}`,
  icon,
}));

// merge + dedupe theo icon
const merged = [...LEGACY_ICON_ITEMS, ...PRESET_ICON_ITEMS];
const seen = new Set<string>();
export const CATEGORY_ICONS = merged.filter((it) => {
  const e = normalizeEmoji(it.icon);
  if (seen.has(e)) return false;
  seen.add(e);
  return true;
});

// map key -> emoji
export const ICON_BY_KEY: Record<string, string> = CATEGORY_ICONS.reduce(
  (acc, it) => {
    acc[it.key] = normalizeEmoji(it.icon);
    return acc;
  },
  {} as Record<string, string>
);

export const CATEGORY_COLORS = [
  "#FF3B30",
  "#1F7A6B",
  "#5B4BDB",
  "#2B0057",
  "#C97A1E",
  "#D8A6FF",
  "#9B5B57",
  "#0A4FB5",

  "#3ED0C5",
  "#E6DCC7",
  "#D7C74E",
  "#9AA14B",
  "#22C55E",
  "#F97316",
  "#EC4899",
  "#64748B",
];
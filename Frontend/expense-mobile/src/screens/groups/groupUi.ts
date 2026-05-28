import { StyleSheet } from "react-native";

export const GREEN = "#4EECA5";
export const LIGHT_ACCENT = "#0F766E";
export const LIGHT_ACCENT_SOFT = "#E6F4EF";
export const LIGHT_ACCENT_TEXT = "#064E3B";
export const INCOME_BG = "rgba(78,236,165,0.45)";
export const EXPENSE_BG = "rgba(252,165,165,0.55)";

export function getGroupUi(isDark: boolean) {
  return !isDark
    ? {
        bg: "#F3F5F7",
        card: "#FFFFFF",
        input: "#DADADA",
        text: "#111111",
        muted: "rgba(0,0,0,0.55)",
        border: "rgba(15,23,42,0.08)",
        soft: "rgba(15,23,42,0.04)",
        overlay: "rgba(2,6,23,0.45)",
        danger: "#EF4444",
        accent: LIGHT_ACCENT,
        accentSoft: LIGHT_ACCENT_SOFT,
        accentText: LIGHT_ACCENT_TEXT,
        iconBg: LIGHT_ACCENT_SOFT,
        iconColor: LIGHT_ACCENT,
      }
    : {
        bg: "#020617",
        card: "rgba(15,23,42,0.96)",
        input: "rgba(30,41,59,0.9)",
        text: "rgba(248,250,252,0.96)",
        muted: "rgba(148,163,184,0.95)",
        border: "rgba(148,163,184,0.35)",
        soft: "rgba(148,163,184,0.12)",
        overlay: "rgba(2,6,23,0.72)",
        danger: "#F97373",
        accent: GREEN,
        accentSoft: "rgba(78,236,165,0.18)",
        accentText: "#BBF7D0",
        iconBg: "rgba(78,236,165,0.13)",
        iconColor: GREEN,
      };
}

export function getShadow(isDark: boolean) {
  return isDark ? {} : commonStyles.shadow;
}

export function getErrMsg(e: any) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    "Có lỗi xảy ra"
  );
}

export const commonStyles = StyleSheet.create({
  root: {
    flex: 1,
  },

  page: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  h1: {
    marginTop: 8,
    fontFamily: "Faustina_700Bold",
    fontSize: 22,
  },

  h2: {
    marginTop: 4,
    fontFamily: "Faustina_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },

  card: {
    marginTop: 14,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },

  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontFamily: "Faustina_700Bold",
    fontSize: 15,
  },

  label: {
    marginTop: 12,
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
  },

  input: {
    marginTop: 8,
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: 1,
    fontFamily: "Faustina_500Medium",
    fontSize: 13.5,
  },

  textArea: {
    marginTop: 8,
    borderRadius: 12,
    minHeight: 110,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderWidth: 1,
    fontFamily: "Faustina_500Medium",
    fontSize: 13.5,
  },

  primaryBtn: {
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  primaryBtnText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
    color: "#063B2B",
  },

  secondaryBtn: {
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryBtnText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
  },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});

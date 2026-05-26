// src/components/chatbot/ChatbotModal.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import {
  askChatbot,
  getChatSession,
  listChatSessions,
} from "../../services/chatbot";
import { fetchMe, Me } from "../../services/profile";
import { useTheme } from "../../theme/ThemeContext";
import TypingDots from "./TypingDots";

type Sender = "user" | "assistant" | "system";

type UiMessage = {
  id?: string;
  sender: Sender;
  content: string;
  created_at?: string;

  _tempId?: string;
  _pending?: boolean;
  _typing?: boolean;
  _display?: string;
};

type Props = { visible: boolean; onClose: () => void };

const SUGGESTIONS: string[] = [
  "Tháng này chi tiêu bao nhiêu",
  "Tháng này thu nhập bao nhiêu",
  "Tháng này chi bao nhiêu cho danh mục 'Ăn uống'",
  "Top 3 giao dịch chi tiêu lớn nhất tháng này",
];

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

function nowIso() {
  return new Date().toISOString();
}
function makeTempId() {
  return `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeAvatarUri(uri?: string | null) {
  if (!uri) return "";
  const u = String(uri);
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return `${API_BASE_URL}${u}`;
  return u;
}

export default function ChatbotModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const palette = useMemo(() => {
    const headerGradient: [string, string, string] = isDark
      ? ["#064E3B", "#047857", "#16A34A"]
      : ["#22C55E", "#16A34A", "#0F766E"];

    return {
      backdrop: "rgba(15,23,42,0.55)",
      panelBg: isDark ? "#020617" : "#FFFFFF",
      panelBorder: isDark ? "rgba(148,163,184,0.45)" : "rgba(15,23,42,0.08)",
      bodyBg: isDark ? "#020617" : "#F5F7FB",
      divider: isDark ? "rgba(30,41,59,1)" : "rgba(226,232,240,0.9)",
      chipBg: isDark ? "rgba(15,23,42,0.95)" : "#FFFFFF",
      chipBorder: isDark ? "rgba(148,163,184,0.45)" : "rgba(15,23,42,0.08)",
      chipActiveBg: "rgba(52,211,153,0.16)",
      chipActiveBorder: "rgba(52,211,153,0.45)",
      text: isDark ? "#E5E7EB" : "#111827",
      textSub: isDark ? "#9CA3AF" : "#64748B",
      textMuted: isDark ? "#6B7280" : "#98A2B3",
      botBubbleBg: isDark ? "rgba(15,23,42,0.96)" : "#FFFFFF",
      botBubbleBorder: isDark ? "rgba(148,163,184,0.5)" : "#E5E7EB",
      userBubbleBg: isDark ? "#16A34A" : "#0F766E",
      headerGradient,
      headerLogoBg: "rgba(34,197,94,1)",
      headerSubText: "rgba(226,232,240,0.95)",
      suggestBg: isDark ? "rgba(15,23,42,0.98)" : "rgba(249,250,251,1)",
      suggestBorder: isDark ? "rgba(31,41,55,1)" : "rgba(226,232,240,1)",
      suggestPillBg: isDark ? "rgba(15,118,110,0.75)" : "#0F766E",
      inputBg: isDark ? "rgba(15,23,42,0.95)" : "#F2F4F7",
      inputBorder: isDark ? "rgba(148,163,184,0.5)" : "rgba(15,23,42,0.12)",
    };
  }, [isDark]);

  const listRef = useRef<FlatList<UiMessage>>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);

  const [me, setMe] = useState<Me | null>(null);

  const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoadedRef = useRef(false);

  const userAvatar = useMemo(() => {
    const raw =
      (me as any)?.avatar_url ??
      (me as any)?.avatarUrl ??
      (me as any)?.avatar ??
      null;
    return normalizeAvatarUri(raw);
  }, [me]);

  const userInitial = useMemo(() => {
    const src =
      (me as any)?.user_name ??
      (me as any)?.fullName ??
      (me as any)?.email ??
      "";
    return src ? (String(src).trim()[0]?.toUpperCase() ?? "U") : "U";
  }, [me]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true }),
    );
  }, []);

  const clearTypewriter = useCallback(() => {
    if (typeTimerRef.current) {
      clearInterval(typeTimerRef.current);
      typeTimerRef.current = null;
    }
  }, []);

  const runTypewriter = useCallback(
    (fullText: string, msgTempId: string) => {
      clearTypewriter();
      let i = 0;
      const speed = fullText.length > 280 ? 8 : 14;

      typeTimerRef.current = setInterval(() => {
        i += 1;
        setMessages((prev) =>
          prev.map((m) =>
            m._tempId === msgTempId
              ? { ...m, _display: fullText.slice(0, i) }
              : m,
          ),
        );
        if (i >= fullText.length) clearTypewriter();
      }, speed);
    },
    [clearTypewriter],
  );

  const seedWelcome = useCallback(() => {
    setMessages([
      {
        sender: "assistant",
        content:
          "Chào bạn! Mình là trợ lý tài chính của BudgetF. Hãy hỏi mình về chi tiêu, ví, danh mục… nhé 💸",
        _display:
          "Chào bạn! Mình là trợ lý tài chính của BudgetF. Hãy hỏi mình về chi tiêu, ví, danh mục… nhé 💸",
        created_at: nowIso(),
      },
    ]);
  }, []);

  const loadLatestSession = useCallback(async () => {
    setLoading(true);
    try {
      const sessions = await listChatSessions();
      const latest = sessions?.[0];

      if (!latest?.id) {
        setSessionId(null);
        seedWelcome();
        return;
      }

      setSessionId(latest.id);
      const detail = await getChatSession(latest.id);

      const msgs: UiMessage[] = (detail.messages ?? []).map((m: any) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        created_at: m.created_at ?? nowIso(),
        _display: m.content,
      }));

      if (msgs.length === 0) seedWelcome();
      else setMessages(msgs);
    } catch (e: any) {
      seedWelcome();
      Alert.alert("Lỗi", e?.message ?? "Không tải được lịch sử chat.");
    } finally {
      setLoading(false);
      setTimeout(scrollToEnd, 50);
    }
  }, [scrollToEnd, seedWelcome]);

  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();

      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;

        // Tải song song: profile (avatar) + session chat mới nhất
        (async () => {
          try {
            const [meRes] = await Promise.all([fetchMe().catch(() => null)]);
            if (meRes) setMe(meRes);
          } catch {
            // ignore avatar error
          } finally {
            loadLatestSession();
          }
        })();
      } else {
        setTimeout(scrollToEnd, 50);
      }
    } else {
      clearTypewriter();
    }
  }, [visible, clearTypewriter, loadLatestSession, scrollToEnd]);

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  const startNewChat = () => {
    setSessionId(null);
    seedWelcome();
    setTimeout(scrollToEnd, 50);
  };

  const appendTypingBubble = () => {
    const id = makeTempId();
    setMessages((prev) => [
      ...prev,
      {
        _tempId: id,
        sender: "assistant",
        content: "",
        _typing: true,
        created_at: nowIso(),
      },
    ]);
    setTimeout(scrollToEnd, 10);
    return id;
  };

  const removeTypingBubble = (typingId: string) => {
    setMessages((prev) => prev.filter((m) => m._tempId !== typingId));
  };

  const handleSuggestionClick = (s: string) => {
    setText(s);
    setTimeout(() => {
      send(s);
    }, 0);
  };

  const send = useCallback(
    async (overrideText?: string) => {
      const question = (overrideText ?? text).trim();
      if (!question || sending) return;

      Keyboard.dismiss();
      setText("");

      const userId = makeTempId();
      setMessages((prev) => [
        ...prev,
        {
          _tempId: userId,
          sender: "user",
          content: question,
          _display: question,
          _pending: true,
          created_at: nowIso(),
        },
      ]);
      setTimeout(scrollToEnd, 10);

      setSending(true);
      const typingId = appendTypingBubble();

      try {
        const res = await askChatbot({ message: question, sessionId });
        if (res.sessionId && res.sessionId !== sessionId)
          setSessionId(res.sessionId);

        setMessages((prev) =>
          prev.map((m) =>
            m._tempId === userId ? { ...m, _pending: false } : m,
          ),
        );

        removeTypingBubble(typingId);

        const reply =
          res.reply || "Mình chưa nhận được câu trả lời từ máy chủ.";
        const botId = makeTempId();

        setMessages((prev) => [
          ...prev,
          {
            _tempId: botId,
            sender: "assistant",
            content: reply,
            _display: "",
            created_at: nowIso(),
          },
        ]);
        setTimeout(scrollToEnd, 10);

        runTypewriter(reply, botId);
      } catch (e: any) {
        removeTypingBubble(typingId);
        setMessages((prev) =>
          prev.map((m) =>
            m._tempId === userId ? { ...m, _pending: false } : m,
          ),
        );
        Alert.alert("Lỗi", e?.message ?? "Không gửi được tin nhắn.");
      } finally {
        setSending(false);
      }
    },
    [runTypewriter, scrollToEnd, sending, sessionId, text],
  );

  const headerPadTop = useMemo(
    () => Math.max(10, insets.top * 0.25),
    [insets.top],
  );

  /** Avatars */
  const BotAvatar = () => (
    <View style={styles.avatarWrapBot}>
      <LinearGradient
        colors={["#22C55E", "#16A34A", "#0F766E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatarGradient}
      >
        <Text style={styles.avatarBotText}>BF</Text>
      </LinearGradient>
    </View>
  );

  const UserAvatar = () => {
    if (userAvatar) {
      return (
        <View style={styles.avatarWrapUser}>
          <Image source={{ uri: userAvatar }} style={styles.avatarImg} />
        </View>
      );
    }
    return (
      <View style={styles.avatarWrapUser}>
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>{userInitial}</Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: UiMessage }) => {
    const isUser = item.sender === "user";

    if (item._typing) {
      return (
        <View style={[styles.row, styles.rowLeft]}>
          <BotAvatar />
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: palette.botBubbleBg,
                borderColor: palette.botBubbleBorder,
              },
            ]}
          >
            <TypingDots />
          </View>
        </View>
      );
    }

    const shown = item._display ?? item.content;

    if (isUser) {
      return (
        <View style={[styles.row, styles.rowRight]}>
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: palette.userBubbleBg,
                borderColor: "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.msgText,
                {
                  color: "#F9FAFB",
                  fontFamily: "Faustina_600SemiBold",
                },
              ]}
            >
              {shown}
            </Text>
          </View>
          <UserAvatar />
        </View>
      );
    }

    // assistant / system -> hiển thị như bot
    return (
      <View style={[styles.row, styles.rowLeft]}>
        <BotAvatar />
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: palette.botBubbleBg,
              borderColor: palette.botBubbleBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.msgText,
              {
                color: palette.text,
                fontFamily: "Faustina_400Regular",
              },
            ]}
          >
            {shown}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: palette.backdrop }]}
        onPress={close}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
      >
        <View
          style={[
            styles.panel,
            {
              paddingBottom: 12 + insets.bottom,
              backgroundColor: palette.panelBg,
              borderColor: palette.panelBorder,
            },
          ]}
        >
          {/* HEADER */}
          <LinearGradient
            colors={palette.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.header, { paddingTop: headerPadTop }]}
          >
            <View
              style={[
                styles.logoBox,
                {
                  backgroundColor: palette.headerLogoBg,
                  borderColor: "rgba(248,250,252,0.35)",
                },
              ]}
            >
              <Text style={styles.logoText}>BF</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>BudgetF Chatbot</Text>
              <Text
                style={[styles.headerSub, { color: palette.headerSubText }]}
              >
                Hỏi nhanh về chi tiêu, ví, danh mục…
              </Text>
            </View>

            <Pressable
              onPress={startNewChat}
              style={({ pressed }) => [
                styles.headerPill,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={styles.headerPillText}>Mới</Text>
            </Pressable>

            <Pressable onPress={close} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </LinearGradient>

          {/* SUGGESTIONS */}
          <View
            style={[
              styles.suggestBox,
              {
                backgroundColor: palette.suggestBg,
                borderBottomColor: palette.suggestBorder,
              },
            ]}
          >
            <View style={styles.suggestHeader}>
              <View style={styles.suggestTitleRow}>
                <Text style={styles.sparkle}>✦</Text>
                <Text style={[styles.suggestTitle, { color: palette.textSub }]}>
                  Bạn có thể hỏi:
                </Text>
              </View>

              <Pressable
                onPress={() => setShowSuggestions((p) => !p)}
                style={({ pressed }) => [
                  styles.chevBtn,
                  {
                    borderColor: palette.panelBorder,
                    backgroundColor: isDark
                      ? "rgba(15,23,42,0.8)"
                      : "rgba(226,232,240,0.8)",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.chevText, { color: palette.text }]}>
                  {showSuggestions ? "˄" : "˅"}
                </Text>
              </Pressable>
            </View>

            {showSuggestions ? (
              <View style={styles.suggestList}>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => handleSuggestionClick(s)}
                    style={({ pressed }) => [
                      styles.suggestPill,
                      {
                        backgroundColor: palette.suggestPillBg,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.suggestPillText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {/* BODY */}
          <View style={[styles.body, { backgroundColor: palette.bodyBg }]}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator />
                <Text style={[styles.loadingText, { color: palette.textSub }]}>
                  Đang tải hội thoại…
                </Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item, idx) =>
                  item.id ?? item._tempId ?? String(idx)
                }
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={scrollToEnd}
              />
            )}
          </View>

          {/* INPUT */}
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: palette.panelBg,
                borderTopColor: palette.panelBorder,
              },
            ]}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Nhập câu hỏi của bạn..."
              placeholderTextColor={palette.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: palette.inputBg,
                  borderColor: palette.inputBorder,
                  color: palette.text,
                },
              ]}
              returnKeyType="send"
              onSubmitEditing={() => send()}
              multiline
            />

            <Pressable
              onPress={() => send()}
              disabled={!text.trim() || sending}
              style={({ pressed }) => [
                styles.sendBtnWrap,
                (!text.trim() || sending) && { opacity: 0.5 },
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
            >
              <LinearGradient
                colors={palette.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendBtn}
              >
                <Text style={styles.sendBtnText}>Gửi</Text>
                <Text style={styles.sendArrow}>➤</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  wrap: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    top: 80,
  },
  panel: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },

  /** HEADER */
  header: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#F9FAFB",
    fontWeight: "900",
    fontSize: 13,
  },
  headerTitle: {
    color: "#F9FAFB",
    fontWeight: "900",
    fontSize: 16,
    fontFamily: "Faustina_700Bold",
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Faustina_400Regular",
  },
  headerPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.6)",
    backgroundColor: "rgba(15,23,42,0.16)",
  },
  headerPillText: {
    color: "#F9FAFB",
    fontWeight: "700",
    fontSize: 12,
    fontFamily: "Faustina_600SemiBold",
  },
  closeBtn: {
    marginLeft: 8,
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.5)",
    backgroundColor: "rgba(15,23,42,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    color: "#F9FAFB",
    fontWeight: "900",
    fontSize: 13,
  },

  /** SUGGESTIONS */
  suggestBox: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  suggestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  suggestTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sparkle: {
    color: "#FACC15",
    fontWeight: "900",
  },
  suggestTitle: {
    fontWeight: "700",
    fontSize: 12,
    fontFamily: "Faustina_500Medium",
  },
  chevBtn: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chevText: {
    fontWeight: "900",
    fontSize: 14,
  },
  suggestList: {
    marginTop: 10,
    gap: 8,
  },
  suggestPill: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestPillText: {
    color: "#F9FAFB",
    fontWeight: "600",
    fontSize: 13,
    fontFamily: "Faustina_500Medium",
  },

  /** BODY */
  body: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },

  /** Avatars */
  avatarWrapBot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 8,
  },
  avatarWrapUser: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    marginLeft: 8,
  },
  avatarGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBotText: {
    color: "#ECFEFF",
    fontWeight: "900",
    fontSize: 13,
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    flex: 1,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#E0F2FE",
    fontWeight: "800",
    fontSize: 13,
  },

  bubble: {
    maxWidth: "70%",
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },

  /** INPUT */
  inputRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Faustina_400Regular",
  },
  sendBtnWrap: {
    height: 44,
    borderRadius: 999,
    overflow: "hidden",
  },
  sendBtn: {
    flex: 1,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  sendBtnText: {
    color: "#F9FAFB",
    fontWeight: "800",
    fontSize: 13,
    fontFamily: "Faustina_600SemiBold",
  },
  sendArrow: {
    color: "#F9FAFB",
    fontWeight: "900",
    fontSize: 13,
  },
});

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
  ChatActionChoice,
  ChatbotMeta,
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
  _actions?: ChatActionChoice[];
  _note?: string | null;
  _meta?: ChatbotMeta | null;
  _actionsLabel?: string | null;
};

type Props = { visible: boolean; onClose: () => void };

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";
const QUOTA_DEFAULT_COOLDOWN_SECONDS = 60;

const DEFAULT_ACTIONS: ChatActionChoice[] = [
  { label: "Tháng này chi tiêu bao nhiêu", value: "Tháng này chi tiêu bao nhiêu" },
  { label: "Tháng này thu nhập bao nhiêu", value: "Tháng này thu nhập bao nhiêu" },
  {
    label: "Tháng này chi bao nhiêu cho danh mục 'Ăn uống'",
    value: "Tháng này chi bao nhiêu cho danh mục 'Ăn uống'",
  },
  {
    label: "Top 3 giao dịch chi tiêu lớn nhất tháng này",
    value: "Top 3 giao dịch chi tiêu lớn nhất tháng này",
  },
  { label: "Tạo danh mục chi tiêu 'Đi lại'", value: "Tạo danh mục chi tiêu 'Đi lại'" },
  { label: "Thêm chi tiêu 50 nghìn ăn uống", value: "Thêm chi tiêu 50000 ăn uống" },
  { label: "Thêm thu nhập 2 triệu vào ví Momo", value: "Thêm thu nhập 2 triệu vào ví Momo" },
  { label: "Tạo ví mới tên Tiết kiệm", value: "Tạo ví mới tên Tiết kiệm" },
  { label: "Nhận xét budget tháng này", value: "Nhận xét budget tháng này" },
  { label: "Nhận xét ví hiện tại", value: "Nhận xét ví hiện tại" },
  { label: "Đề xuất ví phù hợp để nhận lương", value: "Đề xuất ví phù hợp để nhận lương" },
];

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

function normalizeActions(meta?: ChatbotMeta | null): {
  actions: ChatActionChoice[];
  label: string | null;
} {
  const result = { actions: [] as ChatActionChoice[], label: null as string | null };
  const seen = new Set<string>();

  // Ưu tiên choices (lựa chọn bắt buộc) - có label riêng
  if (meta?.choices?.length) {
    result.label = meta.choicesLabel || "Chọn một lựa chọn:";
    for (const item of meta.choices) {
      const label = String(item?.label ?? item?.value ?? "").trim();
      const value = String(item?.value ?? item?.label ?? "").trim();
      if (!label || !value) continue;
      const key = `${label}::${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.actions.push({ label, value });
    }
  }

  // Thêm followUps (gợi ý tiếp theo)
  if (meta?.followUps?.length) {
    // Nếu đã có choices, thêm 1 separator text để báo hiệu
    for (const item of meta.followUps) {
      const label = String(item?.label ?? item?.value ?? "").trim();
      const value = String(item?.value ?? item?.label ?? "").trim();
      if (!label || !value) continue;
      const key = `${label}::${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.actions.push({ label, value });
    }
  }

  return result;
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
      text: isDark ? "#E5E7EB" : "#111827",
      textSub: isDark ? "#9CA3AF" : "#64748B",
      textMuted: isDark ? "#6B7280" : "#98A2B3",
      botBubbleBg: isDark ? "rgba(15,23,42,0.96)" : "#FFFFFF",
      botBubbleBorder: isDark ? "rgba(148,163,184,0.5)" : "#E5E7EB",
      userBubbleBg: isDark ? "#16A34A" : "#0F766E",
      headerGradient,
      headerLogoBg: "rgba(34,197,94,1)",
      headerSubText: "rgba(226,232,240,0.95)",
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
  const [quotaCooldownUntil, setQuotaCooldownUntil] = useState<number | null>(null);
  const [quotaCooldownLeft, setQuotaCooldownLeft] = useState(0);

  const [me, setMe] = useState<Me | null>(null);

  const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quotaTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const clearQuotaCooldown = useCallback(() => {
    if (quotaTimerRef.current) {
      clearInterval(quotaTimerRef.current);
      quotaTimerRef.current = null;
    }
    setQuotaCooldownUntil(null);
    setQuotaCooldownLeft(0);
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
        _actions: DEFAULT_ACTIONS,
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
    if (quotaCooldownUntil) {
      if (quotaTimerRef.current) clearInterval(quotaTimerRef.current);

      const tick = () => {
        const secondsLeft = Math.max(
          0,
          Math.ceil((quotaCooldownUntil - Date.now()) / 1000),
        );
        setQuotaCooldownLeft(secondsLeft);
        if (secondsLeft <= 0) clearQuotaCooldown();
      };

      tick();
      quotaTimerRef.current = setInterval(tick, 1000);

      return () => {
        if (quotaTimerRef.current) {
          clearInterval(quotaTimerRef.current);
          quotaTimerRef.current = null;
        }
      };
    }

    clearQuotaCooldown();
    return undefined;
  }, [clearQuotaCooldown, quotaCooldownUntil]);

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
      clearQuotaCooldown();
    }
  }, [visible, clearQuotaCooldown, clearTypewriter, loadLatestSession, scrollToEnd]);

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  const startNewChat = () => {
    clearQuotaCooldown();
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
      if (!question || sending || quotaCooldownLeft > 0) return;

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
        if (res.sessionId && res.sessionId !== sessionId) {
          setSessionId(res.sessionId);
        }

        setMessages((prev) =>
          prev.map((m) =>
            m._tempId === userId ? { ...m, _pending: false } : m,
          ),
        );

        removeTypingBubble(typingId);

        const reply =
          res.reply || "Mình chưa nhận được câu trả lời từ máy chủ.";
        const normalized = normalizeActions(res.meta);
        const note =
          res.meta?.note && !reply.includes(res.meta.note)
            ? res.meta.note
            : null;
        const botId = makeTempId();

        setMessages((prev) => [
          ...prev,
          {
            _tempId: botId,
            sender: "assistant",
            content: reply,
            _display: "",
            _actions: normalized.actions,
            _actionsLabel: normalized.label,
            _note: note,
            _meta: res.meta ?? null,
            created_at: nowIso(),
          },
        ]);
        setTimeout(scrollToEnd, 10);

        const cooldownSeconds = Number(
          res.retryAfterSeconds ?? res.meta?.retryAfterSeconds ?? 0,
        );
        if (res.quotaLimited) {
          const safeCooldown =
            Number.isFinite(cooldownSeconds) && cooldownSeconds > 0
              ? cooldownSeconds
              : QUOTA_DEFAULT_COOLDOWN_SECONDS;
          setQuotaCooldownUntil(Date.now() + safeCooldown * 1000);
        }

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
    [quotaCooldownLeft, runTypewriter, scrollToEnd, sending, sessionId, text],
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

    const actions =
      item._actions?.length
        ? item._actions
        : item.sender === "assistant" && messages.length === 1
          ? DEFAULT_ACTIONS
          : [];

    const isClarification = item._meta?.kind === "clarification";
    const clarificationLabel = item._meta?.pendingField
      ? ({
          wallet: "ví",
          category: "danh mục",
          amount: "số tiền",
          type: "loại giao dịch",
        } as const)[item._meta.pendingField] ?? item._meta.pendingField
      : item._meta?.field ?? null;
    const helperText = item._meta?.prompt || item._note || null;
    const actionsLabel = item._actionsLabel;

    return (
      <View style={styles.messageBlock}>
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
            {helperText ? (
              <Text
                style={[
                  styles.noteText,
                  {
                    color: palette.textSub,
                    marginTop: isClarification ? 8 : 6,
                    fontFamily: "Faustina_500Medium",
                  },
                ]}
              >
                {isClarification && clarificationLabel
                  ? `Đang chờ: ${clarificationLabel}. ${helperText}`
                  : helperText}
              </Text>
            ) : null}

            {/* Action chips INSIDE bubble with separator */}
            {actions.length > 0 ? (
              <>
                <View
                  style={[
                    styles.actionSeparator,
                    { backgroundColor: palette.divider },
                  ]}
                />
                {actionsLabel ? (
                  <Text
                    style={[
                      styles.actionsLabelText,
                      { color: palette.textSub },
                    ]}
                  >
                    {actionsLabel}
                  </Text>
                ) : null}
                <View style={styles.actionInlineWrap}>
                  {actions.map((action) => (
                    <Pressable
                      key={`${item._tempId ?? item.id ?? "action"}:${action.value}`}
                      onPress={() => handleSuggestionClick(action.value)}
                      style={({ pressed }) => [
                        styles.actionChip,
                        {
                          backgroundColor: palette.suggestPillBg,
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <Text style={styles.actionChipText}>{action.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </View>
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
              placeholder={
                quotaCooldownLeft > 0
                  ? `Đang chờ ${quotaCooldownLeft} giây...`
                  : "Nhập câu hỏi của bạn..."
              }
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
              editable={quotaCooldownLeft <= 0}
              multiline
            />

            <View style={{ alignItems: "flex-end", gap: 6 }}>
              {quotaCooldownLeft > 0 ? (
                <Text style={[styles.cooldownText, { color: palette.textSub }]}>
                  Tạm dừng gửi AI {quotaCooldownLeft}s
                </Text>
              ) : null}

              <Pressable
                onPress={() => send()}
                disabled={!text.trim() || sending || quotaCooldownLeft > 0}
                style={({ pressed }) => [
                  styles.sendBtnWrap,
                  (!text.trim() || sending || quotaCooldownLeft > 0) && {
                    opacity: 0.5,
                  },
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
  messageBlock: {
    gap: 8,
  },
  actionSeparator: {
    height: 1,
    marginTop: 8,
    marginBottom: 6,
    opacity: 0.5,
  },
  actionInlineWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  actionsLabelText: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Faustina_600SemiBold",
  },
  actionWrap: {
    marginLeft: 40,
    marginRight: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionChip: {
    maxWidth: "100%",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionChipText: {
    color: "#F9FAFB",
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Faustina_600SemiBold",
  },
  noteText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Faustina_400Regular",
  },

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
  cooldownText: {
    fontFamily: "Faustina_500Medium",
    fontSize: 12,
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

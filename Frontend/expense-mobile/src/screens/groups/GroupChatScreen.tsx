import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";

import { useTheme } from "../../theme/ThemeContext";
import type { GroupStackParamList } from "../../app/GroupStack";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groupUi";
import { me } from "../../services/auth";
import {
  getGroupMessages,
  GroupMessage,
  sendGroupMessageRest,
} from "../../services/groupChat";
import {
  createGroupChatSocket,
  GroupChatSocket,
} from "../../services/groupChatSocket";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

function normalizeAvatarUri(uri?: string | null) {
  if (!uri) return "";
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  if (uri.startsWith("/")) return `${API_BASE_URL}${uri}`;
  return `${API_BASE_URL}/${uri}`;
}

function getInitial(name?: string | null) {
  const s = String(name || "").trim();
  return s ? s[0].toUpperCase() : "?";
}

function AvatarBubble({
  uri,
  name,
  size = 34,
  ui,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
  ui: any;
}) {
  const avatarUri = normalizeAvatarUri(uri);
  const [broken, setBroken] = useState(false);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: ui.input,
        },
      ]}
    >
      {avatarUri && !broken ? (
        <Image
          source={{ uri: avatarUri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          onError={(e) => {
            console.log("Avatar load error:", avatarUri, e.nativeEvent);
            setBroken(true);
          }}
        />
      ) : (
        <Text style={styles.avatarInitial}>{getInitial(name)}</Text>
      )}
    </View>
  );
}

type Rt = RouteProp<GroupStackParamList, "GroupChat">;

function getUserIdFromMe(user: any) {
  return (
    user?.id ||
    user?.userId ||
    user?.user_id ||
    user?.data?.id ||
    user?.data?.userId ||
    user?.data?.user_id ||
    null
  );
}

type TypingUser = {
  userId: string;
  userName?: string | null;
  avatarUrl?: string | null;
};

type OnlineUser = {
  userId: string;
  userName?: string | null;
  avatarUrl?: string | null;
};

export default function GroupChatScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, groupName } = route.params;

  const socketRef = useRef<GroupChatSocket | null>(null);
  const listRef = useRef<FlatList<GroupMessage>>(null);
  const typingTimerRef = useRef<any>(null);

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const loadMe = useCallback(async () => {
    try {
      const user = await me();
      const id = getUserIdFromMe(user);
      if (id) setMyUserId(String(id));
    } catch {
      // Không chặn chat nếu /me lỗi, chỉ không phân biệt được bubble của mình.
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const data = await getGroupMessages(groupId, { limit: 80 });
      setMessages(Array.isArray(data) ? data : []);

      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
      }, 150);
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const connectSocket = useCallback(async () => {
    try {
      setConnecting(true);

      const socket = await createGroupChatSocket();
      socketRef.current = socket;

      const joinRoom = () => {
        setConnecting(false);

        socket.emit("group:join", { groupId }, (res) => {
          if (res?.status === "error") {
            Toast.show({
              type: "error",
              text1: res.message || "Không thể tham gia phòng chat",
            });
          }
        });
      };

      socket.on("connect", joinRoom);

      // Socket.io có thể connect rất nhanh trước khi listener `connect` được đăng ký.
      // Nếu đã connected rồi thì join room ngay để không bị lỡ event presence/typing.
      if (socket.connected) {
        joinRoom();
      }

      socket.on("connect_error", (err) => {
        setConnecting(false);
        Toast.show({
          type: "error",
          text1: err.message || "Không kết nối được chat realtime",
        });
      });

      socket.on("group:message:new", (message) => {
        if (Number(message.groupId) !== Number(groupId)) return;

        setMessages((prev) => {
          const existed = prev.some((m) => m.id === message.id);
          if (existed) return prev;
          return [...prev, message];
        });

        setTypingUsers((prev) =>
          prev.filter((u) => String(u.userId) !== String(message.senderId)),
        );

        setTimeout(() => {
          listRef.current?.scrollToEnd({ animated: true });
        }, 80);
      });

      socket.on("group:typing", (data) => {
        if (Number(data.groupId) !== Number(groupId)) return;

        setTypingUsers((prev) => {
          const typingUserId = String(data.userId);

          if (myUserId && typingUserId === String(myUserId)) return prev;
          if (prev.some((u) => String(u.userId) === typingUserId)) return prev;

          return [
            ...prev,
            {
              userId: typingUserId,
              userName: data.userName || "Thành viên",
              avatarUrl: data.avatarUrl || null,
            },
          ];
        });
      });

      socket.on("group:stop_typing", (data) => {
        if (Number(data.groupId) !== Number(groupId)) return;

        setTypingUsers((prev) =>
          prev.filter((u) => String(u.userId) !== String(data.userId)),
        );
      });

      socket.on("group:presence:update", (data) => {
        if (Number(data.groupId) !== Number(groupId)) return;

        setOnlineCount(Number(data.onlineCount || 0));
        setOnlineUsers(
          Array.isArray(data.onlineUsers)
            ? data.onlineUsers.map((u) => ({
                userId: String(u.userId),
                userName: u.userName || null,
                avatarUrl: u.avatarUrl || null,
              }))
            : [],
        );
      });
    } catch (e) {
      setConnecting(false);
      Toast.show({ type: "error", text1: getErrMsg(e) });
    }
  }, [groupId, myUserId]);

  useFocusEffect(
    useCallback(() => {
      loadMe();
      loadMessages();
      connectSocket();

      return () => {
        const socket = socketRef.current;

        if (socket) {
          socket.emit("group:leave", { groupId });
          socket.disconnect();
        }

        socketRef.current = null;
        setTypingUsers([]);
        setOnlineCount(0);
        setOnlineUsers([]);
      };
    }, [connectSocket, groupId, loadMe, loadMessages]),
  );

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const onChangeText = (value: string) => {
    setContent(value);

    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    if (value.trim().length === 0) {
      socket.emit("group:stop_typing", { groupId });
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      return;
    }

    socket.emit("group:typing", { groupId });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    typingTimerRef.current = setTimeout(() => {
      socket.emit("group:stop_typing", { groupId });
    }, 1800);
  };

  const onSend = async () => {
    const clean = content.trim();
    if (!clean || sending) return;

    setContent("");
    setSending(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const socket = socketRef.current;

    if (socket && socket.connected) {
      socket.emit("group:message:send", { groupId, content: clean }, (res) => {
        setSending(false);

        if (res?.status === "error") {
          Toast.show({
            type: "error",
            text1: res.message || "Không gửi được tin nhắn",
          });
          setContent(clean);
        }
      });

      socket.emit("group:stop_typing", { groupId });
      return;
    }

    try {
      const message = await sendGroupMessageRest(groupId, { content: clean });
      setMessages((prev) => [...prev, message]);

      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 80);
    } catch (e) {
      setContent(clean);
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: GroupMessage }) => {
    const isSystem = item.messageType === "system";
    const isMine =
      !!myUserId &&
      !!item.senderId &&
      String(item.senderId) === String(myUserId);

    const senderName =
      item.senderName ||
      item.senderEmail ||
      (isSystem ? "Hệ thống" : "Thành viên");

    if (isSystem) {
      return (
        <View style={styles.systemWrap}>
          <Text style={[styles.systemText, { color: ui.muted }]}>
            {item.content}
          </Text>
        </View>
      );
    }

    if (isMine) {
      return (
        <View style={styles.myMessageRow}>
          <View style={[styles.myBubble]}>
            <Text style={styles.myMessageText}>{item.content}</Text>
            <Text style={styles.myTime}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.otherMessageRow}>
        <AvatarBubble uri={item.senderAvatarUrl} name={senderName} ui={ui} />

        <View
          style={[
            styles.otherBubble,
            { backgroundColor: ui.card, borderColor: ui.border },
            shadow,
          ]}
        >
          <Text style={[styles.sender, { color: ui.text }]} numberOfLines={1}>
            {senderName}
          </Text>
          <Text style={[styles.otherMessageText, { color: ui.text }]}>
            {item.content}
          </Text>
          <Text style={[styles.otherTime, { color: ui.muted }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const showTyping = typingUsers.length > 0;

  return (
    <KeyboardAvoidingView
      style={[commonStyles.root, { backgroundColor: ui.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ height: insets.top, backgroundColor: ui.bg }} />

      <View style={[styles.header, { borderBottomColor: ui.border }]}>
        <Pressable onPress={() => nav.goBack()} style={commonStyles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={ui.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text
            style={[styles.headerTitle, { color: ui.text }]}
            numberOfLines={1}
          >
            {groupName || "Chat nhóm"}
          </Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: connecting ? "#F59E0B" : GREEN },
              ]}
            />
            <Text style={[styles.headerSub, { color: ui.muted }]}>
              {connecting
                ? "Đang kết nối..."
                : onlineCount > 0
                  ? `${onlineCount} đang online`
                  : "Realtime chat"}
            </Text>
          </View>
        </View>

        <View style={[styles.headerIcon, { backgroundColor: ui.input }]}>
          <Ionicons name="chatbubbles-outline" size={19} color={GREEN} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GREEN} />
          <Text style={[styles.loadingText, { color: ui.muted }]}>
            Đang tải tin nhắn...
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 18,
            flexGrow: messages.length === 0 ? 1 : undefined,
          }}
          ListFooterComponent={null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View
                style={[styles.emptyIcon, { backgroundColor: ui.card }, shadow]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={52}
                  color={GREEN}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: ui.text }]}>
                Chưa có tin nhắn
              </Text>
              <Text style={[styles.emptyDesc, { color: ui.muted }]}>
                Gửi lời chào đầu tiên để bắt đầu cuộc trò chuyện nhóm.
              </Text>
            </View>
          }
          onContentSizeChange={() => {
            if (showTyping) {
              setTimeout(() => {
                listRef.current?.scrollToEnd({ animated: true });
              }, 60);
            }
          }}
        />
      )}

      {showTyping && (
        <View
          style={[
            styles.typingInlineBar,
            { backgroundColor: ui.bg, borderTopColor: ui.border },
          ]}
        >
          <AvatarBubble
            uri={typingUsers[0]?.avatarUrl}
            name={typingUsers[0]?.userName}
            size={24}
            ui={ui}
          />
          <TypingIndicator ui={ui} shadow={shadow} compact />
          <Text style={[styles.typingInlineText, { color: ui.muted }]}>
            {typingUsers.length === 1
              ? `${typingUsers[0].userName || "Thành viên"} đang nhập`
              : `${typingUsers.length} người đang nhập`}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: Math.max(insets.bottom, 10),
            backgroundColor: ui.bg,
            borderTopColor: ui.border,
          },
        ]}
      >
        <View
          style={[
            styles.inputWrap,
            { backgroundColor: ui.card, borderColor: ui.border },
            shadow,
          ]}
        >
          <TextInput
            value={content}
            onChangeText={onChangeText}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={ui.muted}
            multiline
            style={[styles.input, { color: ui.text }]}
          />

          <Pressable
            disabled={!content.trim() || sending}
            onPress={onSend}
            style={[
              styles.sendBtn,
              {
                backgroundColor: content.trim() ? GREEN : ui.input,
                opacity: sending ? 0.7 : 1,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#063B2B" />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={content.trim() ? "#063B2B" : ui.muted}
              />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function TypingIndicator({
  ui,
  shadow,
  compact = false,
}: {
  ui: any;
  shadow: any;
  compact?: boolean;
}) {
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;
  const dot3 = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const makeLoop = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.25,
            duration: 260,
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = makeLoop(dot1, 0);
    const a2 = makeLoop(dot2, 140);
    const a3 = makeLoop(dot3, 280);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={compact ? styles.typingCompactRow : styles.typingRow}>
      {!compact && <AvatarBubble name="Thành viên" ui={ui} />}

      <View
        style={[
          compact ? styles.typingCompactBubble : styles.typingBubble,
          { backgroundColor: ui.card, borderColor: ui.border },
          shadow,
        ]}
      >
        {[dot1, dot2, dot3].map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              styles.typingDot,
              {
                backgroundColor: ui.muted,
                opacity: dot,
                transform: [
                  {
                    translateY: dot.interpolate({
                      inputRange: [0.25, 1],
                      outputRange: [0, -4],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function formatTime(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontFamily: "Faustina_700Bold",
    fontSize: 18,
  },
  headerSub: {
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
  },
  statusRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontFamily: "Faustina_500Medium",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 86,
    height: 86,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 16,
    fontFamily: "Faustina_700Bold",
    fontSize: 20,
  },
  emptyDesc: {
    marginTop: 8,
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },

  myMessageRow: {
    alignItems: "flex-end",
    marginBottom: 12,
    paddingLeft: 56,
  },
  otherMessageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
    paddingRight: 56,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
    color: GREEN,
  },
  myBubble: {
    maxWidth: "82%",
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: GREEN,
  },
  otherBubble: {
    maxWidth: "82%",
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  sender: {
    fontFamily: "Faustina_700Bold",
    fontSize: 12.5,
    marginBottom: 2,
  },
  myMessageText: {
    fontFamily: "Faustina_400Regular",
    fontSize: 14,
    lineHeight: 19,
    color: "#063B2B",
  },
  otherMessageText: {
    fontFamily: "Faustina_400Regular",
    fontSize: 14,
    lineHeight: 19,
  },
  myTime: {
    marginTop: 5,
    alignSelf: "flex-end",
    fontFamily: "Faustina_400Regular",
    fontSize: 10.5,
    color: "rgba(6,59,43,0.72)",
  },
  otherTime: {
    marginTop: 5,
    alignSelf: "flex-end",
    fontFamily: "Faustina_400Regular",
    fontSize: 10.5,
  },
  systemWrap: {
    alignItems: "center",
    marginVertical: 8,
  },
  systemText: {
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
  },

  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
    paddingRight: 56,
  },
  typingBubble: {
    height: 38,
    minWidth: 66,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },

  typingInlineBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingInlineText: {
    fontFamily: "Faustina_500Medium",
    fontSize: 12.5,
  },
  typingCompactRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingCompactBubble: {
    height: 28,
    minWidth: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  inputBar: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  inputWrap: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    paddingVertical: 8,
    fontFamily: "Faustina_500Medium",
    fontSize: 14,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});

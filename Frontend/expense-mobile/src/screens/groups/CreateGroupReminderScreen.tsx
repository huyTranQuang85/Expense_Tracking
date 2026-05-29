import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import type { GroupStackParamList } from "../../app/GroupStack";
import { useTheme } from "../../theme/ThemeContext";
import { createGroupReminder } from "../../services/groupReminder";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groupUi";

type Rt = RouteProp<GroupStackParamList, "CreateGroupReminder">;

type Frequency = "daily" | "weekly" | "monthly";

function getDefaultReminderDate() {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  d.setSeconds(0, 0);
  return d;
}

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateLabel(date: Date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatTimeLabel(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function toVietnamIso(date: Date) {
  // Backend nhận TIMESTAMPTZ. App đang dùng timezone Asia/Ho_Chi_Minh nên gửi offset +07:00 rõ ràng.
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}:00+07:00`;
}

function setTime(date: Date, hour: number, minute = 0) {
  const next = cloneDate(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = cloneDate(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMinutes(date: Date, minutes: number) {
  const next = cloneDate(date);
  next.setMinutes(next.getMinutes() + minutes);
  next.setSeconds(0, 0);
  return next;
}

function endOfThisMonthAtNine() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 9, 0, 0, 0);
}

export default function CreateGroupReminderScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId } = route.params;

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [reminderDate, setReminderDate] = useState<Date>(
    getDefaultReminderDate,
  );
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [saving, setSaving] = useState(false);

  const remindAt = useMemo(() => toVietnamIso(reminderDate), [reminderDate]);

  const onSubmit = async () => {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      return Alert.alert("Thiếu tiêu đề", "Vui lòng nhập tiêu đề nhắc nhở");
    }

    if (reminderDate.getTime() <= Date.now() - 30000) {
      return Alert.alert(
        "Thời gian không hợp lệ",
        "Vui lòng chọn thời gian nhắc trong tương lai.",
      );
    }

    try {
      setSaving(true);
      await createGroupReminder(groupId, {
        title: cleanTitle,
        message: message.trim() || undefined,
        remindAt,
        channel: "in_app",
        isRecurring,
        frequency: isRecurring ? frequency : null,
        interval: isRecurring ? 1 : null,
        timezone: "Asia/Ho_Chi_Minh",
      });

      Toast.show({ type: "success", text1: "Đã tạo nhắc nhở nhóm" });
      nav.goBack();
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[commonStyles.root, { backgroundColor: ui.bg }]}>
      <View style={{ height: insets.top, backgroundColor: ui.bg }} />

      <ScrollView
        style={commonStyles.page}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 10,
          paddingBottom: insets.bottom + 28,
        }}
      >
        <Pressable onPress={() => nav.goBack()} style={commonStyles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={ui.text} />
        </Pressable>

        <Text style={[commonStyles.h1, { color: ui.text }]}>Tạo nhắc nhở</Text>
        <Text style={[commonStyles.h2, { color: ui.muted }]}>
          Đến giờ nhắc, app sẽ tự tạo thông báo cho các thành viên trong nhóm.
        </Text>

        <View
          style={[
            commonStyles.card,
            { backgroundColor: ui.card, borderColor: ui.border },
            shadow,
          ]}
        >
          <Text style={[commonStyles.label, { color: ui.text }]}>Tiêu đề</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ví dụ: Đóng quỹ tiền nhà"
            placeholderTextColor={ui.muted}
            style={[
              commonStyles.input,
              {
                backgroundColor: ui.input,
                borderColor: ui.border,
                color: ui.text,
              },
            ]}
          />

          <Text style={[commonStyles.label, { color: ui.text }]}>Nội dung</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Cả nhà nhớ đóng quỹ trước cuối tuần nhé."
            placeholderTextColor={ui.muted}
            multiline
            textAlignVertical="top"
            style={[
              commonStyles.textArea,
              {
                backgroundColor: ui.input,
                borderColor: ui.border,
                color: ui.text,
              },
            ]}
          />

          <Text style={[commonStyles.label, { color: ui.text }]}>
            Thời gian nhắc
          </Text>

          <View style={styles.quickGrid}>
            <QuickTimeButton
              label="Sau 1 giờ"
              onPress={() => setReminderDate(getDefaultReminderDate())}
              ui={ui}
            />
            <QuickTimeButton
              label="Tối nay 20:00"
              onPress={() => {
                const todayEight = setTime(new Date(), 20, 0);
                setReminderDate(
                  todayEight.getTime() > Date.now()
                    ? todayEight
                    : setTime(addDays(new Date(), 1), 20, 0),
                );
              }}
              ui={ui}
            />
            <QuickTimeButton
              label="Sáng mai 09:00"
              onPress={() =>
                setReminderDate(setTime(addDays(new Date(), 1), 9, 0))
              }
              ui={ui}
            />
            <QuickTimeButton
              label="Cuối tháng 09:00"
              onPress={() => {
                const endMonth = endOfThisMonthAtNine();
                setReminderDate(
                  endMonth.getTime() > Date.now()
                    ? endMonth
                    : setTime(addDays(endMonth, 1), 9, 0),
                );
              }}
              ui={ui}
            />
          </View>

          <View
            style={[
              styles.datetimeBox,
              { backgroundColor: ui.input, borderColor: ui.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.datetimeLabel, { color: ui.muted }]}>
                Ngày
              </Text>
              <Text style={[styles.datetimeValue, { color: ui.text }]}>
                {formatDateLabel(reminderDate)}
              </Text>
            </View>
            <View style={styles.stepperRow}>
              <StepperButton
                icon="remove"
                onPress={() => setReminderDate((prev) => addDays(prev, -1))}
                ui={ui}
              />
              <StepperButton
                icon="add"
                onPress={() => setReminderDate((prev) => addDays(prev, 1))}
                ui={ui}
              />
            </View>
          </View>

          <View
            style={[
              styles.datetimeBox,
              { backgroundColor: ui.input, borderColor: ui.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.datetimeLabel, { color: ui.muted }]}>
                Giờ
              </Text>
              <Text style={[styles.datetimeValue, { color: ui.text }]}>
                {formatTimeLabel(reminderDate)}
              </Text>
            </View>
            <View style={styles.stepperRow}>
              <StepperButton
                icon="remove"
                onPress={() => setReminderDate((prev) => addMinutes(prev, -15))}
                ui={ui}
              />
              <StepperButton
                icon="add"
                onPress={() => setReminderDate((prev) => addMinutes(prev, 15))}
                ui={ui}
              />
            </View>
          </View>

          <View style={styles.timePresetRow}>
            {[8, 9, 12, 18, 20, 21].map((hour) => (
              <Chip
                key={hour}
                label={`${pad2(hour)}:00`}
                active={
                  reminderDate.getHours() === hour &&
                  reminderDate.getMinutes() === 0
                }
                onPress={() =>
                  setReminderDate((prev) => setTime(prev, hour, 0))
                }
                ui={ui}
              />
            ))}
          </View>

          <Text style={[styles.previewText, { color: ui.muted }]}>
            Gửi lên server: {remindAt}
          </Text>

          <Text style={[commonStyles.label, { color: ui.text }]}>Lặp lại</Text>
          <View style={styles.chipWrap}>
            <Chip
              label="Không lặp"
              active={!isRecurring}
              onPress={() => setIsRecurring(false)}
              ui={ui}
            />
            <Chip
              label="Có lặp"
              active={isRecurring}
              onPress={() => setIsRecurring(true)}
              ui={ui}
            />
          </View>

          {isRecurring && (
            <>
              <Text style={[commonStyles.label, { color: ui.text }]}>
                Tần suất
              </Text>
              <View style={styles.chipWrap}>
                <Chip
                  label="Hằng ngày"
                  active={frequency === "daily"}
                  onPress={() => setFrequency("daily")}
                  ui={ui}
                />
                <Chip
                  label="Hằng tuần"
                  active={frequency === "weekly"}
                  onPress={() => setFrequency("weekly")}
                  ui={ui}
                />
                <Chip
                  label="Hằng tháng"
                  active={frequency === "monthly"}
                  onPress={() => setFrequency("monthly")}
                  ui={ui}
                />
              </View>
              <Text style={[styles.helperText, { color: ui.muted }]}>
                Hệ thống sẽ tự gửi thông báo trong app theo lịch lặp đã chọn.
              </Text>
            </>
          )}

          <Pressable
            disabled={saving}
            onPress={onSubmit}
            style={[
              commonStyles.primaryBtn,
              {
                marginTop: 20,
                backgroundColor: GREEN,
                opacity: saving ? 0.65 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#063B2B" />
            ) : (
              <Text style={commonStyles.primaryBtnText}>Tạo nhắc nhở</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress, ui }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? "rgba(78,236,165,0.32)" : ui.input,
          borderColor: active ? GREEN : ui.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: ui.text }]}>{label}</Text>
    </Pressable>
  );
}

function QuickTimeButton({ label, onPress, ui }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.quickBtn,
        { backgroundColor: ui.input, borderColor: ui.border },
      ]}
    >
      <Text style={[styles.quickBtnText, { color: ui.text }]}>{label}</Text>
    </Pressable>
  );
}

function StepperButton({ icon, onPress, ui }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.stepperBtn,
        { backgroundColor: ui.card, borderColor: ui.border },
      ]}
    >
      <Ionicons name={icon} size={16} color={ui.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chipWrap: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timePresetRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
  },
  chipText: { fontFamily: "Faustina_700Bold", fontSize: 12.5 },
  quickGrid: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickBtn: {
    width: "48%",
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  quickBtnText: {
    textAlign: "center",
    fontFamily: "Faustina_700Bold",
    fontSize: 12.5,
  },
  datetimeBox: {
    marginTop: 10,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  datetimeLabel: {
    fontFamily: "Faustina_500Medium",
    fontSize: 12,
  },
  datetimeValue: {
    marginTop: 2,
    fontFamily: "Faustina_700Bold",
    fontSize: 17,
  },
  stepperRow: {
    flexDirection: "row",
    gap: 8,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: {
    marginTop: 8,
    fontFamily: "Faustina_400Regular",
    fontSize: 11.5,
  },
  helperText: {
    marginTop: 8,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
    lineHeight: 17,
  },
});

import { api } from "./api";
import Toast from "react-native-toast-message";
import * as Notifications from "expo-notifications";
import { getItem, setItem } from "./storage";
export type CurrentBudget = {
  id?: number;
  month?: string;
  limitAmount: number;
  alertThreshold: 70 | 80 | 90 | 100;
  notifyInApp: boolean;
  notifyEmail: boolean;

  spentThisMonth?: number;
  percentage?: number;
  isOverThreshold?: boolean;
  isOverLimit?: boolean;

  createdAt?: string;
  updatedAt?: string;
};

const unwrap = (res: any) => {
  const d = res?.data;
  // nếu response có key "data" (kể cả null) => trả đúng d.data
  if (d && Object.prototype.hasOwnProperty.call(d, "data")) return d.data;
  return d ?? res;
};

export async function fetchCurrentBudget(): Promise<CurrentBudget | null> {
  const res = await api.get("/api/budgets/current");
  return (unwrap(res) ?? null) as CurrentBudget | null;
}

export async function fetchLatestBudgetFromHistory(): Promise<CurrentBudget | null> {
  const res = await api.get("/api/budgets/history", { params: { months: 6 } }); // lấy 6 cho chắc
  const data = unwrap(res);

  const arr = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.budgets)
    ? data.budgets
    : Array.isArray(data?.items)
    ? data.items
    : [];

  return arr?.[0] ?? null;
}

export async function upsertCurrentBudget(payload: {
  limitAmount: number;
  alertThreshold: 70 | 80 | 90 | 100;
  notifyInApp: boolean;
  notifyEmail: boolean;
}): Promise<CurrentBudget> {
  const res = await api.put("/api/budgets/current", payload);
  return unwrap(res) as CurrentBudget;
}

/**
 * Auto-carry:
 * - Nếu current null -> lấy budget gần nhất -> tạo current bằng settings cũ
 * - Chỉ chạy 1 lần / tháng (tránh PUT liên tục)
 */
export async function fetchCurrentBudgetAutoCarry(): Promise<CurrentBudget | null> {
  const cur = await fetchCurrentBudget();
  if (cur) return cur;

  const prev = await fetchLatestBudgetFromHistory();
  if (!prev?.limitAmount || Number(prev.limitAmount) <= 0) return null;

  // tạo budget cho tháng hiện tại bằng budget tháng gần nhất
  return await upsertCurrentBudget({
    limitAmount: Number(prev.limitAmount),
    alertThreshold: (prev.alertThreshold ?? 80) as 70 | 80 | 90 | 100,
    notifyInApp: !!prev.notifyInApp,
    notifyEmail: !!prev.notifyEmail,
  });
}
// ... phần trên giữ nguyên

export type BudgetAlert = {
  id: number;
  budgetId: number;
  threshold: number; // 70 | 80 | 90 | 100 | 101 (101 = vượt 100%)
  sentOn: string; // 'YYYY-MM-DD'
  channel: "in_app" | "email";
  month?: string; // 'YYYY-MM-01' – tháng của budget
  limitAmount?: number;
  budgetAlertThreshold?: number; // ngưỡng config trong budget
  createdAt?: string;
};

/**
 * GET /api/budgets/alerts?days=30
 * @param days số ngày gần đây muốn lấy log (mặc định 30)
 */
export async function fetchBudgetAlerts(
  days: number = 30
): Promise<BudgetAlert[]> {
  const res = await api.get("/api/budgets/alerts", {
    params: { days },
  });
  const data = unwrap(res);
  const arr = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : [];
  return arr as BudgetAlert[];
}
const LAST_ALERT_KEY = "budget_last_inapp_alert_id";

export async function checkBudgetAndNotifyInApp() {
  try {
    // 1) Lấy budget hiện tại để biết limit / flag notify
    const budget = await fetchCurrentBudget();
    if (!budget) return;
    if (!budget.notifyInApp) return;

    // 2) Lấy log cảnh báo 1–2 ngày gần đây
    const alerts = await fetchBudgetAlerts(2);
    if (!alerts || !alerts.length) return;

    // chỉ quan tâm log gửi trong app
    const newestInApp = alerts.find((a) => a.channel === "in_app");
    if (!newestInApp) return;

    // 3) Đọc id alert đã show lần trước trong SecureStore
    const lastSeenId = await getItem(LAST_ALERT_KEY);
    if (lastSeenId && lastSeenId === String(newestInApp.id)) {
      // đã show alert này rồi, không show lại nữa
      return;
    }

    // 4) Lưu lại id alert mới nhất
    await setItem(LAST_ALERT_KEY, String(newestInApp.id));

    // 5) Build nội dung thông báo
    const limit = newestInApp.limitAmount ?? budget.limitAmount ?? 0;
    const thr = newestInApp.threshold;

    const percentLabel =
      thr === 101 ? "vượt 100% ngân sách" : `đạt khoảng ${thr}% ngân sách`;

    const title =
      thr === 101
        ? "Bạn đã vượt 100% ngân sách tháng"
        : `Chi tiêu đã ${percentLabel}`;

    const body = `Ngưỡng cảnh báo: ${
      budget.alertThreshold
    }%. Hạn mức: ${limit.toLocaleString("vi-VN")}₫`;

    // 6) Toast trong app
    Toast.show({
      type: thr === 101 ? "error" : "info",
      text1: title,
      text2: body,
      position: "top",
      topOffset: 60,
    });

    // 7) Local notification kiểu iOS banner
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null, // gửi ngay
    });
  } catch (e) {
    console.log("checkBudgetAndNotifyInApp error:", e);
  }
}
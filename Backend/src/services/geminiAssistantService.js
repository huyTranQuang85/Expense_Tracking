// src/services/geminiAssistantService.js
// Gemini Function Calling (Google AI Studio) - CommonJS friendly via dynamic import

const data = require("./chatbotDataService");
const walletService = require("./walletService");
const categoryService = require("./categoryService");
const transactionService = require("./transactionService");
const budgetService = require("./budgetService");

let _ai = null;
let _Type = null;

function getGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GENAI_API_KEY?.trim() ||
    process.env.GOOGLE_GEMINI_API_KEY?.trim() ||
    ""
  );
}

async function getGeminiClient() {
  if (_ai && _Type) return { ai: _ai, Type: _Type };

  const mod = await import("@google/genai");
  const { GoogleGenAI, Type } = mod;

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Set GEMINI_API_KEY (or GOOGLE_API_KEY / GENAI_API_KEY) in Backend/.env.",
    );
  }

  _ai = new GoogleGenAI({ apiKey });
  _Type = Type;
  return { ai: _ai, Type };
}

function getCurrentMonthYearVN() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { year: Number(get("year")), month: Number(get("month")) };
}

function clampInt(n, min, max, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  const xi = Math.trunc(x);
  return Math.max(min, Math.min(max, xi));
}

function resolveMonthOffset(args = {}) {
  // monthOffset ưu tiên nhất
  if (args.monthOffset !== undefined && args.monthOffset !== null) {
    return clampInt(args.monthOffset, -240, 240, 0);
  }

  // month + year
  const month = args.month !== undefined ? Number(args.month) : null;
  const year = args.year !== undefined ? Number(args.year) : null;

  if (
    Number.isFinite(month) &&
    Number.isFinite(year) &&
    month >= 1 &&
    month <= 12 &&
    year >= 1900 &&
    year <= 3000
  ) {
    const now = getCurrentMonthYearVN();
    return (year - now.year) * 12 + (month - now.month);
  }

  // default: tháng này
  return 0;
}

function historyToGeminiContents(history, latestMessage) {
  const contents = (history || []).map((m) => ({
    role: m.sender === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // tránh double latestMessage
  const last = contents[contents.length - 1];
  if (
    !last ||
    last.role !== "user" ||
    last.parts?.[0]?.text !== latestMessage
  ) {
    contents.push({ role: "user", parts: [{ text: latestMessage }] });
  }
  return contents;
}

async function safeCall(fn) {
  try {
    return await fn();
  } catch (e) {
    return { error: true, message: e?.message || "Tool error" };
  }
}
function parseRetryAfterSeconds(err) {
  const msg = err?.message || "";
  // SDK thường nhét JSON trong message
  try {
    const obj = JSON.parse(msg);
    const retryInfo = obj?.error?.details?.find((d) =>
      d["@type"]?.includes("RetryInfo"),
    );
    const delay = retryInfo?.retryDelay; // "53s"
    if (typeof delay === "string" && delay.endsWith("s")) {
      const sec = Number(delay.slice(0, -1));
      if (Number.isFinite(sec)) return Math.max(1, Math.ceil(sec));
    }
  } catch (_) {}

  // fallback: parse "Please retry in XXs"
  const m = msg.match(/retry in\s+([\d.]+)s/i);
  if (m) return Math.max(1, Math.ceil(Number(m[1])));
  return null;
}

function isQuota429(err) {
  const msg = err?.message || "";
  return (
    msg.includes('"code":429') ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Quota exceeded")
  );
}

function formatGeminiError(err) {
  const message = err?.message || "";

  if (message.includes("Missing Gemini API key")) {
    return (
      "Chatbot AI chưa được cấu hình trên backend. " +
      "Hãy thêm GEMINI_API_KEY vào Backend/.env rồi khởi động lại server."
    );
  }

  if (message.includes("Cannot find module '@google/genai'")) {
    return (
      "Backend chưa cài thư viện Gemini. Hãy cài dependencies cho Backend rồi chạy lại server."
    );
  }

  if (isQuota429(err)) {
    const sec = parseRetryAfterSeconds(err) ?? 60;
    return `Bạn đang bị giới hạn lượt gọi AI (quota). Vui lòng thử lại sau khoảng ${sec} giây nhé.`;
  }

  return "Xin lỗi, hệ thống trợ lý đang gặp lỗi. Bạn thử lại sau nhé.";
}

function normalizeLoose(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function bigrams(s) {
  const x = normalizeLoose(s).replace(/\s+/g, "");
  const out = [];
  for (let i = 0; i < x.length - 1; i += 1) out.push(x.slice(i, i + 2));
  return out;
}

function diceCoefficient(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.length || !B.length) return 0;

  const map = new Map();
  for (const g of A) map.set(g, (map.get(g) || 0) + 1);

  let intersection = 0;
  for (const g of B) {
    const n = map.get(g) || 0;
    if (n > 0) {
      intersection += 1;
      map.set(g, n - 1);
    }
  }

  return (2 * intersection) / (A.length + B.length);
}

function bestMatch(query, candidates, minScore = 0.45) {
  const q = normalizeLoose(query);
  if (!q) return null;

  let best = null;
  for (const c of candidates || []) {
    const name = c.name || "";
    const n = normalizeLoose(name);
    let score = 0;

    if (n === q) score = 1;
    else if (n.includes(q) || q.includes(n)) score = 0.9;
    else score = diceCoefficient(q, n);

    if (!best || score > best.score) best = { ...c, score };
  }

  if (!best || best.score < minScore) return null;
  return best;
}

function formatCurrencyVnd(value) {
  const n = Number(value || 0);
  try {
    return `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
  } catch {
    return `${n}đ`;
  }
}

function formatMonthLabelVN(dateLike) {
  const d = dateLike ? new Date(dateLike) : new Date();
  return d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
}

function toIsoDateLocal(date = new Date()) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateInput(input, fallback = null) {
  if (!input) return fallback;
  const s = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return toIsoDateLocal(d);
  return fallback;
}

function parsePositiveNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function toActionChoice(label, value = label) {
  return { label, value };
}

function walletChoice(w) {
  return {
    label: `${w.name}${Number.isFinite(Number(w.balance)) ? ` · ${formatCurrencyVnd(w.balance)}` : ""}`,
    value: w.name,
  };
}

function buildToolMeta(toolName, toolResult, latestMessage) {
  const meta = {
    action: toolResult?.action || toolName || null,
    field: toolResult?.field || null,
    pendingField: toolResult?.field || null,
    prompt: toolResult?.message || null,
  };

  const choices = [];
  const followUps = [];

  const pushChoices = (items) => {
    for (const item of items || []) {
      if (!item) continue;
      const label = typeof item === "string" ? item : (item.label || item.value || "");
      const value = typeof item === "string" ? item : (item.value || item.label || "");
      if (!label || !value) continue;
      if (!choices.some((x) => x.value === value)) choices.push({ label, value });
    }
  };

  const pushFollowUps = (items) => {
    for (const item of items || []) {
      if (!item) continue;
      const label = typeof item === "string" ? item : (item.label || item.value || "");
      const value = typeof item === "string" ? item : (item.value || item.label || "");
      if (!label || !value) continue;
      if (!followUps.some((x) => x.value === value)) followUps.push({ label, value });
    }
  };

  if (toolResult?.needs_clarification) {
    meta.kind = "clarification";

    if (Array.isArray(toolResult.options)) {
      for (const opt of toolResult.options) {
        if (!opt) continue;
        if (typeof opt === "string") {
          pushChoices([opt]);
          continue;
        }
        const label = String(opt.label || opt.name || opt.value || opt.id || "").trim();
        if (!label) continue;
        pushChoices([{
          label,
          value: opt.value !== undefined && opt.value !== null ? String(opt.value) : label,
        }]);
      }
    }

    if (Array.isArray(toolResult.walletOptions)) {
      for (const w of toolResult.walletOptions) {
        if (!w) continue;
        pushChoices([walletChoice(w)]);
      }
    }

    if (toolResult.field === "wallet") {
      pushFollowUps(["Tạo ví mới", "Xem danh sách ví"]);
    }
  }

  // Thêm nextActions từ tool result -> followUps (ưu tiên cao)
  if (Array.isArray(toolResult?.nextActions)) {
    pushFollowUps(toolResult.nextActions);
  }

  // Gợi ý mặc định theo action type (nếu chưa có followUps từ nextActions)
  if (followUps.length === 0) {
    switch (toolResult?.action || toolName) {
      case "create_category":
        pushFollowUps([
          "Thêm giao dịch vào danh mục này",
          "Tạo danh mục con",
          "Xem top danh mục chi tiêu",
        ]);
        break;
      case "add_wallet":
        if (toolResult?.wallet?.name) {
          pushFollowUps([
            `Thêm tiền vào ví "${toolResult.wallet.name}"`,
            "Đổi icon ví",
            "Xem danh sách ví",
          ]);
        }
        break;
      case "add_income":
        pushFollowUps([
          "Thêm giao dịch khác",
          "Nhận xét ví hiện tại",
          "Đề xuất ví phù hợp để nhận lương",
        ]);
        break;
      case "add_transaction":
        pushFollowUps([
          "Thêm giao dịch khác",
          "Nhận xét budget tháng này",
          "Nhận xét ví hiện tại",
        ]);
        break;
      case "comment_budget":
        pushFollowUps([
          "Nhận xét ví hiện tại",
          "Top 3 giao dịch chi tiêu lớn nhất tháng này",
          "Xem tổng thu nhập và chi tiêu tháng này",
        ]);
        break;
      case "comment_wallet":
        pushFollowUps([
          "Thêm thu nhập vào ví",
          "Đề xuất ví phù hợp để nhận lương",
          "Tạo ví mới",
        ]);
        break;
      case "suggest_wallet":
        pushFollowUps([
          "Thêm thu nhập vào ví này",
          "Nhận xét ví hiện tại",
          "Xem danh sách ví",
        ]);
        break;
      default:
        break;
    }
  }

  if (toolResult?.message) {
    meta.note = toolResult.message;
  }

  // choices: có sectionLabel để frontend hiển thị
  if (choices.length) {
    meta.choices = choices.slice(0, 6);
    meta.choicesLabel = "Chọn một lựa chọn:";
  }

  // followUps: sectionLabel gợi ý tiếp theo
  if (followUps.length) {
    meta.followUps = followUps.slice(0, 4);
  }

  if (
    toolResult?.walletOptions &&
    !meta.choices?.length &&
    Array.isArray(toolResult.walletOptions)
  ) {
    meta.choices = toolResult.walletOptions.slice(0, 6).map(walletChoice);
    meta.choicesLabel = "Ví có sẵn:";
  }

  return meta;
}

async function getExpenseCategoryCandidates(userId) {
  const cats = await categoryService.getCategories(userId, "expense", {
    includeSystem: true,
  });
  return cats.map((c) => ({
    id: Number(c.id),
    name: c.name,
    type: c.type,
    parentCategoryId: c.parentCategoryId ?? null,
  }));
}

async function getIncomeCategoryCandidates(userId) {
  const cats = await categoryService.getCategories(userId, "income", {
    includeSystem: true,
  });
  return cats.map((c) => ({
    id: Number(c.id),
    name: c.name,
    type: c.type,
    parentCategoryId: c.parentCategoryId ?? null,
  }));
}

async function getWalletCandidates(userId) {
  const wallets = await walletService.getWalletsByUser(userId, {
    includeArchived: false,
  });
  return wallets.map((w) => ({
    id: Number(w.id),
    name: w.name,
    balance: Number(w.balance || 0),
    isFrozen: Boolean(w.isFrozen),
    currencyCode: w.currencyCode || "VND",
    type: w.type,
  }));
}

async function getCurrentBudgetSnapshot(userId, monthOffset = 0) {
  return data.getCurrentBudgetWithUsage(userId, monthOffset);
}

function buildBudgetCommentary(snapshot) {
  if (!snapshot) {
    return {
      status: "missing",
      summary: "Chưa có ngân sách tháng này để nhận xét.",
      suggestions: [
        "Thiết lập một ngân sách tổng cho tháng để AI theo dõi chi tiêu.",
        "Chọn ngưỡng cảnh báo 80% nếu bạn muốn kiểm soát vừa phải.",
      ],
    };
  }

  const spent = Number(snapshot.spentAmount ?? snapshot.spent_amount ?? 0);
  const limit = Number(snapshot.limitAmount ?? snapshot.limit_amount ?? 0);
  const pct =
    snapshot.percentage != null
      ? Number(snapshot.percentage)
      : limit > 0
      ? (spent / limit) * 100
      : 0;
  const left = Math.max(0, limit - spent);
  const threshold = Number(snapshot.alertThreshold ?? snapshot.alert_threshold ?? 80);

  let tone = "ổn";
  if (pct >= 100) tone = "đã vượt ngân sách";
  else if (pct >= threshold) tone = "đang chạm ngưỡng cảnh báo";

  const suggestions = [];
  if (pct >= 100) {
    suggestions.push("Giảm ngay các khoản không thiết yếu trong phần còn lại của tháng.");
    suggestions.push("Xem lại 3 danh mục chi tiêu lớn nhất để cắt bớt.");
  } else if (pct >= threshold) {
    suggestions.push("Giữ mức chi hiện tại dưới ngưỡng cảnh báo trong các tuần tới.");
    suggestions.push("Tạm hoãn các khoản chi không cấp bách.");
  } else {
    suggestions.push("Bạn đang kiểm soát ngân sách khá ổn.");
    suggestions.push("Duy trì nhịp chi hiện tại và theo dõi từng tuần.");
  }

  return {
    status: "ok",
    summary: `Ngân sách ${formatMonthLabelVN(snapshot.month)} đang ở mức ${Math.round(
      pct,
    )}%. Đã chi ${formatCurrencyVnd(spent)} trên ${formatCurrencyVnd(
      limit,
    )}, còn lại ${formatCurrencyVnd(left)}.`,
    suggestions,
    percent: Math.round(pct),
    spent,
    limit,
    left,
    threshold,
    monthLabel: formatMonthLabelVN(snapshot.month),
  };
}

async function buildWalletCommentary(userId, monthOffset = 0) {
  const wallets = await walletService.getWalletStatsByUser(userId);
  const currentTotalBalance = await data.getTotalBalance(userId);
  const topWallet = await data.getTopSpendingWallet(userId, monthOffset);

  const activeWallets = wallets.filter((w) => !w.isArchived);
  if (!activeWallets.length) {
    return {
      status: "missing",
      summary: "Bạn chưa có ví hoạt động nào để mình nhận xét.",
      suggestions: [
        "Tạo một ví mặc định để theo dõi số dư và giao dịch.",
        "Nếu bạn muốn, mình có thể tạo ví ngay trong chat.",
      ],
    };
  }

  const richestWallet = [...activeWallets].sort(
    (a, b) => Number(b.balance || 0) - Number(a.balance || 0),
  )[0];
  const weakestWallet = [...activeWallets].sort(
    (a, b) => Number(a.balance || 0) - Number(b.balance || 0),
  )[0];

  const suggestions = [];
  if (richestWallet) {
    suggestions.push(
      `Ví có số dư cao nhất hiện tại là "${richestWallet.name}" với ${formatCurrencyVnd(
        richestWallet.balance,
      )}.`,
    );
  }
  if (weakestWallet) {
    suggestions.push(
      `Ví thấp nhất là "${weakestWallet.name}" với ${formatCurrencyVnd(
        weakestWallet.balance,
      )}. Nếu đây là ví chi tiêu hằng ngày, nên hạn chế phát sinh thêm.`,
    );
  }
  if (topWallet?.wallet_name) {
    suggestions.push(
      `Trong ${topWallet.label || "tháng này"}, ví chi tiêu nhiều nhất là "${topWallet.wallet_name}".`,
    );
  }

  return {
    status: "ok",
    totalBalance: Number(currentTotalBalance || 0),
    walletCount: wallets.length,
    activeWalletCount: activeWallets.length,
    richestWallet: richestWallet
      ? {
          id: richestWallet.id,
          name: richestWallet.name,
          balance: Number(richestWallet.balance || 0),
        }
      : null,
    weakestWallet: weakestWallet
      ? {
          id: weakestWallet.id,
          name: weakestWallet.name,
          balance: Number(weakestWallet.balance || 0),
        }
      : null,
    topSpendingWallet: topWallet
      ? {
          wallet_id: topWallet.wallet_id,
          wallet_name: topWallet.wallet_name,
          total_expense: Number(topWallet.total_expense || 0),
          month: topWallet.month,
          year: topWallet.year,
          label: topWallet.label,
        }
      : null,
    suggestions,
  };
}

async function runGeminiWithTools({ userId, history, latestMessage }) {
  let ai;
  let Type;

  try {
    ({ ai, Type } = await getGeminiClient());
  } catch (err) {
    console.error("Gemini init error:", err?.message || err);
    const retryAfterSeconds = isQuota429(err)
      ? Math.max(1, parseRetryAfterSeconds(err) ?? 60)
      : null;
    return {
      reply: formatGeminiError(err),
      meta: retryAfterSeconds
        ? { kind: "info", quotaLimited: true, retryAfterSeconds }
        : null,
      status: isQuota429(err) ? 429 : 500,
      retryAfterSeconds,
    };
  }

  // ===== Tool handlers (server-side truth) =====
  const toolFunctions = {
    create_category_action: async (args) => {
      const name = String(args?.name || "").trim();
      const type = String(args?.type || "expense").trim();
      const icon = args?.icon != null ? String(args.icon).trim() : null;
      const color = args?.color != null ? String(args.color).trim() : null;
      const groupKey = args?.groupKey != null ? String(args.groupKey).trim() : null;
      const sortOrder = Number.isFinite(Number(args?.sortOrder))
        ? Number(args.sortOrder)
        : 0;
      const parentCategoryId = args?.parentCategoryId ?? null;

      if (!name) {
        return {
          needs_clarification: true,
          field: "name",
          message: "Bạn muốn tạo danh mục nào?",
        };
      }

      if (type !== "income" && type !== "expense") {
        return {
          needs_clarification: true,
          field: "type",
          message: "Danh mục này là thu nhập hay chi tiêu?",
        };
      }

      const category = await categoryService.createCategory(userId, {
        name,
        type,
        icon,
        color,
        parentCategoryId,
        groupKey,
        sortOrder,
      });

      const categoryTypeLabel = category.type === "expense" ? "chi tiêu" : "thu nhập";

      return {
        ok: true,
        action: "create_category",
        category,
        message: `Đã tạo danh mục "${category.name}" (${categoryTypeLabel}).`,
        nextActions: [
          `Thêm ${categoryTypeLabel} 50.000đ vào danh mục "${category.name}"`,
          `Tạo danh mục con cho "${category.name}"`,
          "Đổi icon/ màu cho danh mục",
          "Xem top danh mục chi tiêu",
        ],
      };
    },

    add_wallet_action: async (args) => {
      const name = String(args?.name || args?.walletName || "").trim();
      if (!name) {
        return {
          needs_clarification: true,
          field: "name",
          message: "Bạn muốn thêm ví nào?",
        };
      }

      const balance = parsePositiveNumber(args?.balance ?? 0) ?? 0;
      const payload = {
        name,
        description: args?.description ?? null,
        icon: args?.icon ?? null,
        type: args?.type ?? "standard",
        currencyCode: args?.currencyCode ?? args?.currency_code ?? "VND",
        balance,
        color: args?.color ?? "#4ECDC4",
        isFrozen: Boolean(args?.isFrozen ?? args?.is_frozen ?? false),
      };

      const wallet = await walletService.createWallet(userId, payload);

      return {
        ok: true,
        action: "add_wallet",
        wallet,
        message: `Đã tạo ví "${wallet.name}" với số dư ${formatCurrencyVnd(
          wallet.balance,
        )}.`,
        nextActions: [
          `Thêm 1.000.000đ vào ví "${wallet.name}"`,
          `Thêm 500.000đ vào ví "${wallet.name}"`,
          `Thêm 2.000.000đ vào ví "${wallet.name}"`,
          "Đổi icon/ màu cho ví",
          `Thêm giao dịch vào ví "${wallet.name}"`,
          "Xem danh sách ví",
        ],
      };
    },

    add_income_action: async (args) => {
      const amount = parsePositiveNumber(args?.amount);
      const description = String(args?.description || args?.note || "Thu nhập").trim();
      const txDate = parseDateInput(args?.txDate || args?.tx_date, toIsoDateLocal());

      if (!amount) {
        return {
          needs_clarification: true,
          field: "amount",
          message: "Bạn muốn thêm thu nhập bao nhiêu?",
        };
      }

      const incomeCategories = await getIncomeCategoryCandidates(userId);

      let walletId = args?.walletId ?? args?.wallet_id ?? null;
      let walletName = String(args?.walletName || args?.wallet_name || "").trim();
      if (!walletId && !walletName) {
        const wallets = await getWalletCandidates(userId);
        return {
          needs_clarification: true,
          field: "wallet",
          message: "Bạn muốn cộng thu nhập vào ví nào?",
          options: ["Tạo ví mới", "Xem danh sách ví"],
          walletOptions: wallets.slice(0, 6),
        };
      }

      if (!walletId && walletName) {
        const wallets = await getWalletCandidates(userId);
        const match = bestMatch(walletName, wallets, 0.35);
        if (!match) {
          return {
            needs_clarification: true,
            field: "wallet",
            message: `Mình chưa chắc ví "${walletName}" là ví nào. Bạn chọn lại tên ví nhé.`,
            options: ["Tạo ví mới", "Xem danh sách ví"],
            walletOptions: wallets.slice(0, 6),
          };
        }
        walletId = match.id;
        walletName = match.name;
      }

      let categoryId = args?.categoryId ?? args?.category_id ?? null;
      let categoryName = String(args?.categoryName || args?.category_name || "").trim();

      if (!categoryId) {
        if (!categoryName) {
          const defaultCat = bestMatch("lương", incomeCategories, 0.2) || incomeCategories[0];
          if (defaultCat) {
            categoryId = defaultCat.id;
            categoryName = defaultCat.name;
          }
        } else {
          const match = bestMatch(categoryName, incomeCategories, 0.35);
          if (!match) {
            return {
              needs_clarification: true,
              field: "category",
              message: `Mình chưa xác định được danh mục thu nhập "${categoryName}". Bạn chọn lại danh mục nhé.`,
              options: incomeCategories.slice(0, 6).map((c) => ({
                label: c.name,
                value: c.name,
              })),
            };
          }
          categoryId = match.id;
          categoryName = match.name;
        }
      }

      if (!categoryId) {
        return {
          needs_clarification: true,
          field: "category",
          message: "Thu nhập này thuộc danh mục nào?",
          options: incomeCategories.slice(0, 6).map((c) => ({
            label: c.name,
            value: c.name,
          })),
        };
      }

      const tx = await transactionService.createTransaction(userId, {
        categoryId,
        walletId,
        amount,
        description,
        txDate,
      });

      return {
        ok: true,
        action: "add_income",
        transaction: tx,
        walletId,
        categoryId,
        amount,
        walletName: walletName || undefined,
        categoryName: categoryName || undefined,
        message: `Đã thêm thu nhập ${formatCurrencyVnd(amount)} vào ví "${walletName || walletId}" với danh mục "${categoryName || categoryId}".`,
        nextActions: [
          `Thêm thu nhập ${formatCurrencyVnd(amount)} nữa`,
          "Thêm giao dịch chi tiêu",
          "Nhận xét budget tháng này",
          "Nhận xét ví hiện tại",
          "Đề xuất ví phù hợp để nhận lương",
        ],
      };
    },

    add_transaction_action: async (args) => {
      const amount = parsePositiveNumber(args?.amount);
      const type = String(args?.type || args?.transactionType || "expense").trim();
      const description = String(args?.description || args?.note || "Giao dịch").trim();
      const txDate = parseDateInput(args?.txDate || args?.tx_date, toIsoDateLocal());

      if (!amount) {
        return {
          needs_clarification: true,
          field: "amount",
          message: "Bạn muốn thêm giao dịch bao nhiêu tiền?",
        };
      }

      if (type !== "income" && type !== "expense") {
        return {
          needs_clarification: true,
          field: "type",
          message: "Giao dịch này là thu nhập hay chi tiêu?",
          options: [
            { label: "Thu nhập", value: "Thu nhập" },
            { label: "Chi tiêu", value: "Chi tiêu" },
          ],
        };
      }

      let walletId = args?.walletId ?? args?.wallet_id ?? null;
      let walletName = String(args?.walletName || args?.wallet_name || "").trim();
      const wallets = await getWalletCandidates(userId);

      if (!walletId && !walletName) {
        return {
          needs_clarification: true,
          field: "wallet",
          message:
            "Bạn muốn dùng ví có sẵn hay tạo ví mới cho giao dịch này?",
          options: ["Tạo ví mới", "Xem danh sách ví"],
          walletOptions: wallets.slice(0, 6),
        };
      }

      if (!walletId && walletName) {
        const match = bestMatch(walletName, wallets, 0.35);
        if (!match) {
          return {
            needs_clarification: true,
            field: "wallet",
            message: `Mình chưa chắc ví "${walletName}" là ví nào. Bạn chọn lại ví có sẵn hoặc tạo ví mới nhé.`,
            options: ["Tạo ví mới", "Xem danh sách ví"],
            walletOptions: wallets.slice(0, 6),
          };
        }
        walletId = match.id;
        walletName = match.name;
      }

      let categoryId = args?.categoryId ?? args?.category_id ?? null;
      let categoryName = String(args?.categoryName || args?.category_name || "").trim();
      const categories =
        type === "income"
          ? await getIncomeCategoryCandidates(userId)
          : await getExpenseCategoryCandidates(userId);

      if (!categoryId && categoryName) {
        const match = bestMatch(categoryName, categories, 0.35);
        if (!match) {
          return {
            needs_clarification: true,
            field: "category",
            message: `Mình chưa xác định được danh mục "${categoryName}". Bạn chọn lại danh mục nhé.`,
            options: categories.slice(0, 6).map((c) => ({
              label: c.name,
              value: c.name,
            })),
          };
        }
        categoryId = match.id;
        categoryName = match.name;
      }

      if (!categoryId) {
        return {
          needs_clarification: true,
          field: "category",
          message:
            type === "income"
              ? "Thu nhập này thuộc danh mục nào?"
              : "Khoản chi này thuộc danh mục nào?",
          options: categories.slice(0, 6).map((c) => ({
            label: c.name,
            value: c.name,
          })),
        };
      }

      const tx = await transactionService.createTransaction(userId, {
        categoryId,
        walletId,
        amount,
        description,
        txDate,
      });

      return {
        ok: true,
        action: "add_transaction",
        transaction: tx,
        type,
        walletId,
        walletName: walletName || undefined,
        categoryId,
        categoryName: categoryName || undefined,
        amount,
        message: `Đã thêm ${type === "income" ? "thu nhập" : "chi tiêu"} ${formatCurrencyVnd(
          amount,
        )} vào ví "${walletName || walletId}" với danh mục "${categoryName || categoryId}".`,
        nextActions: [
          `Thêm ${type === "income" ? "thu nhập" : "chi tiêu"} ${formatCurrencyVnd(amount)} nữa`,
          type === "expense" ? "Thêm giao dịch thu nhập" : "Thêm giao dịch chi tiêu",
          "Nhận xét budget tháng này",
          "Nhận xét ví hiện tại",
        ],
      };
    },

    comment_budget_action: async (args) => {
      const monthOffset = resolveMonthOffset(args);
      const snapshot = await getCurrentBudgetSnapshot(userId, monthOffset);
      return {
        ...buildBudgetCommentary(snapshot),
        nextActions: [
          "Điều chỉnh ngân sách tháng này",
          "Nhận xét ví hiện tại",
          "Top 3 giao dịch chi tiêu lớn nhất tháng này",
          "Xem tổng thu nhập và chi tiêu tháng này",
        ],
      };
    },

    comment_wallet_action: async (args) => {
      const monthOffset = resolveMonthOffset(args);
      const walletCommentary = await buildWalletCommentary(userId, monthOffset);
      const richest = walletCommentary?.richestWallet;
      const weakest = walletCommentary?.weakestWallet;
      const defaultAddAmount = weakest ? Math.ceil(Number(weakest.balance || 0) * 0.2) : 500000;

      return {
        ...walletCommentary,
        nextActions: [
          richest ? `Thêm ${formatCurrencyVnd(defaultAddAmount)} vào ví "${richest.name}"` : "Thêm thu nhập vào ví",
          "Nhận xét budget tháng này",
          "Đề xuất ví phù hợp để nhận lương",
          "Tạo ví mới",
        ],
      };
    },

    suggest_wallet_action: async (args) => {
      const purpose = normalizeLoose(args?.purpose || args?.intent || "");
      const amount = parsePositiveNumber(args?.amount ?? 0) || 0;
      const wallets = await getWalletCandidates(userId);
      const active = wallets.filter((w) => !w.isFrozen);

      if (!active.length) {
        return {
          ok: false,
          message: "Bạn chưa có ví hoạt động nào để mình đề xuất.",
          nextActions: ["Tạo ví mới", "Xem danh sách ví"],
        };
      }

      const enoughBalance = amount > 0
        ? active.filter((w) => Number(w.balance || 0) >= amount)
        : active;

      let chosen = enoughBalance[0];
      if (
        purpose.includes("tiet kiem") ||
        purpose.includes("save") ||
        purpose.includes("giu tien")
      ) {
        chosen = [...active].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0];
      } else if (
        purpose.includes("chi tieu") ||
        purpose.includes("mua") ||
        purpose.includes("hoat dong")
      ) {
        chosen =
          [...enoughBalance].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0] ||
          [...active].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0];
      } else {
        chosen =
          [...enoughBalance].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0] ||
          [...active].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0];
      }

      return {
        ok: true,
        action: "suggest_wallet",
        purpose: args?.purpose || null,
        amount,
        wallet: chosen
          ? {
              id: chosen.id,
              name: chosen.name,
              balance: Number(chosen.balance || 0),
              currencyCode: chosen.currencyCode || "VND",
              isFrozen: Boolean(chosen.isFrozen),
            }
          : null,
        alternatives: active
          .slice(0, 3)
          .map((w) => ({
            id: w.id,
            name: w.name,
            balance: Number(w.balance || 0),
            currencyCode: w.currencyCode || "VND",
          })),
        message: chosen
          ? `Mình đề xuất ví "${chosen.name}" vì số dư hiện tại là ${formatCurrencyVnd(
              chosen.balance,
            )}.`
          : "Mình chưa tìm được ví phù hợp.",
        nextActions: chosen
          ? [
              `Thêm thu nhập vào ví "${chosen.name}"`,
              "Nhận xét ví hiện tại",
              "Xem danh sách ví",
            ]
          : ["Xem danh sách ví", "Tạo ví mới", "Nhận xét ví hiện tại"],
      };
    },

    get_monthly_income_expense: async (args) => {
      const monthOffset = resolveMonthOffset(args);
      return data.getMonthlyIncomeExpense(userId, monthOffset);
    },

    get_budget_status_total_month: async (args) => {
      const monthOffset = resolveMonthOffset(args);
      const info = await data.getCurrentBudgetWithUsage(userId, monthOffset);
      if (!info) return { exists: false };
      return { exists: true, ...info };
    },

    get_total_balance: async () => {
      const total = await data.getTotalBalance(userId);
      return { total_balance: total };
    },

    get_wallet_balance_by_name: async (args) => {
      const walletName = String(args?.walletName || "").trim();
      if (!walletName) {
        return {
          need_wallet_name: true,
          message:
            "Bạn muốn xem số dư của ví nào? (Ví dụ: Tiền mặt, MoMo, Ngân hàng...)",
        };
      }

      const w = await data.getWalletByName(userId, walletName);
      if (!w) return { found: false, walletName };
      return { found: true, ...w };
    },

    get_top_expense_categories: async (args) => {
      const monthOffset = resolveMonthOffset(args);
      const limit = clampInt(args?.limit, 1, 20, 5);
      return data.getTopExpenseCategories(userId, monthOffset, limit);
    },

    get_expense_in_range: async (args) => {
      const startDate = String(args?.start_date || "").trim();
      const endDateExclusive = String(args?.end_date_exclusive || "").trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        throw new Error("start_date must be YYYY-MM-DD");
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(endDateExclusive)) {
        throw new Error("end_date_exclusive must be YYYY-MM-DD");
      }
      // NOTE: chatbotDataService.getExpenseInRange dùng [start, end) :contentReference[oaicite:1]{index=1}
      return data.getExpenseInRange(userId, startDate, endDateExclusive);
    },

    // ✅ Tool “xịn” (fuzzy + range + wallets + include sub) gọi thẳng data.getSpendingByCategories
    get_spending_by_categories: async (args) => {
      // chatbotDataService đã có hàm này :contentReference[oaicite:2]{index=2}
      if (typeof data.getSpendingByCategories !== "function") {
        throw new Error(
          "chatbotDataService.getSpendingByCategories is missing",
        );
      }
      return data.getSpendingByCategories({ userId, ...args });
    },
    get_top_big_expenses: async (args) => {
      const monthOffset = resolveMonthOffset(args);
      const limit = clampInt(args?.limit, 1, 20, 3);
      return data.getTopBigExpenses(userId, monthOffset, limit);
    },

    get_top_big_incomes: async (args) => {
      const monthOffset = resolveMonthOffset(args);
      const limit = clampInt(args?.limit, 1, 20, 3);
      return data.getTopBigIncomes(userId, monthOffset, limit);
    },
    get_top_spending_wallet: async (args) => {
      const monthOffset = resolveMonthOffset(args);
      const top = await data.getTopSpendingWallet(userId, monthOffset);
      if (!top) return { found: false };
      return { found: true, ...top };
    },
  };

  // ===== Tool declarations (what Gemini can call) =====
  const tools = [
    {
      functionDeclarations: [
        {
          name: "create_category_action",
          description:
            "Tạo danh mục chi tiêu hoặc thu nhập cho user bằng chat.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Tên danh mục" },
              type: { type: Type.STRING, description: "income hoặc expense" },
              icon: { type: Type.STRING, description: "Icon/emoji tùy chọn" },
              color: { type: Type.STRING, description: "Mã màu HEX" },
              parentCategoryId: {
                type: Type.NUMBER,
                description: "ID danh mục cha nếu muốn tạo subcategory",
              },
              groupKey: { type: Type.STRING, description: "group key tùy chọn" },
              sortOrder: { type: Type.NUMBER, description: "Thứ tự sắp xếp" },
            },
            required: ["name"],
          },
        },
        {
          name: "add_wallet_action",
          description:
            "Tạo ví mới cho user bằng chat.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Tên ví" },
              description: { type: Type.STRING, description: "Mô tả ví" },
              icon: { type: Type.STRING, description: "Icon tùy chọn" },
              type: { type: Type.STRING, description: "standard/fixed/..." },
              balance: { type: Type.NUMBER, description: "Số dư ban đầu" },
              color: { type: Type.STRING, description: "Mã màu HEX" },
              currencyCode: { type: Type.STRING, description: "Mã tiền tệ, mặc định VND" },
              isFrozen: { type: Type.BOOLEAN, description: "Ví đang khóa hay không" },
            },
            required: ["name"],
          },
        },
        {
          name: "add_income_action",
          description:
            "Thêm giao dịch thu nhập cho user bằng chat.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: "Số tiền thu nhập" },
              description: { type: Type.STRING, description: "Mô tả giao dịch" },
              txDate: { type: Type.STRING, description: "Ngày YYYY-MM-DD" },
              walletId: { type: Type.NUMBER, description: "ID ví đích" },
              walletName: { type: Type.STRING, description: "Tên ví đích nếu chưa có ID" },
              categoryId: { type: Type.NUMBER, description: "ID danh mục thu nhập" },
              categoryName: { type: Type.STRING, description: "Tên danh mục thu nhập" },
            },
            required: ["amount"],
          },
        },
        {
          name: "add_transaction_action",
          description:
            "Thêm giao dịch thu nhập hoặc chi tiêu cho user bằng chat. Nếu thiếu ví hoặc danh mục thì hỏi lại và trả danh sách lựa chọn.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: "Số tiền giao dịch" },
              type: { type: Type.STRING, description: "income hoặc expense" },
              description: { type: Type.STRING, description: "Mô tả giao dịch" },
              txDate: { type: Type.STRING, description: "Ngày YYYY-MM-DD" },
              walletId: { type: Type.NUMBER, description: "ID ví" },
              walletName: { type: Type.STRING, description: "Tên ví nếu chưa có ID" },
              categoryId: { type: Type.NUMBER, description: "ID danh mục" },
              categoryName: { type: Type.STRING, description: "Tên danh mục" },
            },
            required: ["amount"],
          },
        },
        {
          name: "comment_budget_action",
          description:
            "Tạo nhận xét AI về ngân sách tháng hiện tại hoặc tháng được chỉ định.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              monthOffset: { type: Type.NUMBER, description: "0=tháng này, -1=tháng trước..." },
              month: { type: Type.NUMBER, description: "Tháng 1..12 nếu muốn chỉ rõ" },
              year: { type: Type.NUMBER, description: "Năm nếu muốn chỉ rõ" },
            },
          },
        },
        {
          name: "comment_wallet_action",
          description:
            "Tạo nhận xét AI về ví và phân bổ ví hiện tại.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              monthOffset: { type: Type.NUMBER, description: "0=tháng này, -1=tháng trước..." },
            },
          },
        },
        {
          name: "suggest_wallet_action",
          description:
            "Đề xuất ví phù hợp theo mục đích hoặc số tiền dự định dùng.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              purpose: { type: Type.STRING, description: "Mục đích: chi tiêu, tiết kiệm, nhận lương..." },
              amount: { type: Type.NUMBER, description: "Số tiền dự tính nếu có" },
              intent: { type: Type.STRING, description: "Ý định phụ để trợ lý hiểu ngữ cảnh" },
            },
          },
        },
        {
          name: "get_monthly_income_expense",
          description:
            "Lấy tổng thu nhập và tổng chi tiêu trong 1 tháng. Có thể truyền monthOffset hoặc month+year.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              monthOffset: {
                type: Type.NUMBER,
                description: "0=tháng này, -1=tháng trước...",
              },
              month: {
                type: Type.NUMBER,
                description: "Tháng 1..12 (optional)",
              },
              year: { type: Type.NUMBER, description: "Năm (optional)" },
            },
          },
        },
        {
          name: "get_top_spending_wallet",
          description:
            "Lấy ví chi tiêu nhiều nhất trong tháng (chỉ tính expense). Có thể truyền monthOffset hoặc month+year.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              monthOffset: {
                type: Type.NUMBER,
                description: "0=tháng này, -1=tháng trước...",
              },
              month: {
                type: Type.NUMBER,
                description: "Tháng 1..12 (optional)",
              },
              year: { type: Type.NUMBER, description: "Năm (optional)" },
            },
          },
        },

        {
          name: "get_top_big_expenses",
          description:
            "Lấy top N giao dịch CHI TIÊU lớn nhất trong tháng (theo amount).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              limit: {
                type: Type.NUMBER,
                description: "Số lượng giao dịch (1..20), mặc định 3",
              },
              monthOffset: {
                type: Type.NUMBER,
                description: "0=tháng này, -1=tháng trước...",
              },
              month: {
                type: Type.NUMBER,
                description: "Tháng 1..12 (optional)",
              },
              year: { type: Type.NUMBER, description: "Năm (optional)" },
            },
          },
        },
        {
          name: "get_top_big_incomes",
          description:
            "Lấy top N giao dịch THU NHẬP lớn nhất trong tháng (theo amount).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              limit: {
                type: Type.NUMBER,
                description: "Số lượng giao dịch (1..20), mặc định 3",
              },
              monthOffset: {
                type: Type.NUMBER,
                description: "0=tháng này, -1=tháng trước...",
              },
              month: {
                type: Type.NUMBER,
                description: "Tháng 1..12 (optional)",
              },
              year: { type: Type.NUMBER, description: "Năm (optional)" },
            },
          },
        },
        {
          name: "get_budget_status_total_month",
          description:
            "Kiểm tra ngân sách tổng tháng (category_id NULL & wallet_id NULL) và số tiền đã chi. Có thể truyền monthOffset hoặc month+year.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              monthOffset: { type: Type.NUMBER },
              month: { type: Type.NUMBER },
              year: { type: Type.NUMBER },
            },
          },
        },

        {
          name: "get_spending_by_categories",
          description:
            "Tính chi tiêu theo 1 hoặc nhiều danh mục. Hỗ trợ fuzzy tên danh mục, theo tháng hoặc theo khoảng ngày, lọc theo 1/nhiều ví, và tính cả sub-category.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              category_names: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Tên danh mục (vd: ['an uong','đi lại'])",
              },

              // chọn 1 trong 2 cách: (start_date + end_date) OR monthOffset
              start_date: {
                type: Type.STRING,
                description: "YYYY-MM-DD (inclusive range start)",
              },
              end_date: {
                type: Type.STRING,
                description: "YYYY-MM-DD (inclusive range end)",
              },

              monthOffset: {
                type: Type.NUMBER,
                description: "0=tháng này, -1=tháng trước...",
              },
              month: {
                type: Type.NUMBER,
                description: "Tháng 1..12 (optional)",
              },
              year: { type: Type.NUMBER, description: "Năm (optional)" },

              wallet_names: { type: Type.ARRAY, items: { type: Type.STRING } },
              wallet_ids: { type: Type.ARRAY, items: { type: Type.NUMBER } },

              include_subcategories: {
                type: Type.BOOLEAN,
                description: "default true",
              },
              currency: { type: Type.STRING, description: "default VND" },
            },
            required: ["category_names"],
          },
        },
        {
          name: "get_top_expense_categories",
          description:
            "Lấy top danh mục chi tiêu trong tháng. Có thể truyền monthOffset hoặc month+year.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              monthOffset: { type: Type.NUMBER },
              month: { type: Type.NUMBER },
              year: { type: Type.NUMBER },
              limit: { type: Type.NUMBER, description: "1..20" },
            },
          },
        },
        {
          name: "get_total_balance",
          description:
            "Tổng số dư hiện tại (sum balance các ví chưa archived).",
          parameters: { type: Type.OBJECT, properties: {} },
        },
        {
          name: "get_wallet_balance_by_name",
          description: "Lấy số dư của một ví theo tên.",
          parameters: {
            type: Type.OBJECT,
            properties: { walletName: { type: Type.STRING } },
          },
        },
        {
          name: "get_expense_in_range",
          description:
            "Tổng chi tiêu trong khoảng ngày bất kỳ theo dạng [start_date, end_date_exclusive).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              start_date: { type: Type.STRING, description: "YYYY-MM-DD" },
              end_date_exclusive: {
                type: Type.STRING,
                description: "YYYY-MM-DD (exclusive)",
              },
            },
            required: ["start_date", "end_date_exclusive"],
          },
        },
      ],
    },
  ];

  const systemInstruction = `
Bạn là trợ lý tài chính cá nhân cho app quản lý chi tiêu.
Quy tắc bắt buộc:
- Trả lời tiếng Việt, tự nhiên, ngắn gọn, rõ ràng, thân thiện.
- Hiểu cả câu nhập ngắn, typo, thiếu dấu, tên viết tắt, hoặc câu trộn số + từ.
- Khi câu hỏi cần số liệu, nhận xét, đề xuất hoặc thao tác dữ liệu (thu/chi/budget/danh mục/ví/thống kê/tạo danh mục/thêm ví/thêm thu nhập/thêm giao dịch/ghi chi tiêu/nhận xét/đề xuất), BẮT BUỘC gọi tool phù hợp. Không tự bịa số.
- Khi người dùng muốn tạo danh mục chi tiêu, thêm ví, thêm thu nhập, thêm giao dịch, ghi khoản chi, nhận xét budget/ví, hoặc đề xuất ví, hãy ưu tiên dùng tool hành động thay vì trả lời chung chung.
- Nếu thiếu dữ liệu để thao tác, hỏi lại đúng 1 câu ngắn, tập trung vào trường còn thiếu. Không hỏi nhiều ý cùng lúc.
- Nếu tool trả về unresolved/không có dữ liệu, nói rõ ngắn gọn rồi đưa ra tối đa 3 lựa chọn phù hợp.
- Nếu nhận được intent mơ hồ, hãy suy luận ý định gần nhất nhưng không đoán bừa tên ví/danh mục/số tiền.
- Ngân sách: chỉ kiểm tra budget tổng tháng (category_id NULL & wallet_id NULL).
- Khi đã có đủ dữ liệu cho một thao tác, ưu tiên gọi tool ngay thay vì giải thích lý thuyết.
`.trim();

  let contents = historyToGeminiContents(history, latestMessage);
  const maxIterations = 3;
  let lastToolName = null;
  let lastToolResult = null;

  for (let i = 0; i < maxIterations; i++) {
    let result;
    try {
      result = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
        contents,
        config: {
          tools,
          systemInstruction,
          temperature: 0.2,
        },
      });
    } catch (err) {
      if (isQuota429(err)) {
        const sec = Math.max(1, parseRetryAfterSeconds(err) ?? 60);
        return {
          reply: `Bạn đang bị giới hạn lượt gọi AI (quota). Vui lòng thử lại sau khoảng ${sec} giây nhé.`,
          meta: { kind: "info", quotaLimited: true, retryAfterSeconds: sec },
          status: 429,
          retryAfterSeconds: sec,
        };
      }
      console.error("Gemini error:", err?.message || err);
      return {
        reply: "Xin lỗi, hệ thống trợ lý đang gặp lỗi. Bạn thử lại sau nhé.",
        meta: null,
        status: 500,
      };
    }

    if (result.functionCalls && result.functionCalls.length > 0) {
      for (const fc of result.functionCalls) {
        const { name, args } = fc;

        const toolFn = toolFunctions[name];
        const toolResult = toolFn
          ? await safeCall(() => toolFn(args || {}))
          : { error: true, message: `Unknown tool: ${name}` };

        lastToolName = name;
        lastToolResult = toolResult;

        contents.push({ role: "model", parts: [{ functionCall: fc }] });
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name,
                response: { result: toolResult },
              },
            },
          ],
        });
      }
      continue;
    }

    const reply = result.text || "Xin lỗi, mình chưa xử lý được câu hỏi này.";
    return {
      reply,
      meta: lastToolResult ? buildToolMeta(lastToolName, lastToolResult, latestMessage) : null,
    };
  }

  return {
    reply:
      "Xin lỗi, câu hỏi này cần nhiều bước xử lý hơn. Bạn thử hỏi cụ thể hơn (tháng/năm, danh mục, ví) nhé.",
    meta: lastToolResult ? buildToolMeta(lastToolName, lastToolResult, latestMessage) : null,
  };
}

module.exports = { runGeminiWithTools };

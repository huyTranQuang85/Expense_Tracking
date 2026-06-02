// src/services/chatbotService.js
const {
  getMonthlyIncomeExpense,
  getTopSpendingWallet,
  getSpendingByCategoryNames,
  getTotalBalance,
  getTopExpenseCategories,
  getWalletByName,
  getTopBigExpenses,
  getTopBigIncomes,
  getExpenseToday,
  getExpenseLast7Days,
  getCurrentBudgetWithUsage,
} = require("./chatbotDataService");
const formatCurrency = (n) => Number(n || 0).toLocaleString("vi-VN") + "₫";
const { runGeminiWithTools } = require("./geminiAssistantService");
// bỏ dấu tiếng Việt để dễ match
function normalizeText(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// monthOffset: 0 = tháng hiện tại, âm = các tháng quá khứ, dương = tương lai
// monthOffset: 0 = tháng này, -1 = tháng trước, ... (tính theo số tháng lệch)
function detectMonthOffset(textNorm) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1..12
  const currentYear = now.getFullYear();

  // "tháng này"
  if (textNorm.includes("thang nay")) {
    return 0;
  }

  // "tháng trước"
  if (textNorm.includes("thang truoc")) {
    return -1;
  }

  // Nếu có ghi rõ "thang 11", "thang 9", ...
  let targetMonth = currentMonth;
  let targetYear = currentYear;
  let hasExplicitMonth = false;

  const mMatch = textNorm.match(/thang\s+(\d{1,2})/);
  if (mMatch) {
    const mNum = parseInt(mMatch[1], 10);
    if (mNum >= 1 && mNum <= 12) {
      targetMonth = mNum;
      hasExplicitMonth = true;
    }
  }

  // "nam 2024"
  const yMatch = textNorm.match(/nam\s+(\d{4})/);
  if (yMatch) {
    const yNum = parseInt(yMatch[1], 10);
    if (yNum > 1900 && yNum < 3000) {
      targetYear = yNum;
    }
  }

  // Nếu không chỉ rõ tháng/năm thì coi như tháng này
  if (!hasExplicitMonth && !yMatch) {
    return 0;
  }

  // Tính số tháng lệch
  const diffYear = targetYear - currentYear;
  const diffMonth = targetMonth - currentMonth;
  return diffYear * 12 + diffMonth;
}

/**
 * Tách tên danh mục từ câu hỏi:
 * - Ưu tiên text trong dấu nháy: "ăn uống", 'Đi lại'
 * - Nếu không có, lấy phần sau chữ "cho ..."
 */
function extractCategoryNames(rawMessage) {
  const names = [];

  // 1) lấy những phần trong dấu nháy
  const quoted = [...rawMessage.matchAll(/["“'‘](.+?)["”'’]/g)];
  for (const m of quoted) {
    const name = m[1].trim();
    if (name) names.push(name);
  }
  if (names.length > 0) return names;

  // 2) fallback: lấy phần sau chữ "cho "
  const lowerRaw = rawMessage.toLowerCase();
  const choMatch = lowerRaw.match(/cho\s+(.+)/);
  if (!choMatch) return [];

  let segment = choMatch[1];

  // cắt bớt mấy từ cuối hay gặp
  segment = segment.replace(/thang nay|thang truoc|bao nhieu|\?/gi, "");

  // bỏ "danh muc"/"danh mục" ở đầu nếu có
  segment = segment.replace(/^danh muc\s+|^danh mục\s+/i, "");

  segment
    .split(/,| và | va /i)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((n) => names.push(n));

  return names;
}
function extractWalletName(rawMessage) {
  // ưu tiên chuỗi trong dấu nháy
  const quoted = rawMessage.match(/["“'‘](.+?)["”'’]/);
  if (quoted) {
    return quoted[1].trim();
  }

  // fallback: lấy phần sau chữ "ví"/"vi"
  const lower = rawMessage.toLowerCase();
  const m = lower.match(/vi\s+(.+)/); // bắt sau chữ "vi ..."
  if (!m) return null;

  let name = m[1].trim();
  // bỏ dấu hỏi, chấm ở cuối
  name = name.replace(/[?.!]+$/, "");
  return name;
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

function detectPendingFieldFromHistory(history = []) {
  const recentAssistant = [...(history || [])]
    .reverse()
    .find((m) => m?.sender === "assistant" && String(m?.content || "").trim());

  const text = normalizeLoose(recentAssistant?.content || "");
  if (!text) return null;

  if (
    /vi nao|voi nao|vi co san|ten vi|vao vi nao|cong thu nhap vao vi|chon lai ten vi|chon lai vi/.test(
      text,
    )
  ) {
    return "wallet";
  }

  if (
    /danh muc nao|thu nhap nay thuoc danh muc nao|khoan chi nay thuoc danh muc nao|chon lai danh muc|thuoc danh muc nao/.test(
      text,
    )
  ) {
    return "category";
  }

  if (
    /bao nhieu tien|bao nhieu|so tien|nhap so tien/.test(text) &&
    !/thang|nam/.test(text)
  ) {
    return "amount";
  }

  if (/thu nhap hay chi tieu|loai giao dich|la thu nhap hay chi tieu/.test(text)) {
    return "type";
  }

  return null;
}

function buildClarificationReply(field) {
  switch (field) {
    case "wallet":
      return "Mình chưa nhận diện được ví. Bạn nhập đúng tên ví hoặc chọn một ví có sẵn nhé.";
    case "category":
      return "Mình chưa nhận diện được danh mục. Bạn chọn lại danh mục phù hợp nhé.";
    case "amount":
      return "Mình chưa nhận diện được số tiền. Bạn nhập số tiền cụ thể nhé.";
    case "type":
      return "Mình chưa rõ đây là thu nhập hay chi tiêu. Bạn chọn một trong hai nhé.";
    default:
      return "Mình chưa hiểu ý bạn lắm. Bạn nói rõ hơn một chút nhé.";
  }
}

function shouldUseClarificationFallback(history = [], latestMessage = "") {
  const pendingField = detectPendingFieldFromHistory(history);
  if (!pendingField) return null;

  const normalized = normalizeLoose(latestMessage);
  if (!normalized) return pendingField;

  const tokenCount = normalized.split(" ").filter(Boolean).length;
  if (tokenCount <= 2) return pendingField;

  if (/^[0-9.,]+$/.test(normalized)) return pendingField;

  return null;
}

/**
 * Hàm chính: dùng cho controller
 */
exports.callAssistant = async ({ userId, history, latestMessage }) => {
  try {
    const result = await runGeminiWithTools({ userId, history, latestMessage });
    const fallbackField = shouldUseClarificationFallback(history, latestMessage);

    if (
      fallbackField &&
      typeof result === "object" &&
      result &&
      (result.reply === "Xin lỗi, mình chưa xử lý được câu hỏi này." ||
        result.reply === "Xin lỗi, câu hỏi này cần nhiều bước xử lý hơn. Bạn thử hỏi cụ thể hơn (tháng/năm, danh mục, ví) nhé." ||
        !result.meta)
    ) {
      return {
        reply: buildClarificationReply(fallbackField),
        meta: {
          kind: "clarification",
          field: fallbackField,
          pendingField: fallbackField,
          prompt: buildClarificationReply(fallbackField),
        },
        status: 200,
      };
    }

    return result;
  } catch (err) {
    console.error("Gemini error:", err?.message || err);
    return "Xin lỗi, hệ thống trợ lý đang gặp lỗi. Bạn thử lại sau nhé.";
  }
};

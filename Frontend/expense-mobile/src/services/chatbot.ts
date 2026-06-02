import axios from "axios";
import { api } from "./api";

export type ChatSender = "user" | "assistant" | "system";

export type ChatMessage = {
  id?: string;
  sender: ChatSender;
  content: string;
  created_at?: string;
  // local-only fields
  _tempId?: string;
  _pending?: boolean;
};

export type ChatActionChoice = {
  label: string;
  value: string;
};

export type ChatbotMeta = {
  kind?: "clarification" | "action" | "info";
  action?: string | null;
  field?: string | null;
  pendingField?: string | null;
  prompt?: string | null;
  note?: string | null;
  followUps?: ChatActionChoice[];
  choices?: ChatActionChoice[];
  quotaLimited?: boolean;
  retryAfterSeconds?: number | null;
};

export type ChatSession = {
  id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
};

const CHATBOT_BASE = "api/chatbot";

export async function listChatSessions(): Promise<ChatSession[]> {
  const res = await api.get(`${CHATBOT_BASE}/sessions`);
  // hỗ trợ nhiều kiểu response khác nhau
  return res.data?.sessions ?? res.data ?? [];
}

export async function getChatSession(sessionId: string): Promise<{
  session?: ChatSession;
  messages: ChatMessage[];
}> {
  const res = await api.get(`${CHATBOT_BASE}/sessions/${sessionId}`);
  // kỳ vọng: { session, messages } hoặc { messages }
  return {
    session: res.data?.session ?? res.data?.data?.session,
    messages: res.data?.messages ?? res.data?.data?.messages ?? [],
  };
}

export async function askChatbot(params: {
  message: string;
  sessionId?: string | null;
}): Promise<{
  sessionId?: string;
  reply: string;
  meta?: ChatbotMeta | null;
  messages?: ChatMessage[];
  retryAfterSeconds?: number | null;
  quotaLimited?: boolean;
}> {
  try {
    const res = await api.post(
      `${CHATBOT_BASE}/ask`,
      {
        message: params.message,
        sessionId: params.sessionId ?? null,
      },
      { timeout: 60000 },
    );

    // Hỗ trợ response linh hoạt:
    // { reply, sessionId } hoặc { data: { reply, sessionId } }
    const payload = res.data?.data ?? res.data ?? {};
    return {
      sessionId: payload.sessionId ?? payload.session?.id,
      reply: payload.reply ?? payload.answer ?? "",
      meta: payload.meta ?? null,
      messages: payload.messages,
      retryAfterSeconds: payload.retryAfterSeconds ?? payload.meta?.retryAfterSeconds ?? null,
      quotaLimited: Boolean(
        payload.meta?.quotaLimited ||
          res.status === 429 ||
          payload.retryAfterSeconds,
      ),
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const payload = err.response?.data?.data ?? err.response?.data ?? {};
      const retryAfterSeconds =
        payload.retryAfterSeconds ??
        payload.meta?.retryAfterSeconds ??
        Number(err.response?.headers?.["retry-after"] ?? NaN) ??
        null;

      if (status === 429) {
        return {
          reply:
            payload.reply ||
            payload.message ||
            "Bạn đang bị giới hạn lượt gọi AI (quota). Vui lòng thử lại sau ít phút nhé.",
          meta: payload.meta ?? { kind: "info", quotaLimited: true, retryAfterSeconds },
          messages: payload.messages,
          retryAfterSeconds: Number.isFinite(Number(retryAfterSeconds))
            ? Number(retryAfterSeconds)
            : null,
          quotaLimited: true,
        };
      }
    }

    throw err;
  }
}

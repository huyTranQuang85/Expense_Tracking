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
  messages?: ChatMessage[];
}> {
  const res = await api.post(
    `${CHATBOT_BASE}/ask`,
    {
      message: params.message,
      sessionId: params.sessionId ?? null,
    },
    { timeout: 60000 }
  );

  // Hỗ trợ response linh hoạt:
  // { reply, sessionId } hoặc { data: { reply, sessionId } }
  const payload = res.data?.data ?? res.data ?? {};
  return {
    sessionId: payload.sessionId ?? payload.session?.id,
    reply: payload.reply ?? payload.answer ?? "",
    messages: payload.messages,
  };
}
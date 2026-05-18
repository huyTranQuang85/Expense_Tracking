// src/controllers/chatbotController.js
const pool = require("../db");
const { callAssistant } = require("../services/chatbotService");

exports.ask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Nội dung câu hỏi không được để trống",
      });
    }

    let currentSessionId = sessionId;

    // Nếu chưa có sessionId -> tạo mới
    if (!currentSessionId) {
      const result = await pool.query(
        `INSERT INTO chat_sessions (user_id, title)
         VALUES ($1, $2)
         RETURNING id`,
        [userId, message.slice(0, 60)],
      );
      currentSessionId = result.rows[0].id;
    } else {
      // kiểm tra session có thuộc về user không
      const check = await pool.query(
        `SELECT 1 FROM chat_sessions WHERE id = $1 AND user_id = $2`,
        [currentSessionId, userId],
      );
      if (check.rowCount === 0) {
        return res.status(404).json({
          status: "error",
          message: "Không tìm thấy phiên chat",
        });
      }
    }

    // lưu message của user
    await pool.query(
      `INSERT INTO chat_messages (session_id, sender, content)
       VALUES ($1, 'user', $2)`,
      [currentSessionId, message],
    );

    // lấy lịch sử gần đây để gửi cho model (nếu cần)
    const historyRes = await pool.query(
      `SELECT sender, content
       FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC
       LIMIT 20`,
      [currentSessionId],
    );
    const history = historyRes.rows;

    // 👉 TOÀN BỘ logic intent + đọc DB đều nằm trong callAssistant
    const assistantReply = await callAssistant({
      userId,
      history,
      latestMessage: message,
    });

    // lưu reply
    await pool.query(
      `INSERT INTO chat_messages (session_id, sender, content)
       VALUES ($1, 'assistant', $2)`,
      [currentSessionId, assistantReply],
    );

    // cập nhật updated_at
    await pool.query(
      `UPDATE chat_sessions SET updated_at = now() WHERE id = $1`,
      [currentSessionId],
    );

    res.json({
      status: "success",
      data: {
        sessionId: currentSessionId,
        reply: assistantReply,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.listSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM chat_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId],
    );

    res.json({ status: "success", data: result.rows });
  } catch (err) {
    next(err);
  }
};

exports.getSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const sessionRes = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM chat_sessions
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );

    if (sessionRes.rowCount === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Không tìm thấy phiên chat" });
    }

    const messagesRes = await pool.query(
      `SELECT id, sender, content, created_at
       FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId],
    );

    res.json({
      status: "success",
      data: {
        session: sessionRes.rows[0],
        messages: messagesRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

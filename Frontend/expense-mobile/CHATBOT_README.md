# Chatbot AI trong Expense Tracking

Tài liệu này mô tả phần chatbot AI đã có sẵn trong dự án, cách nó được gắn vào app, và luồng xử lý từ giao diện tới backend.

## 1. Người dùng truy cập chatbot ở đâu

- Chatbot xuất hiện dưới dạng một **bong bóng nổi** trong vùng đã đăng nhập.
- Bong bóng này mở một **modal chat** khi người dùng chạm vào.
- Trong app hiện tại, chatbot được gắn ở tầng điều hướng chính nên nó đi theo các màn đã đăng nhập.
- Trên các màn thuộc tab chính, bong bóng nằm gần góc dưới phải và tránh đè lên tab bar.
- Trên các màn stack khác như form hoặc cài đặt, bong bóng vẫn còn đó nhưng được đẩy sát mép dưới hơn để bớt che UI.

## 2. Luồng hoạt động

1. Người dùng đăng nhập thành công.
2. App render khu vực đã đăng nhập.
3. `ChatbotOverlay` được bọc quanh `Stack.Navigator`.
4. `ChatbotFab` hiện bong bóng chat.
5. Chạm vào bong bóng sẽ mở `ChatbotModal`.
6. `ChatbotModal` tải session chat gần nhất và hiển thị lịch sử.
7. Khi gửi tin nhắn, frontend gọi backend `api/chatbot/ask`.
8. Backend dùng Gemini để xử lý câu hỏi và trả lời theo dữ liệu tài chính của user.

## 3. Các file chính

- [App.tsx](App.tsx)
- [ChatbotOverlay.tsx](src/components/chatbot/ChatbotOverlay.tsx)
- [ChatbotFab.tsx](src/components/chatbot/ChatbotFab.tsx)
- [ChatbotModal.tsx](src/components/chatbot/ChatbotModal.tsx)
- [chatbot.ts](src/services/chatbot.ts)
- [index.js](../../Backend/src/index.js)
- [chatbotRoutes.js](../../Backend/src/routes/chatbotRoutes.js)
- [chatbotController.js](../../Backend/src/controllers/chatbotController.js)
- [chatbotService.js](../../Backend/src/services/chatbotService.js)
- [geminiAssistantService.js](../../Backend/src/services/geminiAssistantService.js)

## 4. Backend API đang dùng

Chatbot sử dụng các route sau:

- `POST /api/chatbot/ask`
- `GET /api/chatbot/sessions`
- `GET /api/chatbot/sessions/:sessionId`

Các route này yêu cầu token đăng nhập hợp lệ.

## 5. Những gì chatbot đang làm

- Trả lời câu hỏi về thu nhập, chi tiêu, ví, danh mục, ngân sách.
- Lưu session chat theo user.
- Tải lại lịch sử chat gần nhất khi mở modal.
- Hiển thị avatar user nếu lấy được từ profile.
- Dùng hiệu ứng gõ chữ cho câu trả lời của bot.
- Có thể tự xử lý thao tác thật qua chat:
  - tạo danh mục chi tiêu hoặc thu nhập
  - tạo ví mới
  - thêm thu nhập vào ví
  - nhận xét ngân sách tháng
  - nhận xét ví hiện tại
  - đề xuất ví phù hợp theo mục đích hoặc số tiền

## 6. Những lưu ý khi dùng

- Chatbot chỉ hoạt động sau khi đăng nhập.
- Nếu backend chưa chạy, bong bóng vẫn mở được nhưng tin nhắn sẽ không gửi đi được.
- Nếu tài khoản chưa có session chat nào, modal sẽ tạo một lời chào mặc định.
- Dữ liệu trả lời phụ thuộc vào số liệu thực tế trong database.

## 7. Cách kiểm tra nhanh

- Mở app sau khi đăng nhập.
- Ở màn Tổng quan, tìm bong bóng chat nổi.
- Chạm vào bong bóng để mở modal.
- Gửi câu hỏi như:
  - "Tháng này chi bao nhiêu?"
  - "Top 3 giao dịch chi tiêu lớn nhất tháng này"
  - "Số dư ví hiện tại là bao nhiêu?"
  - "Tạo danh mục chi tiêu 'Đi lại'"
  - "Thêm thu nhập 2 triệu vào ví Momo"
  - "Tạo ví mới tên Tiết kiệm"
  - "Nhận xét budget tháng này"
  - "Đề xuất ví phù hợp để nhận lương"

## 8. Nếu không thấy bong bóng

- Kiểm tra xem bạn đã đăng nhập chưa.
- Kiểm tra app có render `ChatbotOverlay` trong vùng authenticated hay không.
- Kiểm tra backend đã mount `/api/chatbot` chưa.
- Kiểm tra `GEMINI_API_KEY` và `GEMINI_MODEL` trong backend env nếu câu trả lời lỗi.

## 9. Các lệnh AI mới

Các câu tự nhiên dưới đây sẽ được bot tự hiểu và thực thi nếu đủ dữ liệu:

- "Tạo danh mục chi tiêu ăn uống"
- "Tạo danh mục thu nhập thưởng"
- "Thêm ví mới tên MoMo số dư 2000000"
- "Thêm thu nhập 1500000 vào ví lương"
- "Nhận xét ngân sách tháng này"
- "Nhận xét các ví hiện tại"
- "Đề xuất ví phù hợp để chi 500000"

Nếu thiếu dữ liệu, bot sẽ hỏi lại đúng một trường còn thiếu thay vì yêu cầu bạn nhập tay vào màn hình khác.

## 10. Gợi ý trong luồng chat

Phần gợi ý nhanh hiện không còn là một khối cố định ở đầu modal nữa. Các gợi ý được hiển thị trực tiếp dưới tin nhắn của bot dưới dạng chip hành động, nên không chiếm chiều cao của khung chat và không che ô nhập câu hỏi.

Backend trả thêm `meta` kèm câu trả lời từ `POST /api/chatbot/ask`. Frontend dùng `meta.choices` và `meta.followUps` để render chip trong message. Khi user bấm chip, nội dung chip được gửi lại như một tin nhắn bình thường để AI tiếp tục xử lý theo ngữ cảnh hội thoại.

Ví dụ:

- Sau khi tạo ví mới, bot có thể gợi ý thêm tiền vào ví, đổi icon ví, hoặc xem danh sách ví.
- Khi thêm giao dịch nhưng thiếu ví, bot hỏi muốn dùng ví có sẵn hay tạo ví mới, đồng thời hiển thị danh sách ví có sẵn.
- Khi thiếu danh mục, bot hiển thị các danh mục phù hợp theo loại giao dịch thu nhập hoặc chi tiêu.
- Sau khi nhận xét budget hoặc ví, bot gợi ý các bước tiếp theo như xem top giao dịch, thêm giao dịch khác, hoặc đề xuất ví.

## 11. Tool hành động AI hiện có

Các tool hành động chính trong `geminiAssistantService.js`:

- `create_category_action`: tạo danh mục thu nhập hoặc chi tiêu.
- `add_wallet_action`: tạo ví mới.
- `add_income_action`: thêm thu nhập nhanh vào ví.
- `add_transaction_action`: thêm giao dịch thu nhập hoặc chi tiêu, có hỏi lại ví/danh mục nếu thiếu.
- `comment_budget_action`: nhận xét budget tháng.
- `comment_wallet_action`: nhận xét tình trạng ví.
- `suggest_wallet_action`: đề xuất ví phù hợp theo mục đích hoặc số tiền.

Các thao tác này dùng service gốc của backend, nên vẫn đi qua validate và trigger database hiện có. Với bảng `transactions`, số dư ví được cộng/trừ bằng trigger `trgfn_tx_wallet_balance()` dựa trên loại danh mục `income` hoặc `expense`.

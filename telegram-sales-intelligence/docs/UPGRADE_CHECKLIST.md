# Upgrade checklist

- [x] Manage Customer có nút thêm khách hàng từ private chat Telegram và tự đồng bộ message.
- [x] Transactions có trạng thái đang tư vấn, chốt thành công, không thành công và ngừng tư vấn.
- [x] Conversation mới liên kết conversation trước; summary cũ được nạp vào context AI.
- [x] Workflow có node/edge có hướng, mũi tên, kéo thả lưu vị trí và bố cục ngang/dọc.
- [x] Node và edge đều mở được message reference; người dùng có thể sửa node/edge và khóa node.
- [x] Message event debounce 5 phút và scanner 5 phút tự bù conversation chưa phân tích.
- [x] Customer Detail có đủ 9 nhóm: định danh, doanh nghiệp, nhu cầu, giải pháp, ngân sách, rào cản, giao tiếp, khả năng chốt và tiến trình quyết định.
- [x] Insight Collection có diễn giải quá trình tìm insight bằng ngôn ngữ tự nhiên; luồng kỹ thuật chỉ mở khi người dùng yêu cầu.
- [x] Seed có 98 insight cho anomaly detection, clustering, classification và association rule mining.
- [x] Job insight, employee profile và daily report chạy lúc 00:00 theo timezone organization.
- [x] Employee Profile có KPI, kinh nghiệm tổng thể và workflow playbook chi tiết theo từng nhóm khách hàng.
- [x] Business Report sinh đồng thời HTML và LaTeX, dùng chung snapshot dữ liệu và lưu trong MinIO.
- [x] AI provider thật dùng `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`; fake provider chỉ dành cho demo.
- [x] GramJS dùng Telegram OTP/2FA thật khi có `TELEGRAM_API_ID` và `TELEGRAM_API_HASH`.
- [x] Telegram `StringSession` mã hóa AES-256-GCM và tự reconnect sau khi collector restart.
- [x] OpenClaw/MCP có tool đọc customer, workflow, experience, insight, metric và report.
- [x] AI không có tool gửi tin thay sale và không có quyền tự đóng/chốt deal.
- [x] Appointment được phát hiện thành metadata; Google Calendar chỉ tạo draft sau xác nhận của sale.

## Seed runtime đã xác minh

| Dữ liệu               | Số lượng |
| --------------------- | -------: |
| Customer              |      252 |
| Rich customer profile |      250 |
| Transaction           |      252 |
| Message               |    2,014 |
| Insight               |       98 |
| Insight reference     |      286 |
| Employee              |       16 |
| Employee experience   |       75 |

Tài khoản demo: `admin@demo.local / Demo123!` và `sale@demo.local / Demo123!`.

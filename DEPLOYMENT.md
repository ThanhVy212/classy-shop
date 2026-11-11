# Triển khai: API cùng origin qua Vercel

Tài liệu này mô tả cách chạy frontend (Vercel) và backend (Render) sao cho
**cookie refresh là first-party**. Đây là điều kiện để phiên đăng nhập không bị
mất sau khi reload trên Safari/ITP hoặc trình duyệt chặn third-party cookie.

## Kiến trúc

```
Trình duyệt
   │  https://<frontend-domain>/api/*
   ▼
Vercel (rewrite /api/* → Render)      ← cookie thuộc domain frontend
   │
   ▼
https://classy-shop-backend.onrender.com/api/*
```

Trình duyệt chỉ thấy một origin duy nhất, nên `Set-Cookie: refreshToken` không
còn là cookie bên thứ ba.

Ngoại lệ: **WebSocket của admin** vẫn kết nối trực tiếp tới Render (Vercel
rewrite không proxy WebSocket). Socket này xác thực bằng access token trong bộ
nhớ, không dùng cookie.

## 1. Vercel

`vercel.json` (ở cả thư mục gốc repo và `frontend/`) đã thêm rewrite:

```json
{
  "source": "/api/:path*",
  "destination": "https://classy-shop-backend.onrender.com/api/:path*"
}
```

Rewrite này phải đứng **trước** rewrite catch-all `/(.*) → /index.html`.
Header `x-vercel-enable-rewrite-caching: 0` tắt cache CDN cho `/api/*` để
response auth (`Set-Cookie`, redirect) không bao giờ bị cache.

Nếu backend đổi domain, cập nhật lại `destination` ở cả hai file.

### Biến môi trường trên Vercel

Trong **Project → Settings → Environment Variables**, đặt (hoặc xoá nếu đang có
giá trị cũ, vì biến trên dashboard sẽ ghi đè `.env.production`):

| Biến              | Giá trị                                    |
| ----------------- | ------------------------------------------ |
| `VITE_API_URL`    | `/api`                                     |
| `VITE_SOCKET_URL` | `https://classy-shop-backend.onrender.com` |

Sau khi đổi biến môi trường phải **redeploy** (Vite nhúng biến lúc build).

## 2. Render (backend)

| Biến                  | Giá trị                                                      |
| --------------------- | ------------------------------------------------------------ |
| `CLIENT_URL`          | `https://<frontend-domain>` (đúng origin, không có `/` cuối) |
| `GOOGLE_CALLBACK_URL` | `https://<frontend-domain>/api/auth/callback/google`         |
| `TRUST_PROXY`         | `2` (client → Vercel → Render)                               |

- `CLIENT_URL` được dùng cho CORS của REST API và Socket.IO, cho redirect sau
  khi đăng nhập Google, và để suy ra OAuth callback. Nếu có nhiều domain, ngăn
  cách bằng dấu phẩy (domain đầu tiên được dùng làm origin chính).
- Ở production backend tự suy ra callback từ `CLIENT_URL`. Nếu
  `GOOGLE_CALLBACK_URL` trỏ sang host khác, backend ghi cảnh báo và dùng URL
  suy ra để cookie `oauthState` vẫn first-party. URL đó **vẫn phải** được đăng
  ký trong Google Cloud Console.
- `TRUST_PROXY=2` giúp rate limit đọc đúng IP người dùng thay vì IP của edge
  Vercel. `TRUST_PROXY=true` bị chặn vì cho phép giả mạo `X-Forwarded-For`.

## 3. Google Cloud Console

Trong **APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect
URIs**, thêm:

```
https://<frontend-domain>/api/auth/callback/google
```

Google bắt buộc `redirect_uri` gửi lên phải khớp tuyệt đối với giá trị đã đăng
ký. Vì callback giờ đi qua Vercel, URI phải là domain frontend (không phải
domain Render).

Có thể giữ URI `http://localhost:8000/api/auth/callback/google` cho môi trường
dev.

> Nếu thiếu URI này, Google hiển thị `Error 400: redirect_uri_mismatch` và
> không bao giờ gọi về backend.

## 4. Kiểm tra sau khi deploy

1. Gọi API qua frontend:

   ```bash
   curl -i https://<frontend-domain>/api/products
   ```

   Phải trả JSON của backend (không phải `index.html`).

2. Bắt đầu OAuth:

   ```bash
   curl -s -D - -o NUL https://<frontend-domain>/api/auth/google
   ```

   `Location` phải có `redirect_uri=https%3A%2F%2F<frontend-domain>%2Fapi%2Fauth%2Fcallback%2Fgoogle`.

3. Đăng nhập, xem response `POST /api/auth/login`:

   ```
   Set-Cookie: refreshToken=...; Path=/; HttpOnly; Secure; SameSite=Lax
   ```

   `SameSite=Lax` (không còn `None`/`Partitioned`) xác nhận cookie đã first-party.

4. Reload trang nhiều lần → vẫn đăng nhập.

5. Đăng nhập Google → quay về `/oauth/callback?...` thành công.

6. Vào `/admin` bằng tài khoản admin → biểu tượng socket "Live" phải kết nối
   được (kiểm tra trong DevTools → Network → WS).

## 5. Bảo mật

- Access token **chỉ** nằm trong bộ nhớ (`services/api.ts`). Không đưa vào
  `localStorage`/`sessionStorage` chỉ để chống logout.
- Refresh token là cookie `httpOnly`, `Secure`, `SameSite=Lax`, không đọc được
  bằng JavaScript.
- `localStorage` chỉ lưu cờ `classyshop_has_session` (có/không thể có phiên),
  không chứa token.
- Route admin vẫn trả 404 cho tài khoản không phải admin, không redirect và
  không đụng tới phiên đăng nhập.

### Tùy chọn: chặn truy cập trực tiếp vào Render

Rewrite của Vercel có thể gắn một header bí mật để backend từ chối request
không đi qua Vercel (xem tài liệu Vercel "Restricting your origin to Vercel
traffic"). Nếu làm, cần cho phép header đó trên cả handshake Socket.IO, vì
socket kết nối trực tiếp tới Render.

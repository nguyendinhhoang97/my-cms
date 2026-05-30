# Deployment Guide for Cloudflare CMS

Hướng dẫn triển khai **my-cms** — Astro SSR + Cloudflare Workers + D1 + R2.

## 1. Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [GitHub account](https://github.com) (để connect CI/CD)
- **Node.js 22+** (xem `engines` trong `package.json`)
- Wrangler CLI: `npm install -g wrangler` hoặc dùng `npx wrangler`

## 2. Setup D1 Database

```bash
# Tạo database trên Cloudflare
npx wrangler d1 create my-cms-db
```

Copy `database_id` từ output và cập nhật `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-cms-db"
database_id = "YOUR_DATABASE_ID_HERE"
migrations_dir = "migrations"
```

Chạy migrations:

```bash
# Local (dev)
npm run migrate

# Production (remote D1)
npm run migrate -- --remote
```

## 3. Setup R2 Bucket

1. Cloudflare Dashboard → **R2** → **Create bucket** (vd: `my-cms-media`)
2. **R2 → Manage R2 API Tokens** → tạo token với quyền Read & Write
3. (Tuỳ chọn) Gắn **Custom Domain** cho public URL media
4. Thêm secrets:

```bash
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put R2_BUCKET_NAME
npx wrangler secret put R2_PUBLIC_URL
npx wrangler secret put R2_ENDPOINT
```

Local dev: copy `.env.example` → `.dev.vars` và điền giá trị.

## 4. Environment Variables

| Variable | Required | Mô tả |
|----------|----------|--------|
| `DB` (binding) | ✅ | D1 database — cấu hình trong `wrangler.toml` |
| `R2_ACCESS_KEY_ID` | ✅* | R2 API token (*nếu dùng media upload) |
| `R2_SECRET_ACCESS_KEY` | ✅* | R2 secret |
| `R2_BUCKET_NAME` | ✅* | Tên bucket |
| `R2_PUBLIC_URL` | ✅* | Public URL / custom domain |
| `R2_ENDPOINT` | ✅* | `https://<account_id>.r2.cloudflarestorage.com` |
| `EMAIL_API_KEY` | ❌ | Resend API key (email liên hệ) |
| `EMAIL_FROM` | ❌ | From address cho email |

Xem đầy đủ: [`.env.example`](./.env.example)

## 5. Deploy to Cloudflare

### Option A: Wrangler (Workers)

```bash
npm install
npm run build
npx wrangler deploy
```

Astro adapter tự cấu hình:
- Worker entry: `dist/server/entry.mjs`
- Static assets: `dist/client/`

### Option B: Cloudflare Pages (Git connect)

1. Push repo lên GitHub
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → Connect Git
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** 22
4. Thêm **D1 binding** `DB` trong Settings → Bindings
5. Thêm environment variables / secrets (R2, email)
6. Deploy

## 6. Create First Admin User

Sau khi migration chạy xong trên D1 remote:

```bash
npm run create-admin -- --email=admin@example.com --password=YourSecurePass123 --remote
```

Hoặc local dev:

```bash
npm run migrate
npm run create-admin -- --email=admin@example.com --password=YourSecurePass123
```

Đăng nhập tại `/login` → redirect `/admin`.

## 7. Verify Deployment

- [ ] `/login` — đăng nhập admin thành công
- [ ] `/admin` — dashboard hiển thị
- [ ] `/admin/posts/create` — tạo bài test, publish
- [ ] `/` — bài viết hiển thị trên blog
- [ ] `/posts/[slug]` — chi tiết, view counter, TOC
- [ ] `/admin/media` — upload ảnh R2 (nếu đã cấu hình)
- [ ] `/admin/backup` — export JSON database
- [ ] `/robots.txt`, `/sitemap.xml`, `/rss.xml`

## 8. Cache Strategy

File [`public/_headers`](./public/_headers) cấu hình cache cho static assets:

```
/assets/*     → max-age=31536000, immutable
/_astro/*     → max-age=31536000, immutable
/images/*     → max-age=86400
```

Middleware bổ sung `Cache-Control` cho `/_astro/` khi deploy Workers.

## 9. Backup & Restore

**Export:** Admin → Backup → **Export Database** (JSON download).

**Export + R2:** **Export & lưu R2** — lưu bản sao vào bucket prefix `backups/`.

**Restore:** Hiện tại restore thủ công qua SQL/D1 console từ JSON export.

## 10. Useful Commands

```bash
npm run dev              # Local dev server
npm run build            # Production build
npm run preview          # Preview build
npm run migrate          # Run D1 migrations
npm run migrate -- --remote
npm run create-admin -- --email=... --password=...
npm run db:studio        # Drizzle Studio (local SQLite)
```

## 11. Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| `ENOENT package.json` | Chạy lệnh trong thư mục `my-cms/` |
| D1 binding not found | Kiểm tra `wrangler.toml` + binding trong Dashboard |
| R2 upload failed | Verify secrets và `R2_PUBLIC_URL` |
| Admin 403 | Chỉ role `admin` vào `/admin` — dùng `create-admin` |
| Migration failed | Chạy từng file: `npm run migrate -- --file=migrations/0001_initial.sql` |

---

Built with [Astro](https://astro.build) + [Cloudflare D1](https://developers.cloudflare.com/d1/) + [R2](https://developers.cloudflare.com/r2/).

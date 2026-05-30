/**
 * Kiểu binding Cloudflare Workers (D1, R2 env, …).
 * Khớp `wrangler.toml` và `import { env } from 'cloudflare:workers'`.
 */
interface Env {
	DB: D1Database;
	/** R2 S3-compatible credentials — set qua `.dev.vars` hoặc Wrangler secrets */
	R2_ACCESS_KEY_ID: string;
	R2_SECRET_ACCESS_KEY: string;
	R2_BUCKET_NAME: string;
	R2_PUBLIC_URL: string;
	R2_ENDPOINT: string;
	/** Optional — gửi email liên hệ (Resend API key) */
	EMAIL_API_KEY?: string;
	EMAIL_FROM?: string;
}

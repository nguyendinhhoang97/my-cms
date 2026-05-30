/**
 * @file src/lib/security.ts
 * Tiện ích chống XSS và làm sạch input.
 *
 * Astro mặc định escape HTML trong `{expression}` — vẫn dùng các hàm này
 * khi ghép chuỗi hoặc hiển thị dữ liệu user trong attribute.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
};

/**
 * Escape ký tự đặc biệt HTML — chống XSS khi render text/attribute.
 */
export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

/**
 * Chuẩn hóa username: chữ thường, trim, giới hạn độ dài.
 */
export function normalizeUsername(username: string): string {
	return username.trim().toLowerCase().slice(0, 64);
}

/**
 * Chuẩn hóa email.
 */
export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase().slice(0, 255);
}

/**
 * Kiểm tra email hợp lệ (đơn giản, đủ cho CMS).
 */
export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Username: chữ, số, gạch dưới, 3–32 ký tự.
 */
export function isValidUsername(username: string): boolean {
	return /^[a-z0-9_]{3,32}$/.test(username);
}

/**
 * Sinh token ngẫu nhiên hex (CSRF, …).
 */
export function generateSecureToken(byteLength = 32): string {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * So sánh chuỗi constant-time (giảm timing attack trên token).
 */
export function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i++) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

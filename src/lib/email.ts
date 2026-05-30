/**
 * Gửi email notification (optional — Cloudflare Email Workers / Resend).
 * Nếu chưa cấu hình, bỏ qua im lặng.
 */

import { env } from 'cloudflare:workers';

export interface ContactNotification {
	name: string;
	email: string;
	message: string;
}

/** Thử gửi email thông báo liên hệ mới. */
export async function sendContactNotification(
	toEmail: string,
	contact: ContactNotification,
): Promise<boolean> {
	if (!toEmail.trim()) return false;

	const apiKey = env.EMAIL_API_KEY;
	const fromEmail = env.EMAIL_FROM ?? 'noreply@example.com';

	if (!apiKey) {
		console.info('[email] EMAIL_API_KEY chưa cấu hình — bỏ qua gửi email.');
		return false;
	}

	try {
		// Resend-compatible API (có thể thay bằng Cloudflare Email Routing + Worker)
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: fromEmail,
				to: [toEmail],
				subject: `[my-cms] Liên hệ mới từ ${contact.name}`,
				text: `Tên: ${contact.name}\nEmail: ${contact.email}\n\n${contact.message}`,
			}),
		});

		if (!res.ok) {
			console.error('[email] Gửi thất bại:', await res.text());
			return false;
		}
		return true;
	} catch (err) {
		console.error('[email]', err);
		return false;
	}
}

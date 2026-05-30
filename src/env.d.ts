/**
 * Kiểu global cho Astro locals và Cloudflare Workers.
 */
/// <reference types="@cloudflare/workers-types" />

import type { SafeUser } from './lib/auth';

declare namespace App {
	interface Locals {
		/** User đã đăng nhập (không có password); null nếu khách */
		user: SafeUser | null;
		/** Token CSRF cho form — render trong hidden input */
		csrfToken: string;
		/** Execution context Cloudflare (nếu cần waitUntil, …) */
		cfContext?: ExecutionContext;
	}
}

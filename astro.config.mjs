// @ts-check
/**
 * Cấu hình Astro cho CMS chạy trên Cloudflare Workers.
 *
 * - `output: 'server'`: bật SSR — mỗi request được render phía server (Worker).
 * - `adapter: cloudflare()`: build và deploy lên Cloudflare; runtime có binding D1 qua `wrangler.toml`.
 * - Tailwind v4 qua Vite plugin (không dùng @astrojs/tailwind integration riêng).
 *
 * @see https://docs.astro.build/en/guides/integrations-guide/cloudflare/
 */
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	/** SSR: trang và API routes render động trên Worker */
	output: 'server',

	/** Adapter Cloudflare — tích hợp D1, KV, R2 qua env bindings */
	adapter: cloudflare(),

	vite: {
		plugins: [tailwindcss()],
		server: {
			// Tránh reload loop: Wrangler ghi D1/KV vào .wrangler/ mỗi request
			watch: {
				ignored: ['**/.wrangler/**', '**/dist/**', '**/.astro/**'],
			},
		},
	},
});

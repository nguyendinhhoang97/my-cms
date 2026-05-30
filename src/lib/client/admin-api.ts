/**
 * @file src/lib/client/admin-api.ts
 * Fetch API dùng chung cho admin (CSRF, JSON).
 */

export function getCsrfToken(): string {
	return (
		document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''
	);
}

export interface ApiJsonError {
	error?: string;
}

export async function adminFetch(
	url: string,
	options: RequestInit & { json?: unknown } = {},
): Promise<Response> {
	const csrf = getCsrfToken();
	const headers: Record<string, string> = {
		Accept: 'application/json',
		'X-CSRF-Token': csrf,
		...(options.headers as Record<string, string>),
	};

	let body = options.body;
	if (options.json !== undefined) {
		headers['Content-Type'] = 'application/json';
		body = JSON.stringify({ ...options.json, csrf_token: csrf });
	}

	return fetch(url, {
		...options,
		body,
		headers,
		credentials: 'same-origin',
	});
}

export async function parseApiResponse<T>(res: Response): Promise<{
	ok: boolean;
	data?: T;
	error?: string;
}> {
	const json = (await res.json().catch(() => ({}))) as ApiJsonError & {
		ok?: boolean;
		data?: T;
	};
	if (!res.ok) {
		return { ok: false, error: json.error ?? `Lỗi ${res.status}` };
	}
	return { ok: true, data: json.data as T };
}

/** Hiển thị thông báo form */
export function setFormMessage(
	el: HTMLElement | null,
	text: string,
	type: 'success' | 'error' | 'hidden',
): void {
	if (!el) return;
	if (type === 'hidden') {
		el.classList.add('hidden');
		return;
	}
	el.textContent = text;
	el.classList.remove('hidden');
	el.classList.toggle('bg-red-500/10', type === 'error');
	el.classList.toggle('text-red-300', type === 'error');
	el.classList.toggle('border-red-500/30', type === 'error');
	el.classList.toggle('bg-emerald-500/10', type === 'success');
	el.classList.toggle('text-emerald-300', type === 'success');
	el.classList.toggle('border-emerald-500/30', type === 'success');
	el.classList.add('border');
}

/** Loading state cho nút submit */
export function setButtonLoading(btn: HTMLButtonElement | null, loading: boolean): void {
	if (!btn) return;
	btn.disabled = loading;
	btn.classList.toggle('btn-loading', loading);
	const label = btn.dataset.label ?? btn.textContent ?? '';
	if (loading) {
		btn.dataset.label = label;
		btn.textContent = btn.dataset.loadingText ?? 'Đang lưu...';
	} else {
		btn.textContent = btn.dataset.label || label;
	}
}

/**
 * Admin newsletter list actions.
 */
import { adminFetch, parseApiResponse } from '../lib/client/admin-api';

async function deleteSubscriber(id: number, row: HTMLElement): Promise<void> {
	if (!confirm('Xóa email khỏi danh sách newsletter?')) return;

	const res = await adminFetch('/api/newsletter/export', {
		method: 'DELETE',
		json: { id },
	});
	const result = await parseApiResponse(res);
	if (!result.ok) {
		alert(result.error ?? 'Xóa thất bại.');
		return;
	}
	row.remove();
}

export function initNewsletterAdmin(): void {
	document.querySelectorAll<HTMLButtonElement>('[data-delete-subscriber]').forEach((btn) => {
		btn.addEventListener('click', () => {
			const id = Number(btn.dataset.deleteSubscriber);
			const row = btn.closest('[data-subscriber-id]');
			if (id && row instanceof HTMLElement) void deleteSubscriber(id, row);
		});
	});
}

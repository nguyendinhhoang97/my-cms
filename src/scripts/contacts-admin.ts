/**
 * Admin contacts moderation.
 */
import { adminFetch, parseApiResponse } from '../lib/client/admin-api';

async function contactAction(
	id: number,
	action: 'handle' | 'delete',
	row: HTMLElement,
): Promise<void> {
	if (action === 'delete' && !confirm('Xóa liên hệ này?')) return;

	const res = await adminFetch('/api/contacts', {
		method: action === 'delete' ? 'DELETE' : 'PUT',
		json: action === 'handle' ? { id, status: 'handled' } : { id },
	});
	const result = await parseApiResponse(res);
	if (!result.ok) {
		alert(result.error ?? 'Thao tác thất bại.');
		return;
	}
	row.remove();
	const empty = document.getElementById('contacts-empty');
	const tbody = document.getElementById('contacts-tbody');
	if (tbody && tbody.children.length === 0 && empty) {
		empty.classList.remove('hidden');
	}
}

export function initContactsAdmin(): void {
	document.querySelectorAll<HTMLButtonElement>('[data-contact-action]').forEach((btn) => {
		btn.addEventListener('click', () => {
			const id = Number(btn.dataset.contactId);
			const action = btn.dataset.contactAction as 'handle' | 'delete';
			const row = btn.closest('[data-contact-id]');
			if (id && action && row instanceof HTMLElement) {
				void contactAction(id, action, row);
			}
		});
	});
}

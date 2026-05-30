/**
 * Admin comments moderation — approve, spam, delete.
 */
import { adminFetch, parseApiResponse } from '../lib/client/admin-api';

function removeRow(id: number): void {
	document.querySelector(`[data-comment-id="${id}"]`)?.remove();
	const empty = document.getElementById('comments-empty');
	const tbody = document.getElementById('comments-tbody');
	if (tbody && tbody.children.length === 0 && empty) {
		empty.classList.remove('hidden');
	}
	updatePendingBadge();
}

function updatePendingBadge(): void {
	const badge = document.getElementById('pending-badge');
	const remaining = document.querySelectorAll('[data-comment-id]').length;
	if (badge) {
		badge.textContent = String(remaining);
		badge.classList.toggle('hidden', remaining === 0);
	}
}

async function moderate(
	id: number,
	action: 'approve' | 'spam' | 'delete',
	btn: HTMLButtonElement,
): Promise<void> {
	btn.disabled = true;
	const path =
		action === 'delete'
			? `/api/comments/${id}`
			: `/api/comments/${id}/${action}`;

	const res = await adminFetch(path, {
		method: action === 'delete' ? 'DELETE' : 'PUT',
		json: {},
	});
	const result = await parseApiResponse(res);

	if (!result.ok) {
		alert(result.error ?? 'Thao tác thất bại.');
		btn.disabled = false;
		return;
	}

	removeRow(id);
}

export function initCommentsAdmin(): void {
	document.querySelectorAll<HTMLButtonElement>('[data-comment-action]').forEach((btn) => {
		btn.addEventListener('click', () => {
			const id = Number(btn.dataset.commentId);
			const action = btn.dataset.commentAction as 'approve' | 'spam' | 'delete';
			if (!id || !action) return;

			if (action === 'delete' && !confirm('Xóa vĩnh viễn bình luận này?')) return;

			void moderate(id, action, btn);
		});
	});
}

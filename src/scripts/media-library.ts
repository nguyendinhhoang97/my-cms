/**
 * Admin media library — gallery grid, bulk delete, copy link.
 */
import { adminFetch, parseApiResponse } from '../lib/client/admin-api';
import type { MediaListItem } from '../lib/media/client-image';

interface MediaPageData {
	items: MediaListItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
}

const selected = new Set<string>();

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function updateBulkBar(): void {
	const bar = document.getElementById('bulk-actions');
	const count = document.getElementById('selected-count');
	if (count) count.textContent = String(selected.size);
	bar?.classList.toggle('hidden', selected.size === 0);
}

function renderGrid(items: MediaListItem[], canDelete: boolean): void {
	const grid = document.getElementById('media-grid');
	if (!grid) return;

	if (items.length === 0) {
		grid.innerHTML =
			'<p class="col-span-full py-16 text-center text-slate-500">Chưa có ảnh nào. Upload ảnh đầu tiên!</p>';
		return;
	}

	grid.innerHTML = items
		.map(
			(item) => `
		<div class="media-card group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60" data-key="${item.key}">
			${
				canDelete
					? `<label class="absolute left-2 top-2 z-10">
				<input type="checkbox" class="media-select rounded border-slate-600 bg-slate-800 text-indigo-500" value="${item.key}" />
			</label>`
					: ''
			}
			<img src="${item.thumbnailUrl}" alt="${item.alt}" class="aspect-square w-full object-cover" loading="lazy" />
			<div class="space-y-2 p-3">
				<p class="truncate text-xs text-slate-400" title="${item.filename}">${item.filename}</p>
				<p class="text-xs text-slate-500">${formatSize(item.size)}</p>
				<div class="flex gap-2">
					<button type="button" class="copy-link flex-1 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800" data-url="${item.url}">Copy</button>
					${
						canDelete
							? `<button type="button" class="delete-one rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10" data-key="${item.key}">Xóa</button>`
							: ''
					}
				</div>
			</div>
		</div>`,
		)
		.join('');

	grid.querySelectorAll<HTMLInputElement>('.media-select').forEach((cb) => {
		cb.addEventListener('change', () => {
			if (cb.checked) selected.add(cb.value);
			else selected.delete(cb.value);
			updateBulkBar();
		});
	});

	grid.querySelectorAll<HTMLButtonElement>('.copy-link').forEach((btn) => {
		btn.addEventListener('click', async () => {
			const url = btn.dataset.url;
			if (!url) return;
			await navigator.clipboard.writeText(url);
			btn.textContent = 'Copied!';
			setTimeout(() => {
				btn.textContent = 'Copy';
			}, 1500);
		});
	});

	grid.querySelectorAll<HTMLButtonElement>('.delete-one').forEach((btn) => {
		btn.addEventListener('click', () => {
			const key = btn.dataset.key;
			if (key) void deleteKeys([key], canDelete);
		});
	});
}

async function loadMedia(page = 1, canDelete = false): Promise<void> {
	const status = document.getElementById('media-status');
	if (status) status.textContent = 'Đang tải...';

	const res = await adminFetch(`/api/media?page=${page}&limit=24`);
	const result = await parseApiResponse<MediaPageData>(res);

	if (!result.ok || !result.data) {
		if (status) status.textContent = result.error ?? 'Lỗi tải media.';
		return;
	}

	renderGrid(result.data.items, canDelete);
	if (status) {
		status.textContent = `Trang ${result.data.pagination.page}/${result.data.pagination.totalPages} — ${result.data.items.length} ảnh`;
	}
}

async function deleteKeys(keys: string[], canDelete = false): Promise<void> {
	if (!keys.length) return;
	if (!confirm(`Xóa ${keys.length} ảnh khỏi R2?`)) return;

	for (const key of keys) {
		const res = await adminFetch('/api/media', {
			method: 'DELETE',
			json: { key },
		});
		const result = await parseApiResponse(res);
		if (!result.ok) {
			alert(result.error ?? 'Xóa thất bại.');
			return;
		}
		selected.delete(key);
	}

	updateBulkBar();
	await loadMedia(1, canDelete);
}

export function initMediaLibrary(canDelete = false): void {
	void loadMedia(canDelete);

	document.getElementById('bulk-delete')?.addEventListener('click', () => {
		void deleteKeys([...selected], canDelete);
	});

	document.getElementById('refresh-media')?.addEventListener('click', () => {
		selected.clear();
		updateBulkBar();
		void loadMedia(canDelete);
	});

	document.addEventListener('media-uploaded', () => {
		void loadMedia(canDelete);
	});
}

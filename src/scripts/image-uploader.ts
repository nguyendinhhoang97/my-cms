/**
 * ImageUploader client — drag-drop, preview, progress, upload, media picker.
 */
import {
	adminFetch,
	getCsrfToken,
	parseApiResponse,
} from '../lib/client/admin-api';
import {
	createThumbnailBlob,
	generateAltFromFilename,
	type MediaListItem,
	type UploadedMedia,
} from '../lib/media/client-image';

export interface ImageUploaderOptions {
	targetInputId?: string;
	mode?: 'standalone' | 'picker';
	initialUrl?: string;
}

function qs<T extends Element>(sel: string, root: ParentNode = document): T | null {
	return root.querySelector(sel);
}

function setProgress(root: HTMLElement, pct: number): void {
	const bar = qs<HTMLElement>('[data-upload-progress]', root);
	if (bar) bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

function showProgress(root: HTMLElement, show: boolean): void {
	const wrap = qs<HTMLElement>('[data-progress-wrap]', root);
	wrap?.classList.toggle('hidden', !show);
}

async function uploadWithProgress(
	root: HTMLElement,
	formData: FormData,
): Promise<UploadedMedia> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', '/api/upload');
		xhr.setRequestHeader('X-CSRF-Token', getCsrfToken());
		xhr.setRequestHeader('Accept', 'application/json');

		xhr.upload.addEventListener('progress', (e) => {
			if (e.lengthComputable) {
				setProgress(root, (e.loaded / e.total) * 100);
			}
		});

		xhr.addEventListener('load', () => {
			try {
				const json = JSON.parse(xhr.responseText) as {
					ok?: boolean;
					data?: UploadedMedia;
					error?: string;
				};
				if (xhr.status >= 200 && xhr.status < 300 && json.data) {
					resolve(json.data);
				} else {
					reject(new Error(json.error ?? `Upload lỗi ${xhr.status}`));
				}
			} catch {
				reject(new Error('Phản hồi upload không hợp lệ.'));
			}
		});

		xhr.addEventListener('error', () => reject(new Error('Lỗi kết nối upload.')));
		xhr.send(formData);
	});
}

function syncTargetInput(inputId: string | undefined, url: string): void {
	if (!inputId) return;
	const input = document.getElementById(inputId) as HTMLInputElement | null;
	if (input) input.value = url;
}

function renderPreview(root: HTMLElement, url: string, alt: string): void {
	const preview = qs<HTMLElement>('[data-preview]', root);
	const img = qs<HTMLImageElement>('[data-preview-img]', root);
	const empty = qs<HTMLElement>('[data-preview-empty]', root);
	if (img) {
		img.src = url;
		img.alt = alt;
	}
	preview?.classList.remove('hidden');
	empty?.classList.add('hidden');
}

function clearPreview(root: HTMLElement): void {
	const preview = qs<HTMLElement>('[data-preview]', root);
	const img = qs<HTMLImageElement>('[data-preview-img]', root);
	const empty = qs<HTMLElement>('[data-preview-empty]', root);
	const urlInput = qs<HTMLInputElement>('[data-result-url]', root);
	const keyInput = qs<HTMLInputElement>('[data-result-key]', root);
	if (img) {
		img.src = '';
		img.alt = '';
	}
	preview?.classList.add('hidden');
	empty?.classList.remove('hidden');
	if (urlInput) urlInput.value = '';
	if (keyInput) keyInput.value = '';
}

async function handleFile(root: HTMLElement, file: File, options: ImageUploaderOptions): Promise<void> {
	const altInput = qs<HTMLInputElement>('[data-alt-input]', root);
	const alt = altInput?.value.trim() || generateAltFromFilename(file.name);
	if (altInput && !altInput.value.trim()) altInput.value = alt;

	const statusEl = qs<HTMLElement>('[data-status]', root);
	if (statusEl) {
		statusEl.textContent = 'Đang upload...';
		statusEl.className = 'text-sm text-indigo-300';
	}

	showProgress(root, true);
	setProgress(root, 0);

	try {
		const thumbBlob = await createThumbnailBlob(file);
		const formData = new FormData();
		formData.append('file', file);
		formData.append('thumbnail', thumbBlob, `thumb-${file.name}`);
		formData.append('alt', alt);

		const result = await uploadWithProgress(root, formData);

		renderPreview(root, result.url, result.alt);
		syncTargetInput(options.targetInputId, result.url);

		const urlInput = qs<HTMLInputElement>('[data-result-url]', root);
		const keyInput = qs<HTMLInputElement>('[data-result-key]', root);
		if (urlInput) urlInput.value = result.url;
		if (keyInput) keyInput.value = result.key;

		if (statusEl) {
			statusEl.textContent = 'Upload thành công!';
			statusEl.className = 'text-sm text-emerald-400';
		}

		root.dispatchEvent(
			new CustomEvent('media-uploaded', { detail: result, bubbles: true }),
		);
	} catch (err) {
		if (statusEl) {
			statusEl.textContent = err instanceof Error ? err.message : 'Upload thất bại.';
			statusEl.className = 'text-sm text-red-400';
		}
	} finally {
		showProgress(root, false);
		setProgress(root, 0);
	}
}

function setupDropZone(root: HTMLElement, options: ImageUploaderOptions): void {
	const zone = qs<HTMLElement>('[data-dropzone]', root);
	const fileInput = qs<HTMLInputElement>('[data-file-input]', root);
	if (!zone || !fileInput) return;

	const activate = () => zone.classList.add('border-indigo-500', 'bg-indigo-500/5');
	const deactivate = () => zone.classList.remove('border-indigo-500', 'bg-indigo-500/5');

	zone.addEventListener('click', () => fileInput.click());
	fileInput.addEventListener('change', () => {
		const file = fileInput.files?.[0];
		if (file) void handleFile(root, file, options);
		fileInput.value = '';
	});

	zone.addEventListener('dragover', (e) => {
		e.preventDefault();
		activate();
	});
	zone.addEventListener('dragleave', () => deactivate());
	zone.addEventListener('drop', (e) => {
		e.preventDefault();
		deactivate();
		const file = e.dataTransfer?.files?.[0];
		if (file) void handleFile(root, file, options);
	});
}

function setupActions(root: HTMLElement, options: ImageUploaderOptions): void {
	const copyBtn = qs<HTMLButtonElement>('[data-copy-url]', root);
	const removeBtn = qs<HTMLButtonElement>('[data-remove]', root);
	const libraryBtn = qs<HTMLButtonElement>('[data-open-library]', root);

	copyBtn?.addEventListener('click', async () => {
		const url = qs<HTMLInputElement>('[data-result-url]', root)?.value;
		if (!url) return;
		await navigator.clipboard.writeText(url);
		const statusEl = qs<HTMLElement>('[data-status]', root);
		if (statusEl) {
			statusEl.textContent = 'Đã copy URL!';
			statusEl.className = 'text-sm text-emerald-400';
		}
	});

	removeBtn?.addEventListener('click', () => {
		clearPreview(root);
		syncTargetInput(options.targetInputId, '');
		const statusEl = qs<HTMLElement>('[data-status]', root);
		if (statusEl) statusEl.textContent = '';
	});

	libraryBtn?.addEventListener('click', () => {
		openMediaLibraryModal(options);
	});
}

export function openMediaLibraryModal(options: ImageUploaderOptions): void {
	let modal = document.getElementById('media-library-modal');
	if (!modal) {
		modal = document.createElement('div');
		modal.id = 'media-library-modal';
		modal.className =
			'fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4';
		modal.innerHTML = `
			<div class="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
				<div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
					<h3 class="font-semibold text-white">Media Library</h3>
					<button type="button" data-close-library class="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">✕</button>
				</div>
				<div data-library-grid class="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4"></div>
				<div class="border-t border-slate-800 px-4 py-3 text-center text-sm text-slate-500" data-library-status>Đang tải...</div>
			</div>`;
		document.body.appendChild(modal);

		modal.addEventListener('click', (e) => {
			if (e.target === modal) modal?.remove();
		});
		modal.querySelector('[data-close-library]')?.addEventListener('click', () => modal?.remove());
	}

	const grid = modal.querySelector('[data-library-grid]') as HTMLElement;
	const status = modal.querySelector('[data-library-status]') as HTMLElement;
	grid.innerHTML = '';
	status.textContent = 'Đang tải...';

	void (async () => {
		const res = await adminFetch('/api/media?limit=48');
		const result = await parseApiResponse<{ items: MediaListItem[] }>(res);
		if (!result.ok || !result.data?.items.length) {
			status.textContent = result.error ?? 'Không có ảnh nào.';
			return;
		}
		status.textContent = `${result.data.items.length} ảnh`;
		for (const item of result.data.items) {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className =
				'group overflow-hidden rounded-lg border border-slate-700 hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';
			btn.innerHTML = `<img src="${item.thumbnailUrl}" alt="${item.alt}" class="aspect-square w-full object-cover" loading="lazy" />`;
			btn.addEventListener('click', () => {
				const uploader = document.querySelector('[data-image-uploader]') as HTMLElement | null;
				if (uploader) {
					renderPreview(uploader, item.url, item.alt);
					syncTargetInput(options.targetInputId, item.url);
					const urlInput = qs<HTMLInputElement>('[data-result-url]', uploader);
					const keyInput = qs<HTMLInputElement>('[data-result-key]', uploader);
					const altInput = qs<HTMLInputElement>('[data-alt-input]', uploader);
					if (urlInput) urlInput.value = item.url;
					if (keyInput) keyInput.value = item.key;
					if (altInput) altInput.value = item.alt;
				}
				modal?.remove();
			});
			grid.appendChild(btn);
		}
	})();
}

export function initImageUploader(options: ImageUploaderOptions = {}): void {
	const roots = document.querySelectorAll<HTMLElement>('[data-image-uploader]');
	for (const root of roots) {
		setupDropZone(root, options);
		setupActions(root, options);

		if (options.initialUrl) {
			renderPreview(root, options.initialUrl, '');
			syncTargetInput(options.targetInputId, options.initialUrl);
			const urlInput = qs<HTMLInputElement>('[data-result-url]', root);
			if (urlInput) urlInput.value = options.initialUrl;
		}
	}
}

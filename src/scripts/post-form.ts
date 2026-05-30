/**
 * PostForm client: EasyMDE, live preview, fetch submit.
 */
import EasyMDE from 'easymde';
import { marked } from 'marked';
import {
	adminFetch,
	parseApiResponse,
	setButtonLoading,
	setFormMessage,
} from '../lib/client/admin-api';

marked.setOptions({ gfm: true, breaks: true });

export interface PostFormInitOptions {
	mode: 'create' | 'edit';
	postId: number;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 200);
}

function collectChecked(name: string): number[] {
	return Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)).map(
		(el) => Number(el.value),
	);
}

export function initPostForm({ mode, postId }: PostFormInitOptions): void {
	const titleEl = document.getElementById('title') as HTMLInputElement | null;
	const slugEl = document.getElementById('slug') as HTMLInputElement | null;
	const form = document.getElementById('post-form');
	const messageEl = document.getElementById('form-message');
	const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement | null;
	const previewEl = document.getElementById('live-preview');
	const contentEl = document.getElementById('content') as HTMLTextAreaElement | null;

	if (!form || !contentEl) return;

	let slugTouched = Boolean(slugEl?.value);
	slugEl?.addEventListener('input', () => {
		slugTouched = true;
	});
	titleEl?.addEventListener('input', () => {
		if (!slugTouched && slugEl && titleEl) slugEl.value = slugify(titleEl.value);
	});

	const editor = new EasyMDE({
		element: contentEl,
		spellChecker: false,
		autosave: { enabled: false },
		status: ['lines', 'words', 'cursor'],
		placeholder: 'Viết nội dung Markdown...',
		sideBySideFullscreen: false,
		toolbar: [
			'bold',
			'italic',
			'heading',
			'|',
			'quote',
			'unordered-list',
			'ordered-list',
			'|',
			'link',
			'image',
			'|',
			'preview',
			'side-by-side',
			'fullscreen',
			'|',
			'guide',
		],
	});

	function updateLivePreview(): void {
		if (!previewEl) return;
		const md = editor.value();
		previewEl.innerHTML = md ? (marked.parse(md) as string) : '<p class="text-slate-500">Nhập nội dung để xem trước...</p>';
	}

	editor.codemirror.on('change', updateLivePreview);
	updateLivePreview();

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		setButtonLoading(submitBtn, true);
		setFormMessage(messageEl, '', 'hidden');

		const payload = {
			title: titleEl?.value.trim() ?? '',
			slug: slugEl?.value.trim() || undefined,
			content: editor.value(),
			excerpt: (document.getElementById('excerpt') as HTMLTextAreaElement)?.value.trim() || null,
			featuredImage:
				(document.getElementById('featured_image') as HTMLInputElement)?.value.trim() || '',
			status: (document.getElementById('status') as HTMLSelectElement)?.value ?? 'draft',
			categoryIds: collectChecked('category_ids'),
			tagIds: collectChecked('tag_ids'),
		};

		const url = mode === 'edit' ? `/api/posts/${postId}` : '/api/posts';
		const method = mode === 'edit' ? 'PUT' : 'POST';

		try {
			const res = await adminFetch(url, { method, json: payload });
			const result = await parseApiResponse<{ id: number }>(res);

			if (!result.ok) {
				setFormMessage(messageEl, result.error ?? 'Lưu thất bại.', 'error');
				setButtonLoading(submitBtn, false);
				return;
			}

			setFormMessage(
				messageEl,
				mode === 'edit' ? 'Đã cập nhật bài viết!' : 'Đã tạo bài viết!',
				'success',
			);

			const id = result.data?.id ?? postId;
			setTimeout(() => {
				window.location.href =
					mode === 'create' && id ? `/admin/posts/edit/${id}` : '/admin/posts';
			}, 800);
		} catch {
			setFormMessage(messageEl, 'Lỗi kết nối. Vui lòng thử lại.', 'error');
			setButtonLoading(submitBtn, false);
		}
	});
}

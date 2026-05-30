/**
 * CRUD modal cho categories / tags.
 */
import {
	adminFetch,
	parseApiResponse,
	setButtonLoading,
	setFormMessage,
} from '../lib/client/admin-api';

export type TaxonomyType = 'categories' | 'tags';

export interface TaxonomyItem {
	id: number;
	name: string;
	slug: string;
	description?: string | null;
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

export function initTaxonomyCrud(type: TaxonomyType): void {
	const modal = document.getElementById('taxonomy-modal');
	const form = document.getElementById('taxonomy-form') as HTMLFormElement | null;
	const messageEl = document.getElementById('taxonomy-message');
	const submitBtn = document.getElementById('taxonomy-submit') as HTMLButtonElement | null;
	const titleEl = document.getElementById('modal-title');
	const idInput = document.getElementById('taxonomy-id') as HTMLInputElement | null;
	const nameInput = document.getElementById('taxonomy-name') as HTMLInputElement | null;
	const slugInput = document.getElementById('taxonomy-slug') as HTMLInputElement | null;
	const descInput = document.getElementById('taxonomy-description') as HTMLTextAreaElement | null;
	const showDesc = type === 'categories';

	let slugTouched = false;

	function openModal(edit?: TaxonomyItem): void {
		slugTouched = false;
		if (titleEl) titleEl.textContent = edit ? `Sửa ${type === 'categories' ? 'category' : 'tag'}` : 'Thêm mới';
		if (idInput) idInput.value = edit ? String(edit.id) : '';
		if (nameInput) nameInput.value = edit?.name ?? '';
		if (slugInput) slugInput.value = edit?.slug ?? '';
		if (descInput) {
			descInput.value = edit?.description ?? '';
			descInput.closest('.field-description')?.classList.toggle('hidden', !showDesc);
		}
		if (edit?.slug) slugTouched = true;
		setFormMessage(messageEl, '', 'hidden');
		modal?.classList.remove('hidden');
		modal?.classList.add('flex');
	}

	function closeModal(): void {
		modal?.classList.add('hidden');
		modal?.classList.remove('flex');
		form?.reset();
	}

	document.getElementById('btn-add')?.addEventListener('click', () => openModal());
	document.querySelectorAll('.btn-edit').forEach((btn) => {
		btn.addEventListener('click', () => {
			const id = btn.getAttribute('data-id');
			if (!id) return;
			openModal({
				id: Number(id),
				name: btn.getAttribute('data-name') ?? '',
				slug: btn.getAttribute('data-slug') ?? '',
				description: btn.getAttribute('data-description') || null,
			});
		});
	});

	document.getElementById('modal-close')?.addEventListener('click', closeModal);
	document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
	modal?.addEventListener('click', (e) => {
		if (e.target === modal) closeModal();
	});

	nameInput?.addEventListener('input', () => {
		if (!slugTouched && slugInput && nameInput) slugInput.value = slugify(nameInput.value);
	});
	slugInput?.addEventListener('input', () => {
		slugTouched = true;
	});

	document.querySelectorAll('.btn-delete').forEach((btn) => {
		btn.addEventListener('click', async () => {
			const id = btn.getAttribute('data-id');
			const name = btn.getAttribute('data-name') ?? '';
			if (!id || !confirm(`Xóa "${name}"?`)) return;

			btn.setAttribute('disabled', 'true');
			const url = `/api/${type}/${id}`;
			const delRes = await adminFetch(url, { method: 'DELETE', json: { confirm: true } });
			const result = await parseApiResponse(delRes);
			if (!result.ok) {
				alert(result.error ?? 'Xóa thất bại');
				btn.removeAttribute('disabled');
				return;
			}
			window.location.reload();
		});
	});

	form?.addEventListener('submit', async (e) => {
		e.preventDefault();
		setButtonLoading(submitBtn, true);
		setFormMessage(messageEl, '', 'hidden');

		const id = idInput?.value;
		const body: Record<string, unknown> = {
			name: nameInput?.value.trim(),
			slug: slugInput?.value.trim() || undefined,
		};
		if (showDesc && descInput) body.description = descInput.value.trim() || null;

		const url = id ? `/api/${type}/${id}` : `/api/${type}`;
		const method = id ? 'PUT' : 'POST';

		try {
			const res = await adminFetch(url, { method, json: body });
			const result = await parseApiResponse(res);
			if (!result.ok) {
				setFormMessage(messageEl, result.error ?? 'Lưu thất bại.', 'error');
				setButtonLoading(submitBtn, false);
				return;
			}
			setFormMessage(messageEl, 'Đã lưu!', 'success');
			setTimeout(() => window.location.reload(), 600);
		} catch {
			setFormMessage(messageEl, 'Lỗi kết nối.', 'error');
			setButtonLoading(submitBtn, false);
		}
	});
}

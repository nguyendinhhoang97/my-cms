/**
 * Admin settings form client.
 */
import { adminFetch, parseApiResponse, setFormMessage } from '../lib/client/admin-api';

export function initSettingsForm(): void {
	const form = document.getElementById('settings-form');
	const messageEl = document.getElementById('settings-message');
	const submitBtn = document.getElementById('settings-submit') as HTMLButtonElement | null;

	form?.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (submitBtn) submitBtn.disabled = true;
		setFormMessage(messageEl, '', 'hidden');

		const fd = new FormData(form as HTMLFormElement);
		const payload = {
			site_title: String(fd.get('site_title') ?? '').trim(),
			site_description: String(fd.get('site_description') ?? '').trim(),
			logo: String(fd.get('logo') ?? '').trim(),
			ga_id: String(fd.get('ga_id') ?? '').trim(),
			contact_email: String(fd.get('contact_email') ?? '').trim(),
		};

		const res = await adminFetch('/api/settings', { method: 'PUT', json: payload });
		const result = await parseApiResponse(res);

		if (result.ok) {
			setFormMessage(messageEl, 'Đã lưu cấu hình!', 'success');
		} else {
			setFormMessage(messageEl, result.error ?? 'Lưu thất bại.', 'error');
		}
		if (submitBtn) submitBtn.disabled = false;
	});
}

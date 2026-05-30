/**
 * Sidebar mobile toggle + đóng khi click backdrop
 */
function initAdminShell(): void {
	const toggle = document.getElementById('sidebar-toggle');
	const sidebar = document.getElementById('admin-sidebar');
	const backdrop = document.getElementById('sidebar-backdrop');

	function open(): void {
		sidebar?.classList.add('is-open');
		backdrop?.classList.add('is-open');
		document.body.classList.add('overflow-hidden', 'lg:overflow-auto');
	}

	function close(): void {
		sidebar?.classList.remove('is-open');
		backdrop?.classList.remove('is-open');
		document.body.classList.remove('overflow-hidden', 'lg:overflow-auto');
	}

	toggle?.addEventListener('click', () => {
		if (sidebar?.classList.contains('is-open')) close();
		else open();
	});

	backdrop?.addEventListener('click', close);

	window.addEventListener('resize', () => {
		if (window.innerWidth >= 1024) close();
	});
}

initAdminShell();

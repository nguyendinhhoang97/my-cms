/**
 * TOC scroll spy — highlight mục đang xem.
 */
export function initTocScrollSpy(navId = 'toc-nav'): void {
	const nav = document.getElementById(navId);
	if (!nav) return;

	const links = nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
	if (links.length === 0) return;

	const headings = [...links]
		.map((link) => {
			const id = link.getAttribute('href')?.slice(1);
			const el = id ? document.getElementById(id) : null;
			return el ? { link, el } : null;
		})
		.filter(Boolean) as { link: HTMLAnchorElement; el: HTMLElement }[];

	if (headings.length === 0) return;

	const observer = new IntersectionObserver(
		(entries) => {
			const visible = entries
				.filter((e) => e.isIntersecting)
				.sort(
					(a, b) =>
						(a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop,
				);

			if (visible.length === 0) return;

			const activeId = visible[0]!.target.id;
			for (const { link } of headings) {
				const isActive = link.getAttribute('href') === `#${activeId}`;
				link.classList.toggle('text-indigo-600', isActive);
				link.classList.toggle('dark:text-indigo-400', isActive);
				link.classList.toggle('font-semibold', isActive);
				link.classList.toggle('opacity-80', !isActive);
			}
		},
		{ rootMargin: '-20% 0px -70% 0px', threshold: 0 },
	);

	for (const { el } of headings) {
		observer.observe(el);
	}
}

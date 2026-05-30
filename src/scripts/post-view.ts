/**
 * Client-side view counter — gọi khi load post detail.
 */
export function trackPostView(postId: number): void {
	const el = document.getElementById('view-count');
	if (!postId) return;

	void fetch(`/api/posts/${postId}/view`, {
		method: 'POST',
		credentials: 'same-origin',
		headers: { Accept: 'application/json' },
	})
		.then((res) => res.json())
		.then((json: { data?: { viewCount?: number; counted?: boolean } }) => {
			if (el && json.data?.viewCount !== undefined) {
				el.textContent = String(json.data.viewCount);
			}
		})
		.catch(() => {
			/* im lặng */
		});
}

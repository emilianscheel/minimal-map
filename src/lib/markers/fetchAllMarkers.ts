import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import type { MarkerRecord, MarkersAdminConfig } from '../../types';

export async function fetchAllMarkers(
	config: Pick<MarkersAdminConfig, 'restPath'>
): Promise<MarkerRecord[]> {
	try {
		const markers: MarkerRecord[] = [];
		let page = 1;
		let totalPages = 1;

		while (page <= totalPages) {
			const response = (await apiFetch({
				method: 'GET',
				parse: false,
				path: `${config.restPath}?context=edit&page=${page}&per_page=100`,
			})) as Response;
			const records = (await response.json()) as any[];

			markers.push(
				...records.map((record) => ({
					id: record.id,
					title: typeof record.title === 'object' ? record.title.raw : record.title,
					content: typeof record.content === 'object' ? record.content.raw : record.content,
				}))
			);
			totalPages = Number(response.headers.get('X-WP-TotalPages') || '1');
			page += 1;
		}

		return markers;
	} catch (error) {
		throw new Error(
			error instanceof Error ? error.message : __('Markers could not be loaded.', 'minimal-map')
		);
	}
}

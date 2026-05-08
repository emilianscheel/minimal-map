import { __, sprintf } from '@wordpress/i18n';
import { ChartColumn, SearchX } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import type { AnalyticsEventCategory } from '../../types';

export default function AnalyticsEmptyState({
	category = 'search',
	enabled,
	hasSearch,
	hasTrackedData,
}: {
	category?: AnalyticsEventCategory;
	enabled: boolean;
	hasSearch: boolean;
	hasTrackedData: boolean;
}) {
	if (hasSearch) {
		const label = category === 'selection'
			? __('selection events', 'minimal-map')
			: category === 'action'
				? __('action events', 'minimal-map')
				: __('queries', 'minimal-map');

		return (
			<EmptyState
				icon={<SearchX />}
				title={__('No matching records found', 'minimal-map')}
				description={sprintf(__('Try a different search term to inspect the stored %s.', 'minimal-map'), label)}
			/>
		);
	}

	if (!enabled && !hasTrackedData) {
		return (
			<EmptyState
				icon={<ChartColumn />}
				title={__('Analytics tracking is disabled', 'minimal-map')}
				description={__('Enable analytics tracking to start collecting search demand data for this map plugin.', 'minimal-map')}
			/>
		);
	}

	return (
		<EmptyState
			icon={<ChartColumn />}
			title={__('No analytics data in this period yet', 'minimal-map')}
			description={enabled
				? __('Try a wider time period or wait for visitors to interact with the map.', 'minimal-map')
				: __('Tracking is currently disabled, but historic analytics data will still appear here when available.', 'minimal-map')}
		/>
	);
}

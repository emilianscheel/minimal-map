import { __ } from '@wordpress/i18n';
import type { ViewTable } from '@wordpress/dataviews';
import type {
	ActionAnalyticsSummary,
	AnalyticsEventCategory,
	AnalyticsRangeKey,
	SearchAnalyticsSummary,
	SelectionAnalyticsSummary,
} from '../../types';
import { normalizeAnalyticsTableView } from '../../lib/analytics/normalizeAnalyticsView';
import type { AnalyticsSummaryByCategory, AnalyticsTableState, AnalyticsTablesByCategory } from './types';

export const ANALYTICS_TABLE_PER_PAGE = 9;
export const DEFAULT_ANALYTICS_RANGE: AnalyticsRangeKey = '30d';

export const ANALYTICS_RANGE_OPTIONS: Array<{
	value: AnalyticsRangeKey;
	label: string;
}> = [
	{ value: 'today', label: __('Today', 'minimal-map') },
	{ value: 'yesterday', label: __('Yesterday', 'minimal-map') },
	{ value: '7d', label: __('Last 7 Days', 'minimal-map') },
	{ value: '30d', label: __('Last 30 Days', 'minimal-map') },
	{ value: '90d', label: __('Last 90 Days', 'minimal-map') },
	{ value: 'all', label: __('All', 'minimal-map') },
];

export const EMPTY_SEARCH_ANALYTICS_SUMMARY: SearchAnalyticsSummary = {
	category: 'search',
	totalSearches: 0,
	searchesToday: 0,
	zeroResultSearches: 0,
	averageNearestDistanceMeters: null,
	successRate: 0,
	series: {
		totalSearches: [],
		searchesToday: [],
		zeroResultSearches: [],
		averageNearestDistanceMeters: [],
		successRate: [],
	},
	breakdowns: {
		queryTypeMix: [],
		resultDistribution: [],
		topQueries: [],
		topZeroResultQueries: [],
	},
};

export const EMPTY_SELECTION_ANALYTICS_SUMMARY: SelectionAnalyticsSummary = {
	category: 'selection',
	totalSelections: 0,
	conversionRate: 0,
	series: {
		totalSelections: [],
		conversionRate: [],
	},
	breakdowns: {
		sourceMix: [],
		topLocations: [],
	},
};

export const EMPTY_ACTION_ANALYTICS_SUMMARY: ActionAnalyticsSummary = {
	category: 'action',
	totalActions: 0,
	series: {
		totalActions: [],
	},
	breakdowns: {
		actionTypeMix: [],
		sourceMix: [],
		topLocations: [],
	},
};

export const EMPTY_ANALYTICS_SUMMARIES: AnalyticsSummaryByCategory = {
	search: EMPTY_SEARCH_ANALYTICS_SUMMARY,
	selection: EMPTY_SELECTION_ANALYTICS_SUMMARY,
	action: EMPTY_ACTION_ANALYTICS_SUMMARY,
};

export function createDefaultAnalyticsView(category: AnalyticsEventCategory): ViewTable {
	return normalizeAnalyticsTableView(category, {
		type: 'table',
		page: 1,
		perPage: ANALYTICS_TABLE_PER_PAGE,
	});
}

export function createEmptyAnalyticsTableState(category: AnalyticsEventCategory): AnalyticsTableState {
	return {
		queries: [],
		totalItems: 0,
		totalPages: 1,
		view: createDefaultAnalyticsView(category),
	};
}

export const EMPTY_ANALYTICS_TABLES: AnalyticsTablesByCategory = {
	search: createEmptyAnalyticsTableState('search'),
	selection: createEmptyAnalyticsTableState('selection'),
	action: createEmptyAnalyticsTableState('action'),
};

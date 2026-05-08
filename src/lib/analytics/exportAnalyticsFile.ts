import { __ } from '@wordpress/i18n';
import type {
	AnalyticsExportActionConfig,
	AnalyticsEventCategory,
	AnalyticsQueriesResponse,
	AnalyticsQueryRecord,
	AnalyticsRangeKey,
} from '../../types';
import { buildTimestampedFileName } from '../downloadFileName';
import { triggerFileDownload } from '../download';
import { configureApiFetch } from '../locations/configureApiFetch';
import { fetchAnalyticsQueries } from './fetchAnalyticsQueries';

const ANALYTICS_EXPORT_PER_PAGE = 50;

const ANALYTICS_EXPORT_COLUMNS: Record<AnalyticsEventCategory, Array<keyof AnalyticsQueryRecord>> = {
	search: [
		'id',
		'event_category',
		'query_text',
		'query_type',
		'result_count',
		'nearest_distance_meters',
		'occurred_at_gmt',
	],
	selection: [
		'id',
		'event_category',
		'location_id',
		'location_title',
		'interaction_source',
		'query_text',
		'occurred_at_gmt',
	],
	action: [
		'id',
		'event_category',
		'location_id',
		'location_title',
		'interaction_source',
		'action_type',
		'action_target',
		'occurred_at_gmt',
	],
};

const ANALYTICS_EXPORT_HEADERS: Record<AnalyticsEventCategory, string[]> = {
	search: [
		'ID',
		'Event Category',
		'Query Text',
		'Query Type',
		'Result Count',
		'Nearest Distance Meters',
		'Occurred At GMT',
	],
	selection: [
		'ID',
		'Event Category',
		'Location ID',
		'Location Title',
		'Interaction Source',
		'Query Text',
		'Occurred At GMT',
	],
	action: [
		'ID',
		'Event Category',
		'Location ID',
		'Location Title',
		'Interaction Source',
		'Action Type',
		'Action Target',
		'Occurred At GMT',
	],
};

interface ExportAnalyticsFileDependencies {
	createObjectURL?: (blob: Blob) => string;
	downloadFile?: (url: string, fileName: string) => void;
	fetchQueries?: (
		config: AnalyticsExportActionConfig,
		view: { page?: number; perPage?: number; search?: string },
		range: AnalyticsRangeKey,
		category: AnalyticsEventCategory,
	) => Promise<AnalyticsQueriesResponse>;
}

function escapeCsvValue(value: string | number | null): string {
	const normalized = value === null ? '' : `${value}`;
	return `"${normalized.replace(/"/g, '""')}"`;
}

function getAnalyticsExportFileName(category: AnalyticsEventCategory): string {
	return buildTimestampedFileName(`minimal-map-analytics-${category}`, 'csv');
}

function buildAnalyticsExportRows(
	category: AnalyticsEventCategory,
	rows: AnalyticsQueryRecord[],
): string[] {
	const columns = ANALYTICS_EXPORT_COLUMNS[category];

	return rows.map((row) => columns.map((column) => escapeCsvValue(row[column] ?? null)).join(','));
}

export function buildAnalyticsCsv(
	category: AnalyticsEventCategory,
	rows: AnalyticsQueryRecord[],
): string {
	return [
		ANALYTICS_EXPORT_HEADERS[category].map((header) => escapeCsvValue(header)).join(','),
		...buildAnalyticsExportRows(category, rows),
	].join('\n');
}

async function fetchAllAnalyticsRows(
	config: AnalyticsExportActionConfig,
	range: AnalyticsRangeKey,
	category: AnalyticsEventCategory,
	fetchQueries: NonNullable<ExportAnalyticsFileDependencies['fetchQueries']>,
): Promise<AnalyticsQueryRecord[]> {
	const firstPage = await fetchQueries(
		config,
		{ page: 1, perPage: ANALYTICS_EXPORT_PER_PAGE },
		range,
		category,
	);

	if (firstPage.totalPages <= 1) {
		return firstPage.items;
	}

	const remainingPages = await Promise.all(
		Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
			fetchQueries(
				config,
				{ page: index + 2, perPage: ANALYTICS_EXPORT_PER_PAGE },
				range,
				category,
			)
		)
	);

	return [
		...firstPage.items,
		...remainingPages.flatMap((response) => response.items),
	];
}

export async function exportAnalyticsFile(
	config: AnalyticsExportActionConfig,
	range: AnalyticsRangeKey,
	category: AnalyticsEventCategory,
	dependencies: ExportAnalyticsFileDependencies = {},
): Promise<void> {
	const fetchQueries = dependencies.fetchQueries ?? fetchAnalyticsQueries;
	const createObjectURL = dependencies.createObjectURL ?? ((blob: Blob) => URL.createObjectURL(blob));
	const downloadFile = dependencies.downloadFile ?? triggerFileDownload;

	configureApiFetch(config.nonce);

	const rows = await fetchAllAnalyticsRows(config, range, category, fetchQueries);
	const csvContent = buildAnalyticsCsv(category, rows);
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const url = createObjectURL(blob);

	downloadFile(url, getAnalyticsExportFileName(category));
}

export function getAnalyticsExportErrorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: __('Analytics data could not be exported.', 'minimal-map');
}

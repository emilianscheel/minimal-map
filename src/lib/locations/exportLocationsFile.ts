import { __ } from '@wordpress/i18n';
import type { LocationsExportActionConfig } from '../../types';
import { buildTimestampedFileName } from '../downloadFileName';
import { triggerFileDownload } from '../download';
import { fetchAllLogos } from '../logos/fetchAllLogos';
import { fetchAllMarkers } from '../markers/fetchAllMarkers';
import { fetchAllTags } from '../tags/fetchAllTags';
import { configureApiFetch } from './configureApiFetch';
import { fetchAllLocations } from './fetchAllLocations';
import {
	buildLocationExportJson,
	exportLocations,
	prepareExportData,
} from './importLocations';

export async function exportLocationsFile(
	format: 'csv' | 'xlsx' | 'json',
	config: LocationsExportActionConfig
): Promise<void> {
	configureApiFetch(config.nonce);

	const [allLocations, allLogos, allMarkers, allTags] = await Promise.all([
		fetchAllLocations({ restPath: config.locationsRestPath }),
		fetchAllLogos({ restPath: config.logosRestPath }),
		fetchAllMarkers({ restPath: config.markersRestPath }),
		fetchAllTags({ restPath: config.tagsRestPath }),
	]);

	if (allLocations.length === 0) {
		return;
	}

	if (format === 'csv') {
		const csvContent = exportLocations(allLocations, allLogos, allMarkers, allTags);
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		triggerFileDownload(url, buildTimestampedFileName('minimal-map-locations', 'csv'));
		return;
	}

	const { headers, rows } = prepareExportData(allLocations, allLogos, allMarkers, allTags);

	if (format === 'json') {
		const jsonContent = buildLocationExportJson({ headers, rows });
		const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		triggerFileDownload(url, buildTimestampedFileName('minimal-map-locations', 'json'));
		return;
	}

	const { exportToExcel } = await import('./excel');
	exportToExcel(headers, rows, 'minimal-map-locations.xlsx');
}

export function getLocationsExportErrorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: __('Locations could not be exported.', 'minimal-map');
}

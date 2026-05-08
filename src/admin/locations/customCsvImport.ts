import { __ } from '@wordpress/i18n';
import { OPENING_HOURS_DAY_ORDER } from '../../lib/locations/openingHours';
import type { ParsedLocationImportData } from '../../lib/locations/importLocations';
import type { OpeningHoursDayKey } from '../../types';

export interface CsvImportColumnOption {
	label: string;
	value: string;
}

export interface CsvImportMappingRow {
	key: string;
	label: string;
	options: CsvImportColumnOption[];
}

const OPENING_HOURS_DAY_LABELS: Record<OpeningHoursDayKey, string> = {
	monday: __('Mon', 'minimal-map'),
	tuesday: __('Tue', 'minimal-map'),
	wednesday: __('Wed', 'minimal-map'),
	thursday: __('Thu', 'minimal-map'),
	friday: __('Fri', 'minimal-map'),
	saturday: __('Sat', 'minimal-map'),
	sunday: __('Sun', 'minimal-map'),
};

export const CSV_OPENING_HOURS_MAPPING_FIELDS = OPENING_HOURS_DAY_ORDER.map((dayKey) => ({
	key: dayKey,
	label: OPENING_HOURS_DAY_LABELS[dayKey],
}));

export const CSV_OPENING_HOURS_NOTES_FIELD = {
	key: 'opening_hours_notes',
	label: __('Opening hours notes', 'minimal-map'),
} as const;

export function buildCsvImportColumnOptions(
	parsedCsv: ParsedLocationImportData | null,
	columnIndexes?: number[]
): CsvImportColumnOption[] {
	const options: CsvImportColumnOption[] = [{ label: __('None', 'minimal-map'), value: '' }];

	if (!parsedCsv) {
		return options;
	}

	const indexes =
		columnIndexes ?? parsedCsv.headers.map((_header, index) => index);

	indexes.forEach((index) => {
		const header = parsedCsv.headers[index] ?? '';
		const baseLabel = header || `${__('Column', 'minimal-map')} ${index + 1}`;
		const exampleValue = parsedCsv.rows
			.map((row) => row[index]?.trim() ?? '')
			.find((value) => value.length > 0);

		options.push({
			label: exampleValue ? `${baseLabel} (${exampleValue})` : baseLabel,
			value: `${index}`,
		});
	});

	return options;
}

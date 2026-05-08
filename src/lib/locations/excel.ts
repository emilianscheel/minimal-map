import * as XLSX from 'xlsx';
import { __ } from '@wordpress/i18n';
import { triggerFileDownload } from '../download';
import type { ParsedLocationImportData } from './importLocations';

/**
 * Convert a 2D array of data into an Excel file (XLSX) and trigger a download.
 *
 * @param headers Array of header strings.
 * @param rows    Array of row data (arrays of strings).
 * @param fileName Name of the file to download.
 */
export function exportToExcel(headers: string[], rows: (string | number)[][], fileName: string): void {
	const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Locations');

	// Generate buffer and trigger download
	const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
	const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
	const url = URL.createObjectURL(blob);
	
	triggerFileDownload(url, fileName);
}

/**
 * Parse an Excel file and return data in a normalized table format.
 *
 * @param file The Excel file to parse.
 * @returns Parsed data in a format compatible with location imports.
 */
export async function parseExcelFile(file: File): Promise<ParsedLocationImportData> {
	const data = await file.arrayBuffer();
	const workbook = XLSX.read(data, { type: 'array' });
	const firstSheetName = workbook.SheetNames[0];
	const worksheet = workbook.Sheets[firstSheetName];

	// Convert to 2D array of strings
	const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

	if (rows.length < 1) {
		throw new Error(__('Excel file is empty.', 'minimal-map'));
	}

	const headers = rows[0].map((h: any) => String(h || '').trim());
	const normalizedHeaders = headers.map((h: string) => h.toLowerCase());
	const dataRows = rows.slice(1).map((row: any[]) => 
		row.map((cell: any) => String(cell ?? '').trim())
	);

	return {
		headers,
		normalizedHeaders,
		rows: dataRows,
	};
}

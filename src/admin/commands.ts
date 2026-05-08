import { store as commandsStore } from '@wordpress/commands';
import { dispatch } from '@wordpress/data';
import domReady from '@wordpress/dom-ready';
import { __, sprintf } from '@wordpress/i18n';
import { download, page } from '@wordpress/icons';
import { DEFAULT_ANALYTICS_RANGE } from './analytics/constants';
import { exportAnalyticsFile, getAnalyticsExportErrorMessage } from '../lib/analytics/exportAnalyticsFile';
import { exportLocationsFile } from '../lib/locations/exportLocationsFile';
import type {
	AdminCommandAction,
	AdminCommandActionKey,
	AdminCommandSection,
	AdminCommandsConfig,
} from '../types';

const DEFAULT_CONFIG: AdminCommandsConfig = {
	sections: [],
	actions: [],
	analyticsExportConfig: null,
	locationsExportConfig: null,
};

function registerSectionCommand( section: AdminCommandSection ): void {
	dispatch( commandsStore ).registerCommand( {
		name: `minimal-map/go-to-${ section.view }`,
		label: sprintf( __( 'Minimal Map: Store Locator & Map Block: %s', 'minimal-map' ), section.title ),
		icon: page,
		category: 'view',
		keywords: section.keywords,
		callback: ( { close }: { close: () => void } ) => {
			window.location.assign( section.url );
			close();
		},
	} );
}

const ACTION_HANDLERS: Record<
	AdminCommandActionKey,
	(config: AdminCommandsConfig) => Promise<void>
> = {
	'export-locations-csv': async (config) => {
		if (!config.locationsExportConfig) {
			return;
		}

		await exportLocationsFile('csv', config.locationsExportConfig);
	},
	'export-locations-excel': async (config) => {
		if (!config.locationsExportConfig) {
			return;
		}

		await exportLocationsFile('xlsx', config.locationsExportConfig);
	},
	'export-locations-json': async (config) => {
		if (!config.locationsExportConfig) {
			return;
		}

		await exportLocationsFile('json', config.locationsExportConfig);
	},
	'export-analytics-search-csv': async (config) => {
		if (!config.analyticsExportConfig) {
			return;
		}

		await exportAnalyticsFile(config.analyticsExportConfig, DEFAULT_ANALYTICS_RANGE, 'search');
	},
	'export-analytics-selection-csv': async (config) => {
		if (!config.analyticsExportConfig) {
			return;
		}

		await exportAnalyticsFile(config.analyticsExportConfig, DEFAULT_ANALYTICS_RANGE, 'selection');
	},
	'export-analytics-action-csv': async (config) => {
		if (!config.analyticsExportConfig) {
			return;
		}

		await exportAnalyticsFile(config.analyticsExportConfig, DEFAULT_ANALYTICS_RANGE, 'action');
	},
};

function getLocationsExportErrorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: __('Locations could not be exported.', 'minimal-map');
}

function getCommandActionErrorMessage(action: AdminCommandAction, error: unknown): string {
	if (action.key.startsWith('export-analytics-')) {
		return getAnalyticsExportErrorMessage(error);
	}

	return getLocationsExportErrorMessage(error);
}

function registerActionCommand(action: AdminCommandAction, config: AdminCommandsConfig): void {
	const handler = ACTION_HANDLERS[action.key];

	if (!handler) {
		return;
	}

	dispatch(commandsStore).registerCommand({
		name: `minimal-map/${action.key}`,
		label: action.label,
		icon: download,
		category: 'command',
		keywords: action.keywords,
		callback: ({ close }: { close: () => void }) => {
			close();

			void handler(config).catch((error) => {
				window.alert(getCommandActionErrorMessage(action, error));
			});
		},
	});
}

function mount(): void {
	const config = window.MinimalMapAdminCommandsConfig ?? DEFAULT_CONFIG;

	config.sections.forEach(registerSectionCommand);
	config.actions.forEach((action) => registerActionCommand(action, config));
}

domReady( mount );

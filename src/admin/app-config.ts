import { __ } from '@wordpress/i18n';
import type { AdminAppConfig, AdminSection, AdminSectionView, DashboardCardView } from '../types';

export type AdminSectionMap = Partial<Record<AdminSectionView, AdminSection>>;

export const DEFAULT_ADMIN_CONFIG: AdminAppConfig = {
	currentView: 'dashboard',
	sections: [],
	stats: {
		locations: 0,
		collections: 0,
		logos: 0,
		markers: 0,
		tags: 0,
	},
	collectionsConfig: {
		nonce: '',
		restBase: '',
		restPath: '',
		queryPath: '',
	},
	locationsConfig: {
		nonce: '',
		restBase: '',
		restPath: '',
		geocodePath: '',
		queryPath: '',
		lookupPath: '',
		settingsPath: '',
		preferredPerPage: 8,
	},
	markersConfig: {
		nonce: '',
		restBase: '',
		restPath: '',
		queryPath: '',
	},
	logosConfig: {
		nonce: '',
		restBase: '',
		restPath: '',
		queryPath: '',
	},
	tagsConfig: {
		nonce: '',
		restBase: '',
		restPath: '',
		queryPath: '',
	},
	stylesConfig: {
		nonce: '',
		restBase: '',
		restPath: '',
		paletteTemplates: [],
	},
	analyticsConfig: {
		nonce: '',
		enabled: false,
		complianzEnabled: false,
		complianzInstalled: false,
		settingsPath: '',
		summaryPath: '',
		queriesPath: '',
	},
	mapConfig: {},
};

export const adminConfig: AdminAppConfig = window.MinimalMapAdminConfig ?? DEFAULT_ADMIN_CONFIG;

export const CARD_VIEWS: DashboardCardView[] = [ 'analytics', 'locations', 'collections', 'logos', 'markers', 'tags', 'styles' ];

export function isAdminSectionView(value: string): value is AdminSectionView {
	return value === 'dashboard' ||
		value === 'analytics' ||
		value === 'locations' ||
		value === 'collections' ||
		value === 'logos' ||
		value === 'tags' ||
		value === 'markers' ||
		value === 'styles';
}

export function getSectionMap(sections: AdminSection[] = adminConfig.sections): AdminSectionMap {
	return sections.reduce<AdminSectionMap>((accumulator, section) => {
		accumulator[section.view] = section;
		return accumulator;
	}, {});
}

export function getActiveSection(
	currentView: AdminSectionView,
	sectionMap: AdminSectionMap = getSectionMap()
): AdminSection {
	return sectionMap[currentView] ?? sectionMap.dashboard ?? {
		view: 'dashboard',
		title: __('Dashboard', 'minimal-map'),
		description: __('An overview of Minimal Map: Store Locator & Map Block sections and upcoming data tools.', 'minimal-map'),
		url: '#',
	};
}

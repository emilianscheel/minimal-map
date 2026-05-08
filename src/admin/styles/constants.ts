import { __ } from '@wordpress/i18n';
import type { StyleThemeSlot } from '../../types';

export const SLOT_LABELS: Record<StyleThemeSlot, string> = {
	background: __('Background', 'emilian-scheel-minimal-map'),
	park: __('Parks', 'emilian-scheel-minimal-map'),
	residential: __('Residential Areas', 'emilian-scheel-minimal-map'),
	forest: __('Forests', 'emilian-scheel-minimal-map'),
	ice: __('Ice & Glaciers', 'emilian-scheel-minimal-map'),
	water: __('Water Surfaces', 'emilian-scheel-minimal-map'),
	waterway: __('Rivers & Canals', 'emilian-scheel-minimal-map'),
	building: __('Buildings', 'emilian-scheel-minimal-map'),
	buildingOutline: __('Building Outlines', 'emilian-scheel-minimal-map'),
	path: __('Pedestrian Paths', 'emilian-scheel-minimal-map'),
	roadMinor: __('Minor Roads', 'emilian-scheel-minimal-map'),
	roadMajorCasing: __('Major Road Casing', 'emilian-scheel-minimal-map'),
	roadMajorFill: __('Major Road Fill', 'emilian-scheel-minimal-map'),
	motorwayCasing: __('Motorway Casing', 'emilian-scheel-minimal-map'),
	motorwayFill: __('Motorway Fill', 'emilian-scheel-minimal-map'),
	rail: __('Railway Lines', 'emilian-scheel-minimal-map'),
	railDash: __('Railway Patterns', 'emilian-scheel-minimal-map'),
	boundary: __('Administrative Boundaries', 'emilian-scheel-minimal-map'),
	aerowayLine: __('Runway Lines', 'emilian-scheel-minimal-map'),
	aerowayArea: __('Airport Grounds', 'emilian-scheel-minimal-map'),
	waterLabel: __('Water Labels', 'emilian-scheel-minimal-map'),
	waterLabelHalo: __('Water Label Halo', 'emilian-scheel-minimal-map'),
	roadLabel: __('Road Labels', 'emilian-scheel-minimal-map'),
	roadLabelHalo: __('Road Label Halo', 'emilian-scheel-minimal-map'),
	airportIcon: __('Airport Icons', 'emilian-scheel-minimal-map'),
	placeLabel: __('Place Labels', 'emilian-scheel-minimal-map'),
	placeLabelHalo: __('Place Label Halo', 'emilian-scheel-minimal-map'),
	placeIcon: __('Place Icons', 'emilian-scheel-minimal-map'),
};

export const COLOR_GROUPS: { label: string; slots: StyleThemeSlot[] }[] = [
	{
		label: __('Base Surfaces', 'emilian-scheel-minimal-map'),
		slots: [ 'background', 'park', 'residential', 'forest', 'ice', 'water', 'waterway' ],
	},
	{
		label: __('Structures', 'emilian-scheel-minimal-map'),
		slots: [ 'building', 'buildingOutline' ],
	},
	{
		label: __('Roads & Transport', 'emilian-scheel-minimal-map'),
		slots: [ 'path', 'roadMinor', 'roadMajorCasing', 'roadMajorFill', 'motorwayCasing', 'motorwayFill', 'rail', 'railDash' ],
	},
	{
		label: __('Other Features', 'emilian-scheel-minimal-map'),
		slots: [ 'boundary', 'aerowayLine', 'aerowayArea' ],
	},
	{
		label: __('Typography & Icons', 'emilian-scheel-minimal-map'),
		slots: [ 'waterLabel', 'waterLabelHalo', 'roadLabel', 'roadLabelHalo', 'airportIcon', 'placeLabel', 'placeLabelHalo', 'placeIcon' ],
	},
];

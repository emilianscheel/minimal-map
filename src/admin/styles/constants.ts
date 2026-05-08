import { __ } from '@wordpress/i18n';
import type { StyleThemeSlot } from '../../types';

export const SLOT_LABELS: Record<StyleThemeSlot, string> = {
	background: __('Background', 'minimal-map'),
	park: __('Parks', 'minimal-map'),
	residential: __('Residential Areas', 'minimal-map'),
	forest: __('Forests', 'minimal-map'),
	ice: __('Ice & Glaciers', 'minimal-map'),
	water: __('Water Surfaces', 'minimal-map'),
	waterway: __('Rivers & Canals', 'minimal-map'),
	building: __('Buildings', 'minimal-map'),
	buildingOutline: __('Building Outlines', 'minimal-map'),
	path: __('Pedestrian Paths', 'minimal-map'),
	roadMinor: __('Minor Roads', 'minimal-map'),
	roadMajorCasing: __('Major Road Casing', 'minimal-map'),
	roadMajorFill: __('Major Road Fill', 'minimal-map'),
	motorwayCasing: __('Motorway Casing', 'minimal-map'),
	motorwayFill: __('Motorway Fill', 'minimal-map'),
	rail: __('Railway Lines', 'minimal-map'),
	railDash: __('Railway Patterns', 'minimal-map'),
	boundary: __('Administrative Boundaries', 'minimal-map'),
	aerowayLine: __('Runway Lines', 'minimal-map'),
	aerowayArea: __('Airport Grounds', 'minimal-map'),
	waterLabel: __('Water Labels', 'minimal-map'),
	waterLabelHalo: __('Water Label Halo', 'minimal-map'),
	roadLabel: __('Road Labels', 'minimal-map'),
	roadLabelHalo: __('Road Label Halo', 'minimal-map'),
	airportIcon: __('Airport Icons', 'minimal-map'),
	placeLabel: __('Place Labels', 'minimal-map'),
	placeLabelHalo: __('Place Label Halo', 'minimal-map'),
	placeIcon: __('Place Icons', 'minimal-map'),
};

export const COLOR_GROUPS: { label: string; slots: StyleThemeSlot[] }[] = [
	{
		label: __('Base Surfaces', 'minimal-map'),
		slots: [ 'background', 'park', 'residential', 'forest', 'ice', 'water', 'waterway' ],
	},
	{
		label: __('Structures', 'minimal-map'),
		slots: [ 'building', 'buildingOutline' ],
	},
	{
		label: __('Roads & Transport', 'minimal-map'),
		slots: [ 'path', 'roadMinor', 'roadMajorCasing', 'roadMajorFill', 'motorwayCasing', 'motorwayFill', 'rail', 'railDash' ],
	},
	{
		label: __('Other Features', 'minimal-map'),
		slots: [ 'boundary', 'aerowayLine', 'aerowayArea' ],
	},
	{
		label: __('Typography & Icons', 'minimal-map'),
		slots: [ 'waterLabel', 'waterLabelHalo', 'roadLabel', 'roadLabelHalo', 'airportIcon', 'placeLabel', 'placeLabelHalo', 'placeIcon' ],
	},
];

import { __ } from '@wordpress/i18n';
import type { StyleOption, StylePresets } from '../types';

export const DEFAULT_STYLE_PRESETS: StylePresets = {
	liberty: {
		label: __( 'Liberty', 'emilian-scheel-minimal-map' ),
		style_url: 'https://tiles.openfreemap.org/styles/liberty',
	},
	bright: {
		label: __( 'Bright', 'emilian-scheel-minimal-map' ),
		style_url: 'https://tiles.openfreemap.org/styles/bright',
	},
	positron: {
		label: __( 'Positron', 'emilian-scheel-minimal-map' ),
		style_url: 'https://tiles.openfreemap.org/styles/positron',
	},
};

export function getStylePresets(runtimePresets: StylePresets = {}): StylePresets {
	if (Object.keys(runtimePresets).length > 0) {
		return runtimePresets;
	}

	return DEFAULT_STYLE_PRESETS;
}

export function getStyleOptions(runtimePresets: StylePresets = {}): StyleOption[] {
	const presets = getStylePresets(runtimePresets);

	return Object.entries(presets).map(([ value, preset ]) => ({
		label: preset.label,
		value,
	}));
}

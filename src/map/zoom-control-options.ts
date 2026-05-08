import {
	arrowDownLeft,
	arrowDownRight,
	arrowUpLeft,
	arrowUpRight,
	closeSmall,
	lineSolid,
	plus,
	plusCircle,
	plusCircleFilled,
	separator,
} from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import type { ReactElement } from 'react';
import type { BoxValue, ZoomControlIcon, ZoomControlsPosition } from '../types';

export interface ZoomControlIconOption {
	label: string;
	value: ZoomControlIcon;
	icon: ReactElement;
	svg: string;
}

export interface ZoomControlPositionOption {
	label: string;
	value: ZoomControlsPosition;
	icon: ReactElement;
}

export const DEFAULT_ZOOM_CONTROLS_PADDING: Required<BoxValue> = {
	top: '8px',
	right: '8px',
	bottom: '8px',
	left: '8px',
};

export const DEFAULT_ZOOM_CONTROLS_OUTER_MARGIN: Required<BoxValue> = {
	top: '16px',
	right: '16px',
	bottom: '16px',
	left: '16px',
};

export const DEFAULT_ZOOM_CONTROLS_BORDER_RADIUS = '2px';
export const DEFAULT_ZOOM_CONTROLS_BORDER_WIDTH = '1px';
export const DEFAULT_ZOOM_CONTROLS_BACKGROUND_COLOR = '#ffffff';
export const DEFAULT_ZOOM_CONTROLS_ICON_COLOR = '#1e1e1e';
export const DEFAULT_ZOOM_CONTROLS_BORDER_COLOR = '#dcdcde';
export const DEFAULT_ZOOM_CONTROLS_POSITION: ZoomControlsPosition = 'top-right';
export const DEFAULT_ZOOM_CONTROLS_PLUS_ICON: ZoomControlIcon = 'plus';
export const DEFAULT_ZOOM_CONTROLS_MINUS_ICON: ZoomControlIcon = 'line-solid';

export const ZOOM_CONTROLS_POSITION_OPTIONS: ZoomControlPositionOption[] = [
	{ label: __( 'Top left', 'minimal-map' ), value: 'top-left', icon: arrowUpLeft as ReactElement },
	{ label: __( 'Top right', 'minimal-map' ), value: 'top-right', icon: arrowUpRight as ReactElement },
	{ label: __( 'Bottom left', 'minimal-map' ), value: 'bottom-left', icon: arrowDownLeft as ReactElement },
	{ label: __( 'Bottom right', 'minimal-map' ), value: 'bottom-right', icon: arrowDownRight as ReactElement },
];

export const ZOOM_CONTROLS_PLUS_ICON_OPTIONS: ZoomControlIconOption[] = [
	{
		label: __( 'Plus', 'minimal-map' ),
		value: 'plus',
		icon: plus as ReactElement,
		svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
	},
	{
		label: __( 'Plus circle', 'minimal-map' ),
		value: 'plus-circle',
		icon: plusCircle as ReactElement,
		svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>',
	},
	{
		label: __( 'Filled plus circle', 'minimal-map' ),
		value: 'plus-circle-filled',
		icon: plusCircleFilled as ReactElement,
		svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M8 12h8" stroke="var(--minimal-map-controls-button-background, #fff)"/><path d="M12 8v8" stroke="var(--minimal-map-controls-button-background, #fff)"/></svg>',
	},
];

export const ZOOM_CONTROLS_MINUS_ICON_OPTIONS: ZoomControlIconOption[] = [
	{
		label: __( 'Line', 'minimal-map' ),
		value: 'line-solid',
		icon: lineSolid as ReactElement,
		svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
	},
	{
		label: __( 'Separator', 'minimal-map' ),
		value: 'separator',
		icon: separator as ReactElement,
		svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 16-4 4-4-4"/><path d="M3 12h18"/><path d="m8 8 4-4 4 4"/></svg>',
	},
	{
		label: __( 'Close small', 'minimal-map' ),
		value: 'close-small',
		icon: closeSmall as ReactElement,
		svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
	},
];

const ZOOM_CONTROLS_ICON_OPTIONS = [
	...ZOOM_CONTROLS_PLUS_ICON_OPTIONS,
	...ZOOM_CONTROLS_MINUS_ICON_OPTIONS,
];

export function getZoomControlRuntimeIconSvg(icon: ZoomControlIcon): string {
	return ZOOM_CONTROLS_ICON_OPTIONS.find((option) => option.value === icon)?.svg ??
		ZOOM_CONTROLS_PLUS_ICON_OPTIONS[0].svg;
}

import type { Map as MapLibreMap } from 'maplibre-gl';
import { __ } from '@wordpress/i18n';
import { getZoomControlRuntimeIconSvg } from './zoom-control-options';
import { getMapDomContext } from './dom-context';
import type { NormalizedMapConfig, WordPressZoomControls } from '../types';

const LIVE_LOCATION_ICON = `
	<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
		<line x1="4" x2="6.25" y1="12" y2="12" />
		<line x1="17.75" x2="20" y1="12" y2="12" />
		<line x1="12" x2="12" y1="4" y2="6.25" />
		<line x1="12" x2="12" y1="17.75" y2="20" />
		<circle cx="12" cy="12" r="5.75" />
		<circle cx="12" cy="12" r="1.9" />
	</svg>
`;

function applyControlStyles(controls: HTMLDivElement, config: NormalizedMapConfig): void {
	controls.dataset.position = config.zoomControlsPosition;
	controls.style.setProperty('--minimal-map-controls-margin-top', config.zoomControlsOuterMargin.top);
	controls.style.setProperty('--minimal-map-controls-margin-right', config.zoomControlsOuterMargin.right);
	controls.style.setProperty('--minimal-map-controls-margin-bottom', config.zoomControlsOuterMargin.bottom);
	controls.style.setProperty('--minimal-map-controls-margin-left', config.zoomControlsOuterMargin.left);
	controls.style.setProperty('--minimal-map-controls-button-padding-top', config.zoomControlsPadding.top);
	controls.style.setProperty('--minimal-map-controls-button-padding-right', config.zoomControlsPadding.right);
	controls.style.setProperty('--minimal-map-controls-button-padding-bottom', config.zoomControlsPadding.bottom);
	controls.style.setProperty('--minimal-map-controls-button-padding-left', config.zoomControlsPadding.left);
	controls.style.setProperty('--minimal-map-controls-button-background', config.zoomControlsBackgroundColor);
	controls.style.setProperty('--minimal-map-controls-button-color', config.zoomControlsIconColor);
	controls.style.setProperty('--minimal-map-controls-button-border-radius', config.zoomControlsBorderRadius);
	controls.style.setProperty('--minimal-map-controls-button-border-color', config.zoomControlsBorderColor);
	controls.style.setProperty('--minimal-map-controls-button-border-width', config.zoomControlsBorderWidth);
}

function createControlButton(
	label: string,
	icon: string,
	onClick: () => void,
	host: HTMLElement
): HTMLButtonElement {
	const context = getMapDomContext(host);
	const button = context.doc.createElement('button');
	const iconWrap = context.doc.createElement('span');

	button.type = 'button';
	button.className = 'minimal-map-controls__button';
	button.setAttribute('aria-label', label);
	button.addEventListener('click', onClick);

	iconWrap.className = 'minimal-map-controls__icon';
	iconWrap.innerHTML = icon;
	button.appendChild(iconWrap);

	return button;
}

export function createWordPressZoomControls(
	host: HTMLElement,
	map: MapLibreMap,
	config: NormalizedMapConfig,
	onLiveLocationSelect?: () => void,
	isLiveLocationBusy = false
): WordPressZoomControls {
	const context = getMapDomContext(host);
	const controls = context.doc.createElement('div');
	let liveLocationButton: HTMLButtonElement | null = null;

	controls.className = 'minimal-map-controls';
	applyControlStyles(controls, config);

	const zoomInButton = createControlButton(
		__( 'Zoom in', 'minimal-map' ),
		getZoomControlRuntimeIconSvg(config.zoomControlsPlusIcon),
		() => map.zoomIn(),
		host
	);
	const zoomOutButton = createControlButton(
		__( 'Zoom out', 'minimal-map' ),
		getZoomControlRuntimeIconSvg(config.zoomControlsMinusIcon),
		() => map.zoomOut(),
		host
	);

	if (config.allowSearch && config.enableLiveLocationMap) {
		liveLocationButton = createControlButton(
			__( 'My location', 'minimal-map' ),
			LIVE_LOCATION_ICON,
			() => {
				onLiveLocationSelect?.();
			},
			host
		);
		liveLocationButton.disabled = isLiveLocationBusy;
		liveLocationButton.classList.add('minimal-map-controls__button--live-location');
	}

	controls.append(zoomInButton, zoomOutButton);

	if (liveLocationButton) {
		controls.appendChild(liveLocationButton);
	}

	host.appendChild(controls);

	return {
		destroy() {
			controls.remove();
		},
		setLiveLocationBusy(nextIsBusy) {
			if (!liveLocationButton) {
				return;
			}

			liveLocationButton.disabled = nextIsBusy;
		},
	};
}

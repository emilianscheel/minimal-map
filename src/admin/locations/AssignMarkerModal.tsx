import { Button, ComboboxControl, Modal } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import MarkerMiniMap from '../../components/MarkerMiniMap';
import Kbd from '../../components/Kbd';
import { getAssignableMarkerIds, getLocationsWithAssignedMarkers } from './assignmentHelpers';
import type { LocationsController } from './types';

export default function AssignMarkerModal({ controller }: { controller: LocationsController }) {
	if (!controller.isAssignMarkerModalOpen || controller.selectedMarkerLocations.length === 0) {
		return null;
	}

	const isBulk = controller.selectedMarkerLocations.length > 1;
	const firstLocation = controller.selectedMarkerLocations[0];
	const assignedMarker = !isBulk && firstLocation
		? controller.getMarkerForLocation(firstLocation.id)
		: null;
	const assignableMarkerIds = new Set(
		getAssignableMarkerIds(
			controller.selectedMarkerLocations,
			controller.markers.map((marker) => marker.id)
		)
	);
	const options = controller.markers
		.filter((marker) => assignableMarkerIds.has(marker.id))
		.map((marker) => ({
			label: marker.title || __('Untitled marker', 'minimal-map'),
			value: `${marker.id}`,
		}));
	const assignedLocationCount = getLocationsWithAssignedMarkers(controller.selectedMarkerLocations).length;

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const target = event.target;
		const isHTMLElement = target instanceof HTMLElement;
		const isComboboxExpanded =
			isHTMLElement && target.getAttribute('role') === 'combobox'
				? target.getAttribute('aria-expanded') === 'true'
				: false;

		if (
			controller.isAssignmentSaving ||
			event.key !== 'Enter' ||
			event.shiftKey ||
			isComboboxExpanded ||
			(isHTMLElement &&
				target.closest('[data-minimal-map-dialog-ignore-enter="true"]'))
		) {
			return;
		}

		event.preventDefault();
		void controller.onAssignMarkerToLocation();
	};

	return (
		<Modal
			className="minimal-map-admin__collection-modal"
			title={__('Assign Marker', 'minimal-map')}
			onRequestClose={controller.onCloseAssignMarkerModal}
			shouldCloseOnClickOutside={!controller.isAssignmentSaving}
			shouldCloseOnEsc={!controller.isAssignmentSaving}
			onKeyDown={handleKeyDown}
		>
			<div className="minimal-map-admin__assign-to-collection-dialog">
				<div className="minimal-map-admin__assign-to-collection-copy">
					{isBulk ? (
						<p className="minimal-map-admin__assign-to-collection-empty">
							{sprintf(
								_n(
									'Assign one new marker to %d selected location. %d currently use a custom marker.',
									'Assign one new marker to %d selected locations. %d currently use a custom marker.',
									controller.selectedMarkerLocations.length,
									'minimal-map'
								),
								controller.selectedMarkerLocations.length,
								assignedLocationCount
							)}
						</p>
					) : assignedMarker ? (
						<div className="minimal-map-admin__assigned-logo-card">
							<MarkerMiniMap marker={assignedMarker} theme={controller.activeTheme} />
							<code className="minimal-map-admin__logo-filename">{assignedMarker.title}</code>
						</div>
					) : (
						<p className="minimal-map-admin__assign-to-collection-empty">
							{__('No custom marker assigned yet.', 'minimal-map')}
						</p>
					)}
				</div>

				<ComboboxControl
					__next40pxDefaultSize
					label={__('Marker', 'minimal-map')}
					value={controller.assignmentMarkerId}
					options={options}
					onChange={(value) => controller.onSelectAssignmentMarker(value ?? '')}
					help={
						controller.markers.length === 0
							? __('Upload a marker first to assign one to these locations.', 'minimal-map')
							: options.length === 0
								? __('All available markers are already assigned for this selection.', 'minimal-map')
								: __('Choose a custom SVG marker to apply to the selected locations.', 'minimal-map')
					}
				/>

				<div className="minimal-map-admin__assign-to-collection-actions">
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						onClick={controller.onCloseAssignMarkerModal}
						disabled={controller.isAssignmentSaving}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						__next40pxDefaultSize
						variant="primary"
						onClick={() => void controller.onAssignMarkerToLocation()}
						isBusy={controller.isAssignmentSaving}
						disabled={controller.isAssignmentSaving || !controller.assignmentMarkerId}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Save Marker', 'minimal-map')}</span>
							<Kbd variant="blue">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

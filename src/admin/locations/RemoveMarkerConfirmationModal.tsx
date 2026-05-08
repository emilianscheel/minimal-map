import { Button, Modal } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import { getLocationsWithAssignedMarkers } from './assignmentHelpers';
import type { LocationsController } from './types';

export default function RemoveMarkerConfirmationModal({
	controller,
}: {
	controller: LocationsController;
}) {
	if (
		!controller.isRemoveMarkerConfirmationModalOpen ||
		controller.selectedMarkerRemovalLocations.length === 0
	) {
		return null;
	}

	const affectedLocations = getLocationsWithAssignedMarkers(controller.selectedMarkerRemovalLocations);

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const target = event.target;
		if (
			controller.isAssignmentSaving ||
			event.key !== 'Enter' ||
			event.shiftKey ||
			(target instanceof HTMLElement &&
				target.closest('[data-minimal-map-dialog-ignore-enter="true"]'))
		) {
			return;
		}

		event.preventDefault();
		void controller.onClearMarkersFromLocations();
	};

	return (
		<Modal
			title={__('Remove Markers', 'minimal-map')}
			onRequestClose={controller.onCloseRemoveMarkerConfirmationModal}
			shouldCloseOnClickOutside={!controller.isAssignmentSaving}
			shouldCloseOnEsc={!controller.isAssignmentSaving}
			onKeyDown={handleKeyDown}
		>
			<div className="minimal-map-admin__collection-delete-dialog">
				<p className="minimal-map-admin__collection-delete-dialog-copy">
					{affectedLocations.length === 0
						? __('None of the selected locations have a custom marker assigned. Confirm to close this selection.', 'minimal-map')
						: sprintf(
							_n(
								'Remove markers from %d selected location? %d of them currently have a custom marker assigned.',
								'Remove markers from %d selected locations? %d of them currently have a custom marker assigned.',
								controller.selectedMarkerRemovalLocations.length,
								'minimal-map'
							),
							controller.selectedMarkerRemovalLocations.length,
							affectedLocations.length
						)}
				</p>
				<div className="minimal-map-admin__collection-delete-dialog-actions">
					<Button
						variant="tertiary"
						onClick={controller.onCloseRemoveMarkerConfirmationModal}
						disabled={controller.isAssignmentSaving}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						variant="primary"
						isDestructive
						onClick={() => void controller.onClearMarkersFromLocations()}
						isBusy={controller.isAssignmentSaving}
						disabled={controller.isAssignmentSaving}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Remove Markers', 'minimal-map')}</span>
							<Kbd variant="red">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

import { Button, Modal } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import { getLocationsWithAssignedTags } from './assignmentHelpers';
import type { LocationsController } from './types';

export default function RemoveTagsConfirmationModal({
	controller,
}: {
	controller: LocationsController;
}) {
	if (
		!controller.isRemoveTagsConfirmationModalOpen ||
		controller.selectedTagRemovalLocations.length === 0
	) {
		return null;
	}

	const affectedLocations = getLocationsWithAssignedTags(controller.selectedTagRemovalLocations);

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
		void controller.onClearTagsFromLocations();
	};

	return (
		<Modal
			title={__('Remove Tags', 'minimal-map')}
			onRequestClose={controller.onCloseRemoveTagsConfirmationModal}
			shouldCloseOnClickOutside={!controller.isAssignmentSaving}
			shouldCloseOnEsc={!controller.isAssignmentSaving}
			onKeyDown={handleKeyDown}
		>
			<div className="minimal-map-admin__collection-delete-dialog">
				<p className="minimal-map-admin__collection-delete-dialog-copy">
					{affectedLocations.length === 0
						? __('None of the selected locations have tags assigned. Confirm to close this selection.', 'minimal-map')
						: sprintf(
							_n(
								'Remove tags from %d selected location? %d of them currently have tags assigned.',
								'Remove tags from %d selected locations? %d of them currently have tags assigned.',
								controller.selectedTagRemovalLocations.length,
								'minimal-map'
							),
							controller.selectedTagRemovalLocations.length,
							affectedLocations.length
						)}
				</p>
				<div className="minimal-map-admin__collection-delete-dialog-actions">
					<Button
						variant="tertiary"
						onClick={controller.onCloseRemoveTagsConfirmationModal}
						disabled={controller.isAssignmentSaving}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						variant="primary"
						isDestructive
						onClick={() => void controller.onClearTagsFromLocations()}
						isBusy={controller.isAssignmentSaving}
						disabled={controller.isAssignmentSaving}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Remove Tags', 'minimal-map')}</span>
							<Kbd variant="red">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

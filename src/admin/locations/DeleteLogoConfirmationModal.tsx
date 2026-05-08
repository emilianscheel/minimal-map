import { Button, Modal } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import LogoPreview from '../../components/LogoPreview';
import Kbd from '../../components/Kbd';
import { getLocationsWithAssignedLogos } from './assignmentHelpers';
import type { LocationsController } from './types';

export default function DeleteLogoConfirmationModal({
	controller,
}: {
	controller: LocationsController;
}) {
	if (
		!controller.isDeleteLogoConfirmationModalOpen ||
		controller.selectedLogoRemovalLocations.length === 0
	) {
		return null;
	}

	const isBulk = controller.selectedLogoRemovalLocations.length > 1;
	const affectedLocations = getLocationsWithAssignedLogos(controller.selectedLogoRemovalLocations);
	const firstLogoLocation = affectedLocations[0];
	const logo = firstLogoLocation ? controller.getLogoForLocation(firstLogoLocation.id) : null;

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
		void controller.onClearLogosFromLocations();
	};

	return (
		<Modal
			title={__('Remove Logo', 'minimal-map')}
			onRequestClose={controller.onCloseDeleteLogoConfirmationModal}
			shouldCloseOnClickOutside={!controller.isAssignmentSaving}
			shouldCloseOnEsc={!controller.isAssignmentSaving}
			onKeyDown={handleKeyDown}
		>
			<div className="minimal-map-admin__collection-delete-dialog">
				<p className="minimal-map-admin__collection-delete-dialog-copy">
					{affectedLocations.length === 0
						? isBulk
							? __('None of the selected locations have a logo assigned. Confirm to close this selection.', 'minimal-map')
							: __('This location already has no logo assigned.', 'minimal-map')
						: isBulk
							? sprintf(
								_n(
									'Remove logos from %d selected location? %d of them currently have a logo assigned.',
									'Remove logos from %d selected locations? %d of them currently have a logo assigned.',
									controller.selectedLogoRemovalLocations.length,
									'minimal-map'
								),
								controller.selectedLogoRemovalLocations.length,
								affectedLocations.length
							)
							: __('Remove this logo from the selected location?', 'minimal-map')}
				</p>
				{logo && !isBulk && (
					<div className="minimal-map-admin__assigned-logo-card">
						<div className="minimal-map-admin__assigned-logo-surface">
							<LogoPreview logo={logo} className="minimal-map-admin__assigned-logo-preview" />
						</div>
						<code className="minimal-map-admin__logo-filename">{logo.title}</code>
					</div>
				)}
				<div className="minimal-map-admin__collection-delete-dialog-actions">
					<Button
						variant="tertiary"
						onClick={controller.onCloseDeleteLogoConfirmationModal}
						disabled={controller.isAssignmentSaving}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						variant="primary"
						isDestructive
						onClick={() => void controller.onClearLogosFromLocations()}
						isBusy={controller.isAssignmentSaving}
						disabled={controller.isAssignmentSaving}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Remove Logos', 'minimal-map')}</span>
							<Kbd variant="red">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

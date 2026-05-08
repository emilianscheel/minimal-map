import { Button, Modal } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import OpeningHoursInput from './OpeningHoursInput';
import type { LocationsController } from './types';

export default function AssignOpeningHoursModal({ controller }: { controller: LocationsController }) {
	if (!controller.isAssignOpeningHoursModalOpen || controller.selectedOpeningHoursLocations.length === 0) {
		return null;
	}

	const isBulk = controller.selectedOpeningHoursLocations.length > 1;

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const target = event.target;
		const isHTMLElement = target instanceof HTMLElement;

		if (
			controller.isAssignmentSaving ||
			event.key !== 'Enter' ||
			event.shiftKey ||
			(isHTMLElement &&
				target.closest('[data-minimal-map-dialog-ignore-enter="true"]'))
		) {
			return;
		}

		event.preventDefault();
		void controller.onAssignOpeningHoursToLocations();
	};

	return (
		<Modal
			className="minimal-map-admin__location-modal"
			title={__('Assign Opening Hours', 'minimal-map')}
			onRequestClose={controller.onCloseAssignOpeningHoursModal}
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
									'Set opening hours for %d selected location.',
									'Set opening hours for %d selected locations.',
									controller.selectedOpeningHoursLocations.length,
									'minimal-map'
								),
								controller.selectedOpeningHoursLocations.length
							)}
						</p>
					) : (
						<p className="minimal-map-admin__assign-to-collection-empty">
							{sprintf(
								__('Set opening hours for "%s".', 'minimal-map'),
								controller.selectedOpeningHoursLocations[0].title
							)}
						</p>
					)}
				</div>

				<OpeningHoursInput
					fieldErrors={controller.fieldErrors}
					form={controller.form}
					onChangeDayValue={controller.onChangeOpeningHoursDayValue}
					onChangeNotes={controller.onChangeOpeningHoursNotes}
				/>

				<div className="minimal-map-admin__assign-to-collection-actions">
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						onClick={controller.onCloseAssignOpeningHoursModal}
						disabled={controller.isAssignmentSaving}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						__next40pxDefaultSize
						variant="primary"
						onClick={() => void controller.onAssignOpeningHoursToLocations()}
						isBusy={controller.isAssignmentSaving}
						disabled={controller.isAssignmentSaving}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Save Opening Hours', 'minimal-map')}</span>
							<Kbd variant="blue">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

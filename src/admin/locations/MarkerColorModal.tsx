import { Button, Modal, Notice } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import { ColorControl } from '../styles/ColorControl';
import type { LocationsController } from './types';

export default function MarkerColorModal({ controller }: { controller: LocationsController }) {
	if (!controller.isMarkerColorModalOpen || controller.selectedMarkerColorLocations.length === 0) {
		return null;
	}

	const isBulk = controller.selectedMarkerColorLocations.length > 1;

	return (
		<Modal
			className="minimal-map-admin__collection-modal"
			title={isBulk ? __('Edit marker colors', 'minimal-map') : __('Edit marker color', 'minimal-map')}
			onRequestClose={controller.onCloseMarkerColorModal}
			shouldCloseOnClickOutside={!controller.isSubmitting}
			shouldCloseOnEsc={!controller.isSubmitting}
		>
			<div
				className="minimal-map-admin__collection-dialog"
				onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
					if (controller.isSubmitting || !shouldHandleModalEnter(event)) {
						return;
					}

					event.preventDefault();
					void controller.onConfirmMarkerColor();
				}}
			>
				{controller.submitError ? (
					<Notice status="error" isDismissible={false}>
						{controller.submitError}
					</Notice>
				) : null}

				<div className="minimal-map-admin__location-dialog-fields">
					{isBulk && (
						<p className="minimal-map-admin__assign-to-collection-empty">
							{sprintf(
								_n(
									'Set a new marker color for %d selected location.',
									'Set a new marker color for %d selected locations.',
									controller.selectedMarkerColorLocations.length,
									'minimal-map'
								),
								controller.selectedMarkerColorLocations.length
							)}
						</p>
					)}
					<ColorControl
						label={__('Marker Color', 'minimal-map')}
						color={controller.form.marker_color}
						onChange={(value) => controller.onChangeFormValue('marker_color', value)}
					/>
				</div>

				<div className="minimal-map-admin__collection-dialog-actions">
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						onClick={controller.onCloseMarkerColorModal}
						disabled={controller.isSubmitting}
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						__next40pxDefaultSize
						variant="primary"
						onClick={() => void controller.onConfirmMarkerColor()}
						isBusy={controller.isSubmitting}
						disabled={controller.isSubmitting}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Save changes', 'minimal-map')}</span>
							<Kbd variant="blue">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

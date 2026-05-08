import { Button, Modal, Notice, TextControl } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import type { MarkersController } from './types';

export default function RenameMarkerModal({ controller }: { controller: MarkersController }) {
	if (!controller.isEditModalOpen || !controller.editingMarker) {
		return null;
	}

	return (
		<Modal
			className="minimal-map-admin__collection-modal"
			title={__('Rename marker', 'minimal-map')}
			onRequestClose={controller.onCancelEditMarker}
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
					void controller.onConfirmEditMarker();
				}}
			>
				{controller.submitError ? (
					<Notice status="error" isDismissible={false}>
						{controller.submitError}
					</Notice>
				) : null}

				<div className="minimal-map-admin__location-dialog-fields">
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={__('Filename', 'minimal-map')}
						value={controller.editFilenameBasename}
						onChange={controller.onChangeEditFilename}
						autoFocus
						help={
							controller.editFilenameExtension
								? sprintf(
										__('The %s extension will be preserved.', 'minimal-map'),
										controller.editFilenameExtension
									)
								: undefined
						}
					/>
				</div>

				<div className="minimal-map-admin__collection-dialog-actions">
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						onClick={controller.onCancelEditMarker}
						disabled={controller.isSubmitting}
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						__next40pxDefaultSize
						variant="primary"
						onClick={() => void controller.onConfirmEditMarker()}
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

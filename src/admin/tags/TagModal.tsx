import { Button, Modal, Notice, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import Kbd from '../../components/Kbd';
import { ColorControl } from '../styles/ColorControl';
import type { TagsController } from './types';

export default function TagModal({ controller }: { controller: TagsController }) {
	if (!controller.isModalOpen) {
		return null;
	}

	return (
		<Modal
			className="minimal-map-admin__collection-modal"
			title={controller.modalTitle}
			onRequestClose={controller.onCancel}
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
					void controller.onConfirm();
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
						label={__('Name', 'minimal-map')}
						value={controller.form.name}
						onChange={(value) => controller.onChangeFormValue('name', value)}
						autoFocus
					/>

					<ColorControl
						label={__('Background Color', 'minimal-map')}
						color={controller.form.background_color}
						onChange={(value) => controller.onChangeFormValue('background_color', value)}
					/>

					<ColorControl
						label={__('Foreground Color', 'minimal-map')}
						color={controller.form.foreground_color}
						onChange={(value) => controller.onChangeFormValue('foreground_color', value)}
					/>
				</div>

				<div className="minimal-map-admin__collection-dialog-actions">
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						onClick={controller.onCancel}
						disabled={controller.isSubmitting}
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						__next40pxDefaultSize
						variant="primary"
						onClick={() => void controller.onConfirm()}
						isBusy={controller.isSubmitting}
						disabled={controller.isSubmitting}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{controller.submitLabel}</span>
							<Kbd variant="blue">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

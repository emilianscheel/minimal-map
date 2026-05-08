import { Button, Modal, Notice, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import Kbd from '../../components/Kbd';
import type { CollectionsController } from './types';

export default function CollectionModal({ controller }: { controller: CollectionsController }) {
	if (!controller.isModalOpen) {
		return null;
	}

	return (
		<Modal
			className="minimal-map-admin__collection-modal"
			contentLabel={controller.modalTitle}
			focusOnMount="firstInputElement"
			onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
				const target = event.target;
				const isHTMLElement = target instanceof HTMLElement;

				if (
					controller.isSubmitting ||
					(isHTMLElement &&
						target.closest('[data-minimal-map-dialog-ignore-enter="true"]')) ||
					!shouldHandleModalEnter(event)
				) {
					return;
				}

				event.preventDefault();
				void controller.onConfirm();
			}}
			onRequestClose={controller.onCancel}
			shouldCloseOnClickOutside={!controller.isSubmitting}
			shouldCloseOnEsc={!controller.isSubmitting}
			title={controller.modalTitle}
		>
			<div className="minimal-map-admin__collection-dialog">
				{controller.submitError ? (
					<Notice status="error" isDismissible={false}>
						{controller.submitError}
					</Notice>
				) : null}
				<TextControl
					__next40pxDefaultSize
					label={__('Title', 'minimal-map')}
					value={controller.form.title}
					onChange={(value) => controller.onChangeFormValue('title', value)}
				/>
				<div className="minimal-map-admin__collection-dialog-actions">
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						onClick={controller.onCancel}
						disabled={controller.isSubmitting}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						__next40pxDefaultSize
						variant="primary"
						onClick={() => void controller.onConfirm()}
						disabled={controller.isSubmitting}
						isBusy={controller.isSubmitting}
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

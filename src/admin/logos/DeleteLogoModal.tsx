import { Button, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import type { LogosController } from './types';

export default function DeleteLogoModal({ controller }: { controller: LogosController }) {
	if (!controller.isDeleteModalOpen || !controller.selectedLogo) {
		return null;
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (controller.isRowActionPending || event.key !== 'Enter' || event.shiftKey) {
			return;
		}

		const target = event.target;
		if (target instanceof HTMLElement && target.closest('[data-minimal-map-dialog-ignore-enter="true"]')) {
			return;
		}

		event.preventDefault();
		void controller.onConfirmDeleteLogo();
	};

	return (
		<Modal
			title={__('Delete Logo', 'minimal-map')}
			onRequestClose={controller.onCloseDeleteModal}
			shouldCloseOnClickOutside={!controller.isRowActionPending}
			shouldCloseOnEsc={!controller.isRowActionPending}
			onKeyDown={handleKeyDown}
		>
			<div className="minimal-map-admin__collection-delete-dialog">
				<p className="minimal-map-admin__collection-delete-dialog-copy">
					{__(
						'Delete this logo and clear it from every assigned location? This action cannot be undone.',
						'minimal-map'
					)}
				</p>
				<p className="minimal-map-admin__collection-delete-dialog-title">
					{controller.selectedLogo.title}
				</p>
				<div className="minimal-map-admin__collection-delete-dialog-actions">
					<Button
						variant="tertiary"
						onClick={controller.onCloseDeleteModal}
						disabled={controller.isRowActionPending}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						variant="primary"
						isDestructive
						onClick={() => void controller.onConfirmDeleteLogo()}
						isBusy={controller.isRowActionPending}
						disabled={controller.isRowActionPending}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Delete Logo', 'minimal-map')}</span>
							<Kbd variant="red">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

import { Button, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import type { TagsController } from './types';

export default function DeleteTagModal({ controller }: { controller: TagsController }) {
	if (!controller.isDeleteModalOpen || !controller.selectedTag) {
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
		void controller.onConfirmDeleteTag();
	};

	return (
		<Modal
			title={__('Delete Tag', 'minimal-map')}
			onRequestClose={controller.onCloseDeleteModal}
			shouldCloseOnClickOutside={!controller.isRowActionPending}
			shouldCloseOnEsc={!controller.isRowActionPending}
			onKeyDown={handleKeyDown}
		>
			<div className="minimal-map-admin__collection-delete-dialog">
				<p className="minimal-map-admin__collection-delete-dialog-copy">
					{__('Delete this tag? This action cannot be undone.', 'minimal-map')}
				</p>
				<p className="minimal-map-admin__collection-delete-dialog-title">
					{controller.selectedTag.name}
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
						onClick={() => void controller.onConfirmDeleteTag()}
						isBusy={controller.isRowActionPending}
						disabled={controller.isRowActionPending}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Delete Tag', 'minimal-map')}</span>
							<Kbd variant="red">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

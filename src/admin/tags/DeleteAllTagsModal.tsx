import { Button, Modal } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import { useEffect, useRef } from '@wordpress/element';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import type { TagsController } from './types';

export default function DeleteAllTagsModal({
	controller,
}: {
	controller: TagsController;
}) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!controller.isDeleteAllTagsModalOpen) {
			return;
		}

		containerRef.current?.focus();
	}, [controller.isDeleteAllTagsModalOpen]);

	if (!controller.isDeleteAllTagsModalOpen) {
		return null;
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const target = event.target;
		const isHTMLElement = target instanceof HTMLElement;

		if (
			controller.isDeletingAllTags ||
			(isHTMLElement &&
				target.closest('[data-minimal-map-dialog-ignore-enter="true"]')) ||
			!shouldHandleModalEnter(event)
		) {
			return;
		}

		event.preventDefault();
		void controller.onDeleteAllTags();
	};

	return (
		<Modal
			title={__('Delete all tags', 'minimal-map')}
			onRequestClose={controller.onCloseDeleteAllTagsModal}
			shouldCloseOnClickOutside={!controller.isDeletingAllTags}
			shouldCloseOnEsc={!controller.isDeletingAllTags}
		>
			<div
				ref={containerRef}
				className="minimal-map-admin__collection-delete-dialog"
				tabIndex={0}
				style={{ outline: 'none' }}
				onKeyDown={handleKeyDown}
			>
				<p className="minimal-map-admin__collection-delete-dialog-copy">
					{sprintf(
						_n(
							'Are you sure you want to delete %d tag? This action cannot be undone.',
							'Are you sure you want to delete %d tags? This action cannot be undone.',
							controller.totalItems,
							'minimal-map'
						),
						controller.totalItems
					)}
				</p>
				<div className="minimal-map-admin__collection-delete-dialog-actions">
					<Button
						variant="tertiary"
						onClick={controller.onCloseDeleteAllTagsModal}
						disabled={controller.isDeletingAllTags}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						variant="primary"
						isDestructive
						onClick={() => {
							void controller.onDeleteAllTags();
						}}
						isBusy={controller.isDeletingAllTags}
						disabled={controller.isDeletingAllTags}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Delete all tags', 'minimal-map')}</span>
							<Kbd variant="red">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

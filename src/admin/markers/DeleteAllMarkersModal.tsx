import { Button, Modal } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import { useEffect, useRef } from '@wordpress/element';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import type { MarkersController } from './types';

export default function DeleteAllMarkersModal({
	controller,
}: {
	controller: MarkersController;
}) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!controller.isDeleteAllMarkersModalOpen) {
			return;
		}

		containerRef.current?.focus();
	}, [controller.isDeleteAllMarkersModalOpen]);

	if (!controller.isDeleteAllMarkersModalOpen) {
		return null;
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const target = event.target;
		const isHTMLElement = target instanceof HTMLElement;

		if (
			controller.isDeletingAllMarkers ||
			(isHTMLElement &&
				target.closest('[data-minimal-map-dialog-ignore-enter="true"]')) ||
			!shouldHandleModalEnter(event)
		) {
			return;
		}

		event.preventDefault();
		void controller.onDeleteAllMarkers();
	};

	return (
		<Modal
			title={__('Delete all markers', 'minimal-map')}
			onRequestClose={controller.onCloseDeleteAllMarkersModal}
			shouldCloseOnClickOutside={!controller.isDeletingAllMarkers}
			shouldCloseOnEsc={!controller.isDeletingAllMarkers}
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
							'Are you sure you want to delete %d marker? This action cannot be undone.',
							'Are you sure you want to delete %d markers? This action cannot be undone.',
							controller.totalItems,
							'minimal-map'
						),
						controller.totalItems
					)}
				</p>
				<div className="minimal-map-admin__collection-delete-dialog-actions">
					<Button
						variant="tertiary"
						onClick={controller.onCloseDeleteAllMarkersModal}
						disabled={controller.isDeletingAllMarkers}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						variant="primary"
						isDestructive
						onClick={() => {
							void controller.onDeleteAllMarkers();
						}}
						isBusy={controller.isDeletingAllMarkers}
						disabled={controller.isDeletingAllMarkers}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Delete all markers', 'minimal-map')}</span>
							<Kbd variant="red">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

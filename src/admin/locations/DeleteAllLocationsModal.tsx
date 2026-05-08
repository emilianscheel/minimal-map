import { Button, Modal } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import { useEffect, useRef } from '@wordpress/element';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import type { LocationsController } from './types';

export default function DeleteAllLocationsModal({
	controller,
}: {
	controller: LocationsController;
}) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!controller.isDeleteAllLocationsModalOpen) {
			return;
		}

		containerRef.current?.focus();
	}, [controller.isDeleteAllLocationsModalOpen]);

	if (!controller.isDeleteAllLocationsModalOpen) {
		return null;
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const target = event.target;
		const isHTMLElement = target instanceof HTMLElement;

		if (
			controller.isDeletingAllLocations ||
			(isHTMLElement &&
				target.closest('[data-minimal-map-dialog-ignore-enter="true"]')) ||
			!shouldHandleModalEnter(event)
		) {
			return;
		}

		event.preventDefault();
		void controller.onDeleteAllLocations();
	};

	return (
		<Modal
			title={__('Delete all locations', 'minimal-map')}
			onRequestClose={controller.onCloseDeleteAllLocationsModal}
			shouldCloseOnClickOutside={!controller.isDeletingAllLocations}
			shouldCloseOnEsc={!controller.isDeletingAllLocations}
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
							'Are you sure you want to delete %d location? This action cannot be undone.',
							'Are you sure you want to delete %d locations? This action cannot be undone.',
							controller.totalItems,
							'minimal-map'
						),
						controller.totalItems
					)}
				</p>
				<div className="minimal-map-admin__collection-delete-dialog-actions">
					<Button
						variant="tertiary"
						onClick={controller.onCloseDeleteAllLocationsModal}
						disabled={controller.isDeletingAllLocations}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						variant="primary"
						isDestructive
						onClick={() => {
							void controller.onDeleteAllLocations();
						}}
						isBusy={controller.isDeletingAllLocations}
						disabled={controller.isDeletingAllLocations}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Delete all locations', 'minimal-map')}</span>
							<Kbd variant="red">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

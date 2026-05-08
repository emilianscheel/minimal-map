import { Button, CheckboxControl, Modal } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import { useEffect, useRef, useState } from '@wordpress/element';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import type { CollectionsController } from './types';

export default function DeleteAllCollectionsModal({
	controller,
}: {
	controller: CollectionsController;
}) {
	const [deleteLocations, setDeleteLocations] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!controller.isDeleteAllCollectionsModalOpen) {
			return;
		}

		containerRef.current?.focus();
		setDeleteLocations(false);
	}, [controller.isDeleteAllCollectionsModalOpen]);

	if (!controller.isDeleteAllCollectionsModalOpen) {
		return null;
	}

	const handleDelete = async (): Promise<void> => {
		await controller.onDeleteAllCollections({
			deleteLocations,
			skipSharedLocations: false,
		});
	};

	return (
		<Modal
			title={__('Delete all collections', 'minimal-map')}
			onRequestClose={controller.onCloseDeleteAllCollectionsModal}
			shouldCloseOnClickOutside={!controller.isDeletingAllCollections}
			shouldCloseOnEsc={!controller.isDeletingAllCollections}
		>
			<div
				ref={containerRef}
				className="minimal-map-admin__collection-delete-dialog"
				tabIndex={0}
				style={{ outline: 'none' }}
				onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
					const target = event.target;
					const isHTMLElement = target instanceof HTMLElement;
					const isCheckboxInput =
						isHTMLElement &&
						target.tagName === 'INPUT' &&
						(target as HTMLInputElement).type === 'checkbox';

					if (
						controller.isDeletingAllCollections ||
						isCheckboxInput ||
						(isHTMLElement &&
							target.closest('[data-minimal-map-dialog-ignore-enter="true"]')) ||
						!shouldHandleModalEnter(event)
					) {
						return;
					}

					event.preventDefault();
					void handleDelete();
				}}
			>
				<p className="minimal-map-admin__collection-delete-dialog-copy">
					{sprintf(
						_n(
							'Are you sure you want to delete %d collection? This action cannot be undone.',
							'Are you sure you want to delete %d collections? This action cannot be undone.',
							controller.totalItems,
							'minimal-map'
						),
						controller.totalItems
					)}
				</p>
				<div className="minimal-map-admin__collection-delete-dialog-options">
					<CheckboxControl
						__nextHasNoMarginBottom
						label={__('Delete locations', 'minimal-map')}
						checked={deleteLocations}
						onChange={setDeleteLocations}
						disabled={controller.isDeletingAllCollections}
						data-minimal-map-dialog-ignore-enter="true"
					/>
				</div>
				<div className="minimal-map-admin__collection-delete-dialog-actions">
					<Button
						variant="tertiary"
						onClick={controller.onCloseDeleteAllCollectionsModal}
						disabled={controller.isDeletingAllCollections}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						variant="primary"
						isDestructive
						onClick={() => {
							void handleDelete();
						}}
						isBusy={controller.isDeletingAllCollections}
						disabled={controller.isDeletingAllCollections}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Delete all collections', 'minimal-map')}</span>
							<Kbd variant="red">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

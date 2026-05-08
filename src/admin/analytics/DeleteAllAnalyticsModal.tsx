import { Button, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useEffect, useRef } from '@wordpress/element';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import type { AnalyticsController } from './types';

export default function DeleteAllAnalyticsModal({
	controller,
}: {
	controller: AnalyticsController;
}) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!controller.isDeleteAllAnalyticsModalOpen) {
			return;
		}

		containerRef.current?.focus();
	}, [controller.isDeleteAllAnalyticsModalOpen]);

	if (!controller.isDeleteAllAnalyticsModalOpen) {
		return null;
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const target = event.target;
		const isHTMLElement = target instanceof HTMLElement;

		if (
			controller.isDeletingAllAnalytics ||
			(isHTMLElement &&
				target.closest('[data-minimal-map-dialog-ignore-enter="true"]')) ||
			!shouldHandleModalEnter(event)
		) {
			return;
		}

		event.preventDefault();
		void controller.onDeleteAllAnalytics();
	};

	return (
		<Modal
			title={__('Delete all tracking data', 'minimal-map')}
			onRequestClose={controller.onCloseDeleteAllAnalyticsModal}
			shouldCloseOnClickOutside={!controller.isDeletingAllAnalytics}
			shouldCloseOnEsc={!controller.isDeletingAllAnalytics}
		>
			<div
				ref={containerRef}
				className="minimal-map-admin__collection-delete-dialog"
				tabIndex={0}
				style={{ outline: 'none' }}
				onKeyDown={handleKeyDown}
			>
				<p className="minimal-map-admin__collection-delete-dialog-copy">
					{__('Are you sure you want to delete all tracking data? This action cannot be undone.', 'minimal-map')}
				</p>
				<div className="minimal-map-admin__collection-delete-dialog-actions">
					<Button
						variant="tertiary"
						onClick={controller.onCloseDeleteAllAnalyticsModal}
						disabled={controller.isDeletingAllAnalytics}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						variant="primary"
						isDestructive
						onClick={() => {
							void controller.onDeleteAllAnalytics();
						}}
						isBusy={controller.isDeletingAllAnalytics}
						disabled={controller.isDeletingAllAnalytics}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Delete all tracking data', 'minimal-map')}</span>
							<Kbd variant="red">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

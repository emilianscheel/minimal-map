import { Button, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function EnableAnalyticsModal({
	isBusy,
	onClose,
	onConfirm,
}: {
	isBusy: boolean;
	onClose: () => void;
	onConfirm: () => Promise<void>;
}) {
	return (
		<Modal
			title={__('Enable analytics tracking', 'minimal-map')}
			onRequestClose={onClose}
			shouldCloseOnClickOutside={!isBusy}
			shouldCloseOnEsc={!isBusy}
		>
			<div className="minimal-map-admin__analytics-enable-dialog">
				<p className="minimal-map-admin__analytics-enable-copy">
					{__('Enabling analytics will start storing frontend search, selection, and action events for new map interactions.', 'minimal-map')}
				</p>
				<p className="minimal-map-admin__analytics-enable-copy">
					{__('You may need to update your privacy terms before turning this on.', 'minimal-map')}
				</p>
				<div className="minimal-map-admin__analytics-enable-actions">
					<Button
						variant="tertiary"
						onClick={onClose}
						disabled={isBusy}
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						variant="primary"
						onClick={() => {
							void onConfirm();
						}}
						isBusy={isBusy}
						disabled={isBusy}
					>
						{__('Enable analytics', 'minimal-map')}
					</Button>
				</div>
			</div>
		</Modal>
	);
}

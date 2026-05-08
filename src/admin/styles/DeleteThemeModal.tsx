import { Button, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import { StyleThemeRecord } from '../../types';

interface DeleteThemeModalProps {
	isOpen: boolean;
	onRequestClose: () => void;
	onDelete: (slug: string) => Promise<void>;
	theme: StyleThemeRecord | null;
}

export function DeleteThemeModal({ isOpen, onRequestClose, onDelete, theme }: DeleteThemeModalProps) {
	const [ isDeleting, setIsDeleting ] = useState(false);

	if (!isOpen || !theme) return null;

	const handleDelete = async () => {
		if (isDeleting) return;
		setIsDeleting(true);
		try {
			await onDelete(theme.slug);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Enter' && !isDeleting) {
			event.preventDefault();
			void handleDelete();
		}
	};

	return (
		<Modal
			title={__('Delete Theme', 'minimal-map')}
			onRequestClose={onRequestClose}
			overlayClassName="minimal-map-admin__modal-overlay"
			onKeyDown={handleKeyDown}
		>
			<div className="minimal-map-admin__location-dialog">
				<p>
					{__('Are you sure you want to delete the theme:', 'minimal-map')} <strong>{theme.label}</strong>?
				</p>
				<div className="minimal-map-admin__location-dialog-actions">
					<Button variant="tertiary" onClick={onRequestClose} disabled={isDeleting}>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						variant="primary"
						isDestructive
						onClick={() => void handleDelete()}
						isBusy={isDeleting}
						disabled={isDeleting}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Delete Theme', 'minimal-map')}</span>
							<Kbd variant="red">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

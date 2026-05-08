import { Button, Modal, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';

interface CreateThemeModalProps {
	isOpen: boolean;
	onRequestClose: () => void;
	onCreate: (name: string) => Promise<void>;
}

export function CreateThemeModal({ isOpen, onRequestClose, onCreate }: CreateThemeModalProps) {
	const [ name, setName ] = useState('');
	const [ isCreating, setIsCreating ] = useState(false);

	if (!isOpen) return null;

	const handleCreate = async () => {
		if (!name || isCreating) return;
		setIsCreating(true);
		try {
			await onCreate(name);
			setName('');
		} finally {
			setIsCreating(false);
		}
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Enter' && name && !isCreating) {
			event.preventDefault();
			void handleCreate();
		}
	};

	return (
		<Modal
			title={__('Create New Theme', 'minimal-map')}
			onRequestClose={onRequestClose}
			overlayClassName="minimal-map-admin__modal-overlay"
			onKeyDown={handleKeyDown}
		>
			<div className="minimal-map-admin__location-dialog">
				<TextControl
					label={__('Theme Name', 'minimal-map')}
					value={name}
					onChange={setName}
					autoFocus
				/>
				<div className="minimal-map-admin__location-dialog-actions">
					<Button variant="tertiary" onClick={onRequestClose}>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						variant="primary"
						onClick={() => void handleCreate()}
						isBusy={isCreating}
						disabled={!name || isCreating}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Create Theme', 'minimal-map')}</span>
							<Kbd variant="blue">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

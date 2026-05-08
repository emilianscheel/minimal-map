import { Button, Modal, Notice, SearchControl } from '@wordpress/components';
import { __, sprintf, _n } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import { markerLibrary } from '../../lib/markers/markerLibrary';
import { svgToDataUrl } from '../../lib/markers/svgColors';
import type { MarkersController } from './types';

export default function MarkerLibraryModal({ controller }: { controller: MarkersController }) {
	const [query, setQuery] = useState('');
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [installError, setInstallError] = useState<string | null>(null);

	if (!controller.isLibraryModalOpen) {
		return null;
	}

	const q = query.toLowerCase().trim();
	const filtered =
		q === ''
			? markerLibrary
			: markerLibrary.filter(
					(e) =>
						e.name.toLowerCase().includes(q) ||
						e.keywords.some((k) => k.toLowerCase().includes(q))
				);

	const toggleSelection = (id: string): void => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleInstall = async (): Promise<void> => {
		if (selectedIds.size === 0 || controller.isUploading) {
			return;
		}

		setInstallError(null);

		const files = markerLibrary
			.filter((e) => selectedIds.has(e.id))
			.map((e) => new File([e.content], e.filename, { type: 'image/svg+xml' }));

		try {
			await controller.onUploadMarkers(files as unknown as FileList);
			controller.onCloseLibraryModal();
			setQuery('');
			setSelectedIds(new Set());
			setInstallError(null);
		} catch (error) {
			setInstallError(
				error instanceof Error
					? error.message
					: __('Markers could not be installed.', 'minimal-map')
			);
		}
	};

	const handleClose = (): void => {
		if (controller.isUploading) {
			return;
		}
		controller.onCloseLibraryModal();
		setQuery('');
		setSelectedIds(new Set());
		setInstallError(null);
	};

	const installLabel =
		selectedIds.size > 0
			? sprintf(
					_n('Install %d marker', 'Install %d markers', selectedIds.size, 'minimal-map'),
					selectedIds.size
				)
			: __('Install', 'minimal-map');

	return (
		<Modal
			className="minimal-map-admin__collection-modal minimal-map-admin__library-modal"
			title={__('Marker library', 'minimal-map')}
			onRequestClose={handleClose}
			shouldCloseOnClickOutside={!controller.isUploading}
			shouldCloseOnEsc={!controller.isUploading}
		>
			<div
				className="minimal-map-admin__collection-dialog minimal-map-admin__library-dialog"
				onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
					if (
						controller.isUploading ||
						selectedIds.size === 0 ||
						!shouldHandleModalEnter(event)
					) {
						return;
					}
					event.preventDefault();
					void handleInstall();
				}}
			>
				{installError ? (
					<Notice status="error" isDismissible={false}>
						{installError}
					</Notice>
				) : null}

				<SearchControl
					__nextHasNoMarginBottom
					className="minimal-map-admin__library-search"
					label={__('Search markers', 'minimal-map')}
					value={query}
					onChange={setQuery}
				/>

				{filtered.length === 0 ? (
					<p className="minimal-map-admin__library-empty">
						{__('No markers found.', 'minimal-map')}
					</p>
				) : (
					<div className="minimal-map-admin__library-grid">
						{filtered.map((entry) => {
							const isSelected = selectedIds.has(entry.id);
							return (
								<button
									key={entry.id}
									type="button"
									className={
										'minimal-map-admin__library-card' +
										(isSelected ? ' minimal-map-admin__library-card--selected' : '')
									}
									onClick={() => toggleSelection(entry.id)}
									aria-pressed={isSelected}
								>
									<div className="minimal-map-admin__library-card-preview">
										<img
											className="minimal-map-admin__library-card-img"
											src={svgToDataUrl(entry.content)}
											alt={entry.name}
										/>
									</div>
									<span className="minimal-map-admin__library-card-name">{entry.name}</span>
								</button>
							);
						})}
					</div>
				)}

				<div className="minimal-map-admin__collection-dialog-actions">
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						onClick={handleClose}
						disabled={controller.isUploading}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						__next40pxDefaultSize
						variant="primary"
						onClick={() => void handleInstall()}
						isBusy={controller.isUploading}
						disabled={selectedIds.size === 0 || controller.isUploading}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{installLabel}</span>
							{selectedIds.size > 0 ? <Kbd variant="blue">Enter</Kbd> : null}
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

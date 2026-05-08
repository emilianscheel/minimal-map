import { Button, Modal, Notice } from '@wordpress/components';
import { __, _x } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import type { KeyboardEvent } from 'react';
import { Ban, Plus } from 'lucide-react';
import Kbd from '../../components/Kbd';
import { ColorControl } from '../styles/ColorControl';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import { applySvgColors, svgToDataUrl } from '../../lib/markers/svgColors';
import type { MarkersController } from './types';

export default function EditMarkerModal({ controller }: { controller: MarkersController }) {
	// useMemo must come before the early return to satisfy Rules of Hooks
	const previewDataUrl = useMemo(() => {
		if (!controller.colorEditingMarker) {
			return '';
		}
		const updatedSvg = applySvgColors(
			controller.colorEditingMarker.content,
			controller.draftSvgColors
		);
		return svgToDataUrl(updatedSvg);
	}, [controller.colorEditingMarker, controller.draftSvgColors]);

	if (!controller.isColorEditModalOpen || !controller.colorEditingMarker) {
		return null;
	}

	return (
		<Modal
			className="minimal-map-admin__collection-modal minimal-map-admin__edit-colors-modal"
			title={__('Edit marker colors', 'minimal-map')}
			onRequestClose={controller.onCancelEditMarkerColors}
			shouldCloseOnClickOutside={!controller.isSubmitting}
			shouldCloseOnEsc={!controller.isSubmitting}
		>
			<div
				className="minimal-map-admin__collection-dialog minimal-map-admin__edit-colors-dialog"
				onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
					if (controller.isSubmitting || !shouldHandleModalEnter(event)) {
						return;
					}
					event.preventDefault();
					void controller.onConfirmEditMarkerColors();
				}}
			>
				{controller.colorEditSubmitError ? (
					<Notice status="error" isDismissible={false}>
						{controller.colorEditSubmitError}
					</Notice>
				) : null}

				<div className="minimal-map-admin__edit-colors-body">
					<div className="minimal-map-admin__edit-colors-controls">
						{controller.draftSvgColors.length === 0 ? (
							<p className="minimal-map-admin__edit-colors-empty">
								{__('No editable colors found in this SVG.', 'minimal-map')}
							</p>
						) : (
							controller.draftSvgColors.map((entry) => (
								<div key={entry.id} className="minimal-map-admin__edit-colors-entry">
									{entry.isNone ? (
										<div className="minimal-map-admin__edit-colors-none">
											<span className="minimal-map-admin__edit-colors-none-label">
												{entry.label}
											</span>
											<span className="minimal-map-admin__edit-colors-none-badge">
												{_x('None', 'color value', 'minimal-map')}
											</span>
										</div>
									) : (
										<ColorControl
											label={entry.label}
											color={entry.value}
											onChange={(color) =>
												controller.onChangeMarkerColor(entry.id, color)
											}
										/>
									)}
									<button
										type="button"
										className="minimal-map-admin__edit-colors-none-toggle"
										onClick={() => controller.onToggleMarkerColorNone(entry.id)}
										title={
											entry.isNone
												? __('Set a color', 'minimal-map')
												: __('Set to none', 'minimal-map')
										}
									>
										{entry.isNone ? <Plus size={14} /> : <Ban size={14} />}
									</button>
								</div>
							))
						)}
					</div>

					<div className="minimal-map-admin__edit-colors-preview">
						<div className="minimal-map-admin__edit-colors-preview-sticky">
							<img
								className="minimal-map-admin__edit-colors-preview-img"
								src={previewDataUrl}
								alt={__('Marker preview', 'minimal-map')}
							/>
						</div>
					</div>
				</div>

				<div className="minimal-map-admin__collection-dialog-actions">
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						onClick={controller.onCancelEditMarkerColors}
						disabled={controller.isSubmitting}
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						__next40pxDefaultSize
						variant="primary"
						onClick={() => void controller.onConfirmEditMarkerColors()}
						isBusy={controller.isSubmitting}
						disabled={controller.isSubmitting}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Save changes', 'minimal-map')}</span>
							<Kbd variant="blue">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

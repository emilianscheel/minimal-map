import {
	Button,
	Modal,
	Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { ArrowLeft } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import Kbd from '../../components/Kbd';
import MapStep from './MapStep';
import type { LocationsController } from './types';
import LocationModalFields from './LocationModalFields';
import OpeningHoursStep from './OpeningHoursStep';
import SocialMediaStep from './SocialMediaStep';

export default function LocationModal({ controller }: { controller: LocationsController }) {
	if (!controller.isModalOpen) {
		return null;
	}

	return (
		<Modal
			className="minimal-map-admin__location-modal"
			contentLabel={controller.modalTitle}
			focusOnMount="firstInputElement"
			onRequestClose={controller.onCancel}
			shouldCloseOnClickOutside={!controller.isSubmitting}
			shouldCloseOnEsc={!controller.isSubmitting}
			title={controller.modalTitle}
		>
			<div
				className="minimal-map-admin__location-dialog"
				onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
					const target = event.target;
					const isHTMLElement = target instanceof HTMLElement;

					if (
						(controller.step === 'map' && !controller.selectedCoordinates) ||
						controller.isSubmitting ||
						controller.isGeocoding
					) {
						return;
					}

					if (controller.step === 'map') {
						if (
							event.key !== 'Enter' ||
							event.shiftKey ||
							(isHTMLElement &&
								target.closest('[data-minimal-map-dialog-ignore-enter="true"]'))
						) {
							return;
						}

						event.preventDefault();
						void controller.onConfirm();
						return;
					}

					if (!shouldHandleModalEnter(event)) {
						return;
					}

					event.preventDefault();
					void controller.onConfirm();
				}}
			>
				{controller.submitError && (
					<Notice status="error" isDismissible={false}>
						{controller.submitError}
					</Notice>
				)}
				{controller.step === 'map' ? (
					<MapStep controller={controller} />
				) : controller.step === 'opening_hours' ? (
					<OpeningHoursStep
						fieldErrors={controller.fieldErrors}
						form={controller.form}
						onChangeDayValue={controller.onChangeOpeningHoursDayValue}
						onChangeNotes={controller.onChangeOpeningHoursNotes}
					/>
				) : controller.step === 'social_media' ? (
					<SocialMediaStep
						form={controller.form}
						onChange={controller.onChangeFormValue}
					/>
				) : (
					<LocationModalFields
						fieldErrors={controller.fieldErrors}
						form={controller.form}
						onChange={controller.onChangeFormValue}
						step={controller.step}
						tags={controller.tags}
					/>
				)}
				<div className="minimal-map-admin__location-dialog-footer">
					<div className="minimal-map-admin__location-dialog-footer-start">
						{controller.step !== 'details' ? (
							<Button
								__next40pxDefaultSize
								variant="tertiary"
								onClick={controller.onBack}
								disabled={controller.isSubmitting}
								data-minimal-map-dialog-ignore-enter="true"
								icon={<ArrowLeft size={18} strokeWidth={2} />}
								iconPosition="left"
							>
								{__('Back', 'minimal-map')}
							</Button>
						) : null}
					</div>
					<div className="minimal-map-admin__location-dialog-actions">
						<Button
							__next40pxDefaultSize
							variant="tertiary"
							onClick={controller.onCancel}
							disabled={controller.isSubmitting || controller.isGeocoding}
							data-minimal-map-dialog-ignore-enter="true"
						>
							{__('Cancel', 'minimal-map')}
						</Button>
						<Button
							__next40pxDefaultSize
							variant="primary"
							onClick={() => {
								void controller.onConfirm();
							}}
							disabled={
								controller.isSubmitting ||
								controller.isGeocoding ||
								(controller.step === 'map' && !controller.selectedCoordinates)
							}
							isBusy={controller.isSubmitting || controller.isGeocoding}
						>
							<span className="minimal-map-admin__location-dialog-button-content">
								<span>
									{controller.step === 'map'
										? controller.submitLabel
										: __('Next', 'minimal-map')}
								</span>
								<Kbd variant="blue">Enter</Kbd>
							</span>
						</Button>
					</div>
				</div>
			</div>
		</Modal>
	);
}

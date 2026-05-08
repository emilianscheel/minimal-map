import { Button, FormTokenField, Modal, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { KeyboardEvent } from 'react';
import Kbd from '../../components/Kbd';
import { CUSTOM_CSV_MAPPING_FIELDS } from '../../lib/locations/importLocations';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import CustomCsvImportMappingGrid from './CustomCsvImportMappingGrid';
import {
	CSV_OPENING_HOURS_MAPPING_FIELDS,
	CSV_OPENING_HOURS_NOTES_FIELD,
} from './customCsvImport';
import type { LocationsController } from './types';

export default function CustomCsvImportModal({ controller }: { controller: LocationsController }) {
	if (!controller.isCustomCsvImportModalOpen) {
		return null;
	}

	const modalTitle = __('Import custom data', 'minimal-map');
	const allColumnOptions = controller.csvImportColumnOptions;
	const logoOptions = [
		{ label: __('None', 'minimal-map'), value: '' },
		...controller.logos.map((logo) => ({
			label: logo.title || __('Untitled logo', 'minimal-map'),
			value: `${logo.id}`,
		})),
	];
	const markerOptions = [
		{ label: __('None', 'minimal-map'), value: '' },
		...controller.markers.map((marker) => ({
			label: marker.title || __('Untitled marker', 'minimal-map'),
			value: `${marker.id}`,
		})),
	];
	const selectedTagNames = controller.csvImportTagIds
		.map((id) => controller.tags.find((tag) => tag.id === id)?.name)
		.filter((name): name is string => !!name);
	const tagSuggestions = controller.tags.map((tag) => tag.name);
	const baseMappingRows = CUSTOM_CSV_MAPPING_FIELDS.map((field) => ({
		key: field.key,
		label: field.label,
		options: allColumnOptions,
	}));
	const openingHoursRows = [
		...CSV_OPENING_HOURS_MAPPING_FIELDS.map((field) => ({
			key: field.key,
			label: field.label,
			options: controller.csvImportOpeningHoursColumnOptions,
		})),
		{
			key: CSV_OPENING_HOURS_NOTES_FIELD.key,
			label: CSV_OPENING_HOURS_NOTES_FIELD.label,
			options: allColumnOptions,
		},
	];

	return (
		<Modal
			className="minimal-map-admin__custom-csv-import-modal"
			contentLabel={modalTitle}
			focusOnMount="firstInputElement"
			onRequestClose={controller.onCloseCustomCsvImportModal}
			shouldCloseOnClickOutside={!controller.isImporting}
			shouldCloseOnEsc={!controller.isImporting}
			title={modalTitle}
		>
			<div
				className="minimal-map-admin__location-dialog minimal-map-admin__custom-csv-import-dialog"
				onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
					if (controller.isImporting) {
						return;
					}

					const target = event.target;
					const isHTMLElement = target instanceof HTMLElement;

					if (isHTMLElement && target.classList.contains('components-form-token-field__input')) {
						return;
					}

					if (
						(isHTMLElement &&
							target.closest('[data-minimal-map-dialog-ignore-enter="true"]')) ||
						!shouldHandleModalEnter(event)
					) {
						return;
					}

					event.preventDefault();
					if (controller.csvImportStep === 'mapping') {
						controller.onAdvanceCustomCsvImportStep();
						return;
					}

					void controller.onStartCustomCsvImport();
				}}
			>
				{controller.csvImportStep === 'mapping' ? (
					<>
						<CustomCsvImportMappingGrid
							rows={baseMappingRows}
							selectedValues={controller.csvImportMapping}
							onChange={(field, value) =>
								controller.onChangeCsvImportMapping(
									field as keyof typeof controller.csvImportMapping,
									value
								)
							}
							disabled={controller.isImporting}
						/>
						<div className="minimal-map-admin__custom-csv-import-grid">
							<div className="minimal-map-admin__custom-csv-import-row">
								<SelectControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									hideLabelFromVision
									label={__('Logo', 'minimal-map')}
									value="logo"
									options={[{ label: __('Logo', 'minimal-map'), value: 'logo' }]}
									disabled
								/>
								<SelectControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									hideLabelFromVision
									label={__('Logo', 'minimal-map')}
									value={controller.csvImportLogoId}
									options={logoOptions}
									onChange={controller.onSelectCsvImportLogo}
									disabled={controller.isImporting}
								/>
							</div>
							<div className="minimal-map-admin__custom-csv-import-row">
								<SelectControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									hideLabelFromVision
									label={__('Marker', 'minimal-map')}
									value="marker"
									options={[{ label: __('Marker', 'minimal-map'), value: 'marker' }]}
									disabled
								/>
								<SelectControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									hideLabelFromVision
									label={__('Marker', 'minimal-map')}
									value={controller.csvImportMarkerId}
									options={markerOptions}
									onChange={controller.onSelectCsvImportMarker}
									disabled={controller.isImporting}
								/>
							</div>
						</div>
						<FormTokenField
							label={__('Tags', 'minimal-map')}
							value={selectedTagNames}
							suggestions={tagSuggestions}
							onChange={(tokenNames) => {
								const nextTagIds = tokenNames
									.map((name) => controller.tags.find((tag) => tag.name === name)?.id)
									.filter((id): id is number => id !== undefined);
								controller.onSelectCsvImportTags(nextTagIds);
							}}
							disabled={controller.isImporting}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<div className="minimal-map-admin__location-dialog-footer">
							<div className="minimal-map-admin__location-dialog-footer-start" />
							<div className="minimal-map-admin__location-dialog-actions">
								<Button
									__next40pxDefaultSize
									variant="tertiary"
									onClick={controller.onCloseCustomCsvImportModal}
									disabled={controller.isImporting}
									data-minimal-map-dialog-ignore-enter="true"
								>
									{__('Cancel', 'minimal-map')}
								</Button>
								<Button
									__next40pxDefaultSize
									variant="primary"
									onClick={controller.onAdvanceCustomCsvImportStep}
									isBusy={controller.isImporting}
									disabled={controller.isImporting}
								>
									<span className="minimal-map-admin__location-dialog-button-content">
										<span>{__('Next', 'minimal-map')}</span>
										<Kbd variant="blue">Enter</Kbd>
									</span>
								</Button>
							</div>
						</div>
					</>
				) : (
					<>
						<CustomCsvImportMappingGrid
							rows={openingHoursRows}
							selectedValues={controller.csvImportOpeningHoursMapping}
							onChange={(field, value) =>
								controller.onChangeCsvImportOpeningHoursMapping(
									field as keyof typeof controller.csvImportOpeningHoursMapping,
									value
								)
							}
							disabled={controller.isImporting}
						/>
						<div className="minimal-map-admin__location-dialog-footer">
							<div className="minimal-map-admin__location-dialog-footer-start">
								<Button
									__next40pxDefaultSize
									variant="tertiary"
									onClick={controller.onBackCustomCsvImportStep}
									disabled={controller.isImporting}
									data-minimal-map-dialog-ignore-enter="true"
								>
									{__('Back', 'minimal-map')}
								</Button>
							</div>
							<div className="minimal-map-admin__location-dialog-actions">
								<Button
									__next40pxDefaultSize
									variant="tertiary"
									onClick={controller.onCloseCustomCsvImportModal}
									disabled={controller.isImporting}
									data-minimal-map-dialog-ignore-enter="true"
								>
									{__('Cancel', 'minimal-map')}
								</Button>
								<Button
									__next40pxDefaultSize
									variant="primary"
									onClick={() => {
										void controller.onStartCustomCsvImport();
									}}
									isBusy={controller.isImporting}
									disabled={controller.isImporting}
								>
									<span className="minimal-map-admin__location-dialog-button-content">
										<span>{__('Next', 'minimal-map')}</span>
										<Kbd variant="blue">Enter</Kbd>
									</span>
								</Button>
							</div>
						</div>
					</>
				)}
			</div>
		</Modal>
	);
}

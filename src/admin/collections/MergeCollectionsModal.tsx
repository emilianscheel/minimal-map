import {
	Button,
	CheckboxControl,
	Modal,
	Notice,
	TextControl,
} from '@wordpress/components';
import { DataViewsPicker } from '@wordpress/dataviews/wp';
import type { Field, View, ViewPickerTable } from '@wordpress/dataviews';
import { __ } from '@wordpress/i18n';
import { ArrowLeft } from 'lucide-react';
import { useMemo, type KeyboardEvent } from 'react';
import type { CollectionRecord } from '../../types';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import Kbd from '../../components/Kbd';
import type { CollectionsController } from './types';

function useCollectionFields(): Field<CollectionRecord>[] {
	return useMemo<Field<CollectionRecord>[]>(
		() => [
			{
				id: 'title',
				label: __('Title', 'minimal-map'),
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
			},
			{
				id: 'location_count',
				label: __('Locations', 'minimal-map'),
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
				render: ({ item }) => item.location_ids.length,
			},
		],
		[]
	);
}

export default function MergeCollectionsModal({ controller }: { controller: CollectionsController }) {
	const fields = useCollectionFields();

	if (!controller.isMergeModalOpen) {
		return null;
	}

	const modalTitle = __('Merge collections', 'minimal-map');

	return (
		<Modal
			className="minimal-map-admin__collection-modal"
			contentLabel={modalTitle}
			focusOnMount="firstInputElement"
			onRequestClose={controller.onCloseMergeModal}
			shouldCloseOnClickOutside={!controller.isMerging}
			shouldCloseOnEsc={!controller.isMerging}
			title={modalTitle}
		>
			<div
				className="minimal-map-admin__collection-dialog"
				onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
					const target = event.target;
					const isHTMLElement = target instanceof HTMLElement;

					if (
						controller.isMerging ||
						(isHTMLElement &&
							target.closest('[data-minimal-map-dialog-ignore-enter="true"]')) ||
						!shouldHandleModalEnter(event)
					) {
						return;
					}

					event.preventDefault();
					void controller.onMergeConfirm();
				}}
			>
				{controller.submitError && (
					<Notice status="error" isDismissible={false}>
						{controller.submitError}
					</Notice>
				)}

				{controller.mergeStep === 'selection' ? (
					<div className="minimal-map-admin__assign-to-collection-dialog">
						<p className="minimal-map-admin__assign-to-collection-copy">
							{__('Select at least two collections to merge into a new one.', 'minimal-map')}
						</p>
						<DataViewsPicker
							data={controller.mergeCollections}
							defaultLayouts={{ pickerTable: {} }}
							fields={fields}
							getItemId={(item: CollectionRecord) => `${item.id}`}
							itemListLabel={__('Collections', 'minimal-map')}
							paginationInfo={{
								totalItems: controller.mergeCollectionsTotalItems,
								totalPages: 1,
							}}
							search={false}
							selection={controller.selectedMergeCollectionIds.map((id) => `${id}`)}
							view={controller.mergeSelectionView}
							onChangeSelection={controller.onChangeMergeSelection}
							onChangeView={(nextView: View) => controller.onChangeMergeView(nextView as ViewPickerTable)}
						>
							<DataViewsPicker.Layout className="minimal-map-admin__collections-assignment-table" />
							<DataViewsPicker.BulkActionToolbar />
						</DataViewsPicker>
					</div>
				) : (
					<div className="minimal-map-admin__location-dialog-fields">
						<TextControl
							__nextHasNoMarginBottom
							label={__('New collection title', 'minimal-map')}
							value={controller.mergeTitle}
							onChange={controller.onChangeMergeTitle}
							placeholder={__('Enter a name for the merged collection...', 'minimal-map')}
						/>
						<CheckboxControl
							__nextHasNoMarginBottom
							label={__('Delete original collections after merge', 'minimal-map')}
							checked={controller.shouldDeleteAfterMerge}
							onChange={controller.onToggleDeleteAfterMerge}
						/>
					</div>
				)}

				<div className="minimal-map-admin__location-dialog-footer">
					<div className="minimal-map-admin__location-dialog-footer-start">
						{controller.mergeStep === 'details' && (
							<Button
								__next40pxDefaultSize
								variant="tertiary"
								onClick={controller.onMergeBack}
								disabled={controller.isMerging}
								data-minimal-map-dialog-ignore-enter="true"
								icon={<ArrowLeft size={18} strokeWidth={2} />}
								iconPosition="left"
							>
								{__('Back', 'minimal-map')}
							</Button>
						)}
					</div>
					<div className="minimal-map-admin__location-dialog-actions">
						<Button
							__next40pxDefaultSize
							variant="tertiary"
							onClick={controller.onCloseMergeModal}
							disabled={controller.isMerging}
							data-minimal-map-dialog-ignore-enter="true"
						>
							{__('Cancel', 'minimal-map')}
						</Button>
						<Button
							__next40pxDefaultSize
							variant="primary"
							onClick={() => {
								void controller.onMergeConfirm();
							}}
							disabled={
								controller.isMerging ||
								controller.selectedMergeCollectionIds.length < 2
							}
							isBusy={controller.isMerging}
						>
							<span className="minimal-map-admin__location-dialog-button-content">
								<span>
									{controller.mergeStep === 'selection'
										? __('Next', 'minimal-map')
										: __('Finish', 'minimal-map')}
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

import { Button, Modal, SearchControl } from '@wordpress/components';
import { DataViewsPicker } from '@wordpress/dataviews/wp';
import type { Field, View, ViewPickerTable } from '@wordpress/dataviews';
import type { KeyboardEvent } from 'react';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { AdminLocationLookupItem } from '../../types';
import { formatLocationAddressLines } from '../../lib/locations/formatLocationAddressLines';
import { shouldHandleModalEnter } from '../../lib/locations/shouldHandleModalEnter';
import Kbd from '../../components/Kbd';
import type { CollectionsController } from './types';

function useLocationFields(): Field<AdminLocationLookupItem>[] {
	return useMemo<Field<AdminLocationLookupItem>[]>(
		() => [
			{
				id: 'title',
				label: __('Title', 'minimal-map'),
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
			},
			{
				id: 'address',
				label: __('Address', 'minimal-map'),
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
				render: ({ item }) => formatLocationAddressLines(item).join(', '),
			},
		],
		[]
	);
}

export default function CollectionAssignmentModal({ controller }: { controller: CollectionsController }) {
	const fields = useLocationFields();

	if (!controller.isAssignmentModalOpen || !controller.selectedAssignmentCollection) {
		return null;
	}

	return (
		<Modal
			className="minimal-map-admin__collection-assignment-modal"
			contentLabel={__('Assign locations', 'minimal-map')}
			focusOnMount="firstInputElement"
			onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
				const target = event.target;
				const isHTMLElement = target instanceof HTMLElement;

				if (
					controller.isAssignmentSaving ||
					(isHTMLElement &&
						target.closest('[data-minimal-map-dialog-ignore-enter="true"]')) ||
					!shouldHandleModalEnter(event)
				) {
					return;
				}

				event.preventDefault();
				void controller.onSaveAssignments();
			}}
			onRequestClose={controller.onCloseAssignmentModal}
			shouldCloseOnClickOutside={!controller.isAssignmentSaving}
			shouldCloseOnEsc={!controller.isAssignmentSaving}
			title={controller.selectedAssignmentCollection.title}
		>
			<div className="minimal-map-admin__collection-assignment-dialog">
				<SearchControl
					__nextHasNoMarginBottom
					label={__('Search locations', 'minimal-map')}
					value={controller.assignmentSearch}
					onChange={controller.onChangeAssignmentSearch}
				/>
				<DataViewsPicker
					data={controller.assignmentLocations}
					defaultLayouts={{ pickerTable: {} }}
					fields={fields}
					getItemId={(item: AdminLocationLookupItem) => `${item.id}`}
					itemListLabel={__('Locations', 'minimal-map')}
					paginationInfo={{
						totalItems: controller.assignmentTotalItems,
						totalPages: Math.max(
							1,
							Math.ceil(
								controller.assignmentTotalItems /
									(controller.assignmentLocationsView.perPage ?? 5)
							)
						),
					}}
					search={false}
					selection={controller.selectedLocationIds.map((locationId) => `${locationId}`)}
					view={controller.assignmentLocationsView}
					onChangeSelection={controller.onChangeAssignmentLocationsSelection}
					onChangeView={(nextView: View) =>
						controller.onChangeAssignmentLocationsView(nextView as ViewPickerTable)
					}
				>
					<DataViewsPicker.Layout className="minimal-map-admin__collections-assignment-table" />
					<DataViewsPicker.BulkActionToolbar />
				</DataViewsPicker>
				<div className="minimal-map-admin__collection-assignment-actions">
					<Button
						__next40pxDefaultSize
						variant="tertiary"
						onClick={controller.onCloseAssignmentModal}
						disabled={controller.isAssignmentSaving}
						data-minimal-map-dialog-ignore-enter="true"
					>
						{__('Cancel', 'minimal-map')}
					</Button>
					<Button
						__next40pxDefaultSize
						variant="primary"
						onClick={() => void controller.onSaveAssignments()}
						isBusy={controller.isAssignmentSaving}
						disabled={controller.isAssignmentSaving}
					>
						<span className="minimal-map-admin__location-dialog-button-content">
							<span>{__('Save locations', 'minimal-map')}</span>
							<Kbd variant="blue">Enter</Kbd>
						</span>
					</Button>
				</div>
			</div>
		</Modal>
	);
}

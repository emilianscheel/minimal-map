import { DropZone, Notice, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import AssignLogoModal from './AssignLogoModal';
import AssignMarkerModal from './AssignMarkerModal';
import AssignOpeningHoursModal from './AssignOpeningHoursModal';
import AssignToCollectionModal from './AssignToCollectionModal';
import AssignTagsModal from './AssignTagsModal';
import CustomCsvImportModal from './CustomCsvImportModal';
import DeleteAllLocationsModal from './DeleteAllLocationsModal';
import DeleteLogoConfirmationModal from './DeleteLogoConfirmationModal';
import LocationImportProgressModal from './LocationImportProgressModal';
import LocationModal from './LocationModal';
import LocationsEmptyState from './LocationsEmptyState';
import LocationsTable from './LocationsTable';
import MarkerColorModal from './MarkerColorModal';
import RemoveMarkerConfirmationModal from './RemoveMarkerConfirmationModal';
import RemoveCollectionAssignmentModal from './RemoveCollectionAssignmentModal';
import RemoveTagsConfirmationModal from './RemoveTagsConfirmationModal';
import ShowLocationConfirmationModal from './ShowLocationConfirmationModal';
import type { LocationsController } from './types';

export { useLocationsController } from './controller';
export type { LocationsController } from './types';

export default function LocationsView({ controller }: { controller: LocationsController }) {
	return (
		<div className="minimal-map-admin__locations-view">
			{controller.actionNotice && (
				<Notice
					className="minimal-map-admin__locations-notice"
					status={controller.actionNotice.status}
					onRemove={controller.dismissActionNotice}
				>
					{controller.actionNotice.message}
				</Notice>
			)}
			{controller.loadError && (
				<Notice className="minimal-map-admin__locations-notice" status="error" isDismissible={false}>
					{controller.loadError}
				</Notice>
			)}
			<div className="minimal-map-admin__locations-content">
				<DropZone
					onFilesDrop={(files) => {
						const file = files[0];
						if (file) {
							void controller.onImportLocations(file);
						}
					}}
					label={__('Drop a CSV, Excel, or JSON file here to import locations', 'minimal-map')}
				/>
				{controller.isLoading ? (
					<div className="minimal-map-admin__locations-state minimal-map-admin__locations-state--loading">
						<Spinner />
					</div>
				) : controller.totalItems === 0 ? (
					<LocationsEmptyState controller={controller} />
				) : (
					<LocationsTable controller={controller} />
				)}
			</div>
			<LocationModal controller={controller} />
			<MarkerColorModal controller={controller} />
			<AssignToCollectionModal controller={controller} />
			<AssignLogoModal controller={controller} />
			<AssignMarkerModal controller={controller} />
			<AssignTagsModal controller={controller} />
			<AssignOpeningHoursModal controller={controller} />
			<CustomCsvImportModal controller={controller} />
			<LocationImportProgressModal controller={controller} />
			<DeleteAllLocationsModal controller={controller} />
			<DeleteLogoConfirmationModal controller={controller} />
			<RemoveMarkerConfirmationModal controller={controller} />
			<RemoveTagsConfirmationModal controller={controller} />
			<ShowLocationConfirmationModal controller={controller} />
			<RemoveCollectionAssignmentModal controller={controller} />
		</div>
	);
}

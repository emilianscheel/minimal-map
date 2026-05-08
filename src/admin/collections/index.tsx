import { DropZone, Notice, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import CollectionAssignmentModal from './CollectionAssignmentModal';
import DeleteAllCollectionsModal from './DeleteAllCollectionsModal';
import MergeCollectionsModal from './MergeCollectionsModal';
import CollectionModal from './CollectionModal';
import CollectionsEmptyState from './CollectionsEmptyState';
import CollectionsGrid from './CollectionsGrid';
import type { CollectionsController } from './types';

export { useCollectionsController } from './controller';
export type { CollectionsController } from './types';

export default function CollectionsView({ controller }: { controller: CollectionsController }) {
	return (
		<div className="minimal-map-admin__collections-view">
			{controller.actionNotice ? (
				<Notice
					className="minimal-map-admin__collections-notice"
					status={controller.actionNotice.status}
					onRemove={controller.dismissActionNotice}
				>
					{controller.actionNotice.message}
				</Notice>
			) : null}
			{controller.loadError ? (
				<Notice className="minimal-map-admin__collections-notice" status="error" isDismissible={false}>
					{controller.loadError}
				</Notice>
			) : null}
			<div className="minimal-map-admin__collections-content">
				<DropZone
					onFilesDrop={(files) => {
						const file = files[0];
						if (file) {
							void controller.onImportLocations(file);
						}
					}}
					label={__('Drop CSV file here to import locations', 'minimal-map')}
				/>
				{controller.isLoading ? (
					<div className="minimal-map-admin__collections-state minimal-map-admin__collections-state--loading">
						<Spinner />
					</div>
				) : controller.totalItems === 0 ? (
					<CollectionsEmptyState controller={controller} />
				) : (
					<CollectionsGrid controller={controller} />
				)}
			</div>
			<CollectionModal controller={controller} />
			<CollectionAssignmentModal controller={controller} />
			<DeleteAllCollectionsModal controller={controller} />
			<MergeCollectionsModal controller={controller} />
		</div>
	);
}

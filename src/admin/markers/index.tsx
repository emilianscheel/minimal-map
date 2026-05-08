import { DropZone, Notice, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import DeleteAllMarkersModal from './DeleteAllMarkersModal';
import EditMarkerModal from './EditMarkerModal';
import MarkerLibraryModal from './MarkerLibraryModal';
import RenameMarkerModal from './RenameMarkerModal';
import MarkersEmptyState from './MarkersEmptyState';
import MarkersGrid from './MarkersGrid';
import type { MarkersController } from './types';

export { useMarkersController } from './controller';
export type { MarkersController } from './types';

export default function MarkersView({ controller }: { controller: MarkersController }) {
	return (
		<div className="minimal-map-admin__markers-view">
			{controller.actionNotice ? (
				<Notice
					className="minimal-map-admin__locations-notice"
					status={controller.actionNotice.status}
					onRemove={controller.dismissActionNotice}
				>
					{controller.actionNotice.message}
				</Notice>
			) : null}
			{controller.loadError ? (
				<Notice className="minimal-map-admin__locations-notice" status="error" isDismissible={false}>
					{controller.loadError}
				</Notice>
			) : null}
			
			<div className="minimal-map-admin__markers-content">
				<DropZone
					onFilesDrop={(files) => {
						void controller.onUploadMarkers(files as unknown as FileList);
					}}
					label={__('Drop SVG files here to upload', 'minimal-map')}
				/>
				{controller.isLoading ? (
					<div className="minimal-map-admin__locations-state minimal-map-admin__locations-state--loading">
						<Spinner />
					</div>
				) : controller.totalItems === 0 ? (
					<MarkersEmptyState controller={controller} />
				) : (
					<MarkersGrid controller={controller} />
				)}
			</div>

			<DeleteAllMarkersModal controller={controller} />
			<RenameMarkerModal controller={controller} />
			<EditMarkerModal controller={controller} />
			<MarkerLibraryModal controller={controller} />
		</div>
	);
}

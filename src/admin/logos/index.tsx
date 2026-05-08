import { DropZone, Notice, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import DeleteAllLogosModal from './DeleteAllLogosModal';
import DeleteLogoModal from './DeleteLogoModal';
import EditLogoModal from './EditLogoModal';
import LogosEmptyState from './LogosEmptyState';
import LogosGrid from './LogosGrid';
import type { LogosController } from './types';

export { useLogosController } from './controller';
export type { LogosController } from './types';

export default function LogosView({ controller }: { controller: LogosController }) {
	return (
		<div className="minimal-map-admin__markers-view minimal-map-admin__logos-view">
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

			<div className="minimal-map-admin__markers-content minimal-map-admin__logos-content">
				<DropZone
					onFilesDrop={(files) => {
						void controller.onUploadLogos(files as unknown as FileList);
					}}
					label={__('Drop SVG or PNG files here to upload', 'minimal-map')}
				/>
				{controller.isLoading ? (
					<div className="minimal-map-admin__locations-state minimal-map-admin__locations-state--loading">
						<Spinner />
					</div>
				) : controller.totalItems === 0 ? (
					<LogosEmptyState controller={controller} />
				) : (
					<LogosGrid controller={controller} />
				)}
			</div>

			<DeleteAllLogosModal controller={controller} />
			<DeleteLogoModal controller={controller} />
			<EditLogoModal controller={controller} />
		</div>
	);
}

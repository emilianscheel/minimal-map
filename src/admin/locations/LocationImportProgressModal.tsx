import { Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { LocationsController } from './types';

export default function LocationImportProgressModal({
	controller,
}: {
	controller: LocationsController;
}) {
	if (!controller.isLocationImportProgressModalOpen) {
		return null;
	}

	const modalTitle = __('Import locations', 'minimal-map');

	return (
		<Modal
			className="minimal-map-admin__custom-csv-import-modal"
			contentLabel={modalTitle}
			focusOnMount={false}
			onRequestClose={controller.onCloseLocationImportProgressModal}
			shouldCloseOnClickOutside={!controller.isImporting}
			shouldCloseOnEsc={!controller.isImporting}
			title={modalTitle}
		>
			<div className="minimal-map-admin__custom-csv-import-progress">
				<progress
					className="minimal-map-admin__custom-csv-import-progress-bar"
					max={Math.max(controller.csvImportProgressTotal, 1)}
					value={
						controller.csvImportProgressTotal === 0
							? 0
							: controller.csvImportProgressCompleted
					}
				/>
			</div>
		</Modal>
	);
}

import { __ } from '@wordpress/i18n';
import { FileUp, Image } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import type { LogosController } from './types';

export default function LogosEmptyState({ controller }: { controller: LogosController }) {
	return (
		<EmptyState
			icon={<Image />}
			title={__('No logos found', 'minimal-map')}
			description={__(
				'Upload SVG or PNG logos to reuse the same brand asset across multiple locations. Drag and drop files here or use the upload button.',
				'minimal-map'
			)}
			action={{
				label: __('Upload', 'minimal-map'),
				onClick: () => {
					const input = document.createElement('input');
					input.type = 'file';
					input.accept = '.svg,.png,image/svg+xml,image/png';
					input.multiple = true;
					input.onchange = (event) => {
						const files = (event.target as HTMLInputElement).files;
						if (files) {
							void controller.onUploadLogos(files);
						}
					};
					input.click();
				},
				disabled: controller.isUploading,
				icon: <FileUp />,
			}}
		/>
	);
}

import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Upload } from 'lucide-react';

interface UploadMarkerButtonProps {
	onUpload: (files: FileList) => void;
	isUploading?: boolean;
}

export function UploadMarkerButton({ onUpload, isUploading }: UploadMarkerButtonProps) {
	return (
		<Button
			icon={<Upload size={18} />}
			label={__('Upload Markers', 'minimal-map')}
			onClick={() => {
				const input = document.createElement('input');
				input.type = 'file';
				input.accept = 'image/svg+xml';
				input.multiple = true;
				input.onchange = (e) => {
					const files = (e.target as HTMLInputElement).files;
					if (files && files.length > 0) {
						onUpload(files);
					}
				};
				input.click();
			}}
			variant="tertiary"
			__next40pxDefaultSize
			isBusy={isUploading}
			disabled={isUploading}
		/>
	);
}

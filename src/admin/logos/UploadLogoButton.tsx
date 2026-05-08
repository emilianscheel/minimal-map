import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Upload } from 'lucide-react';

interface UploadLogoButtonProps {
	onUpload: (files: FileList) => void;
	isUploading?: boolean;
}

export function UploadLogoButton({ onUpload, isUploading }: UploadLogoButtonProps) {
	return (
		<Button
			icon={<Upload size={18} />}
			label={__('Upload Logos', 'minimal-map')}
			onClick={() => {
				const input = document.createElement('input');
				input.type = 'file';
				input.accept = 'image/svg+xml,image/png,.svg,.png';
				input.multiple = true;
				input.onchange = (event) => {
					const files = (event.target as HTMLInputElement).files;
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

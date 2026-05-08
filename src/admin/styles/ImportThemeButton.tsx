import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Upload } from 'lucide-react';
interface ImportThemeButtonProps {
	onImport: (files: FileList) => void;
}

export function ImportThemeButton({ onImport }: ImportThemeButtonProps) {
	return (
		<Button
			icon={<Upload size={18} />}
			label={__('Upload Theme File', 'minimal-map')}
			onClick={() => {
				const input = document.createElement('input');
				input.type = 'file';
				input.accept = '.json';
				input.onchange = (e) => {
					const files = (e.target as HTMLInputElement).files;
					if (files) {
						onImport(files);
					}
				};
				input.click();
			}}
			variant="tertiary"
			__next40pxDefaultSize
		/>
	);
}

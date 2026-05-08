import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Download } from 'lucide-react';

interface ExportThemeButtonProps {
	onExport: () => void;
}

export function ExportThemeButton({ onExport }: ExportThemeButtonProps) {
	return (
		<Button
			icon={<Download size={18} />}
			label={__('Download Theme Config', 'minimal-map')}
			onClick={onExport}
			variant="tertiary"
			__next40pxDefaultSize
		/>
	);
}

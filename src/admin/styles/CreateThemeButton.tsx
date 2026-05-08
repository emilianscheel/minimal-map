import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Plus } from 'lucide-react';

interface CreateThemeButtonProps {
	onClick: () => void;
}

export function CreateThemeButton({ onClick }: CreateThemeButtonProps) {
	return (
		<Button
			icon={<Plus size={18} />}
			label={__('Create New Theme', 'minimal-map')}
			onClick={onClick}
			variant="tertiary"
			__next40pxDefaultSize
		/>
	);
}

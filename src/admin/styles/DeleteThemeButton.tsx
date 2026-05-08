import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Trash2 } from 'lucide-react';

interface DeleteThemeButtonProps {
	slug: string;
	onClick: () => void;
}

export function DeleteThemeButton({ slug, onClick }: DeleteThemeButtonProps) {
	return (
		<Button
			icon={<Trash2 size={18} />}
			label={__('Delete Current Theme', 'minimal-map')}
			onClick={onClick}
			disabled={slug === 'default'}
			variant="tertiary"
			__next40pxDefaultSize
		/>
	);
}

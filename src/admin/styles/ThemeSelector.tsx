import { __ } from '@wordpress/i18n';
import { StyleThemeRecord } from '../../types';
import OptionDropdown from '../components/OptionDropdown';

interface ThemeSelectorProps {
	activeTheme: StyleThemeRecord | null;
	themes: StyleThemeRecord[];
	onSwitch: (slug: string) => void;
}

export function ThemeSelector({ activeTheme, themes, onSwitch }: ThemeSelectorProps) {
	return (
		<OptionDropdown
			activeValue={activeTheme?.slug ?? null}
			emptyLabel={__('Select theme', 'minimal-map')}
			groupLabel={__('Switch Theme', 'minimal-map')}
			labelClassName="minimal-map-admin__option-dropdown-label"
			onSelect={(value) => onSwitch(value)}
			options={themes.map((theme) => ({
				value: theme.slug,
				label: theme.label,
			}))}
			toggleClassName="minimal-map-admin__option-dropdown-toggle"
		/>
	);
}

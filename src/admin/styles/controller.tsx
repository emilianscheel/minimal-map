import { Button } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { KeyboardShortcut, getShortcutAriaKeys } from '../../components/Kbd';
import { useSingleKeyShortcut } from '../../lib/keyboard/useSingleKeyShortcut';
import type {
	StylesAdminConfig,
	StyleThemeRecord,
	StyleThemeColors,
	StylePaletteEntry,
	StylePaletteTemplateVariant,
} from '../../types';
import type { StylesController } from './types';
import { ThemeSelector } from './ThemeSelector';
import { CreateThemeButton } from './CreateThemeButton';
import { DeleteThemeButton } from './DeleteThemeButton';
import { ExportThemeButton } from './ExportThemeButton';
import { ImportThemeButton } from './ImportThemeButton';
import { ApplyPaletteTemplateDropdown } from './ApplyPaletteTemplateDropdown';
import { parseThemeImport } from '../../lib/styles/importStyleTheme';
import { DEFAULT_POSITRON_THEME_COLORS } from '../../lib/styles/defaultThemeColors';
import { SLOT_LABELS } from './constants';
import { triggerFileDownload } from '../../lib/download';
import { deriveThemeFromPalette } from '../../lib/styles/deriveThemeFromPalette';

interface StylesControllerDependencies {
	apiFetch: typeof apiFetch;
	deriveThemeFromPalette: (
		palette: StylePaletteEntry[],
		defaultColors?: StyleThemeColors,
		options?: {
			accentVariant?: StylePaletteTemplateVariant;
		}
	) => StyleThemeColors;
}

const DEFAULT_CONTROLLER_DEPENDENCIES: StylesControllerDependencies = {
	apiFetch,
	deriveThemeFromPalette,
};

export function useStylesController(
	config: StylesAdminConfig,
	active = false,
	dependencies: StylesControllerDependencies = DEFAULT_CONTROLLER_DEPENDENCIES
): StylesController {
	const [ themes, setThemes ] = useState<StyleThemeRecord[]>([]);
	const [ activeThemeSlug, setActiveThemeSlug ] = useState<string>('default');
	const [ isLoading, setIsLoading ] = useState(true);
	const [ isSaving, setIsSaving ] = useState(false);
	const [ isApplyingPaletteTemplate, setIsApplyingPaletteTemplate ] = useState(false);
	const [ draftColors, setDraftColors ] = useState<StyleThemeColors | null>(null);
	const [ actionNotice, setActionNotice ] = useState<StylesController['actionNotice']>(null);

	// Modal states
	const [ isCreateModalOpen, setIsCreateModalOpen ] = useState(false);
	const [ isDeleteModalOpen, setIsDeleteModalOpen ] = useState(false);

	const activeTheme = useMemo(() => {
		return themes.find((t) => t.slug === activeThemeSlug) || themes[0] || null;
	}, [ themes, activeThemeSlug ]);
	const paletteTemplates = config.paletteTemplates ?? [];

	const hasChanges = useMemo(
		() => Boolean(
			activeTheme &&
			draftColors &&
			JSON.stringify(activeTheme.colors) !== JSON.stringify(draftColors)
		),
		[ activeTheme, draftColors ]
	);

	const fetchThemes = useCallback(async () => {
		setIsLoading(true);
		try {
			const data = await dependencies.apiFetch<StyleThemeRecord[]>({
				path: config.restPath,
			});
			setThemes(data);
			if (data.length > 0) {
				const nextTheme = data.find((t) => t.slug === activeThemeSlug) || data[0];
				setActiveThemeSlug(nextTheme.slug);
				setDraftColors(nextTheme.colors);
			}
		} catch (error) {
			console.error('Failed to fetch themes', error);
		} finally {
			setIsLoading(false);
		}
	}, [ config.restPath, activeThemeSlug, dependencies ]);

	useEffect(() => {
		if (active) {
			fetchThemes();
		}
	}, [ active ]);

	const switchTheme = useCallback((slug: string) => {
		const theme = themes.find((t) => t.slug === slug);
		if (theme) {
			setActiveThemeSlug(slug);
			setDraftColors(theme.colors);
		}
	}, [ themes ]);

	const setDraftColor = useCallback((slot: string, color: string) => {
		setDraftColors((prev) => {
			if (!prev) return null;
			return { ...prev, [ slot ]: color };
		});
	}, []);

	const saveTheme = useCallback(async () => {
		if (!activeTheme || !draftColors) return;

		setIsSaving(true);
		try {
			const updatedTheme = await dependencies.apiFetch<StyleThemeRecord>({
				path: `${ config.restPath }/${ activeTheme.slug }`,
				method: 'PUT',
				data: { colors: draftColors },
			});
			setThemes((prev) =>
				prev.map((theme) =>
					theme.slug === updatedTheme.slug ? updatedTheme : theme
				)
			);
		} catch (error) {
			console.error('Failed to save theme', error);
		} finally {
			setIsSaving(false);
		}
	}, [ activeTheme, config.restPath, dependencies, draftColors ]);

	const createTheme = useCallback(async (label: string) => {
		setIsLoading(true);
		try {
			setActionNotice(null);
			const newTheme = await dependencies.apiFetch<StyleThemeRecord>({
				path: config.restPath,
				method: 'POST',
				data: { label },
			});
			setThemes((prev) => [ ...prev, newTheme ]);
			setActiveThemeSlug(newTheme.slug);
			setDraftColors(newTheme.colors);
			setIsCreateModalOpen(false);
		} catch (error) {
			console.error('Failed to create theme', error);
		} finally {
			setIsLoading(false);
		}
	}, [ config.restPath, dependencies ]);

	const deleteTheme = useCallback(async (slug: string) => {
		if (slug === 'default') return;

		setIsLoading(true);
		try {
			setActionNotice(null);
			await apiFetch({
				path: `${ config.restPath }/${ slug }`,
				method: 'DELETE',
			});
			setThemes((prev) => prev.filter((t) => t.slug !== slug));
			setActiveThemeSlug('default');
			const defaultTheme = themes.find((t) => t.slug === 'default');
			if (defaultTheme) {
				setDraftColors(defaultTheme.colors);
			}
			setIsDeleteModalOpen(false);
		} catch (error) {
			console.error('Failed to delete theme', error);
		} finally {
			setIsLoading(false);
		}
	}, [ config.restPath, themes ]);

	const applyPaletteTemplate = useCallback(async (templateId: string) => {
		const template = paletteTemplates.find((item) => item.id === templateId);
		if (!template) {
			return;
		}

		setIsApplyingPaletteTemplate(true);
		try {
			setActionNotice(null);
			const label = getTemplateThemeLabel(themes, template.label);
			const newTheme = await dependencies.apiFetch<StyleThemeRecord>({
				path: config.restPath,
				method: 'POST',
				data: { label },
			});
			const derivedColors = dependencies.deriveThemeFromPalette(
				template.colors,
				DEFAULT_POSITRON_THEME_COLORS,
				{
					accentVariant: template.deriveVariant,
				}
			);
			const updatedTheme = await dependencies.apiFetch<StyleThemeRecord>({
				path: `${ config.restPath }/${ newTheme.slug }`,
				method: 'PUT',
				data: { colors: derivedColors },
			});

			setThemes((prev) => [ ...prev, updatedTheme ]);
			setActiveThemeSlug(updatedTheme.slug);
			setDraftColors(updatedTheme.colors);
			setActionNotice({
				status: 'success',
				message: sprintf(
					__('Created a new theme from %s.', 'minimal-map'),
					template.label
				),
			});
		} catch (error) {
			console.error('Failed to apply palette template', error);
			setActionNotice({
				status: 'error',
				message: sprintf(
					__('Failed to create a theme from %s.', 'minimal-map'),
					template.label
				),
			});
		} finally {
			setIsApplyingPaletteTemplate(false);
		}
	}, [ config.restPath, dependencies, paletteTemplates, themes ]);

	const exportTheme = useCallback(() => {
		if (!activeTheme || !draftColors) return;

		const configToExport = {
			...activeTheme,
			colors: draftColors,
		};

		const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(configToExport, null, 2));
		triggerFileDownload(dataStr, `minimal-map-theme-${ activeTheme.slug }.json`);
	}, [ activeTheme, draftColors ]);

	const importTheme = useCallback(async (themeImport: { label: string; colors: StyleThemeColors; warningSlots: (keyof StyleThemeColors)[] }) => {
		setIsLoading(true);
		try {
			setActionNotice(null);
			const newTheme = await apiFetch<StyleThemeRecord>({
				path: config.restPath,
				method: 'POST',
				data: { label: themeImport.label },
			});

			const updatedTheme = await apiFetch<StyleThemeRecord>({
				path: `${ config.restPath }/${ newTheme.slug }`,
				method: 'PUT',
				data: { colors: themeImport.colors },
			});

			setThemes((prev) => [ ...prev, updatedTheme ]);
			setActiveThemeSlug(updatedTheme.slug);
			setDraftColors(updatedTheme.colors);
			if (themeImport.warningSlots.length > 0) {
				const warningLabels = themeImport.warningSlots.map((slot) => SLOT_LABELS[ slot ] || slot).join(', ');
				setActionNotice({
					status: 'warning',
					message: sprintf(
						__('Imported theme with fallback default colors for: %s', 'minimal-map'),
						warningLabels
					),
				});
			}
		} catch (error) {
			console.error('Failed to import theme', error);
			setActionNotice({
				status: 'error',
				message: __('Failed to import theme.', 'minimal-map'),
			});
		} finally {
			setIsLoading(false);
		}
	}, [ config.restPath ]);

	const onImportFiles = useCallback(async (files: FileList) => {
		const file = files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (readerEvent) => {
			try {
				const content = JSON.parse(readerEvent.target?.result as string);
				const defaultColors = themes.find((theme) => theme.slug === 'default')?.colors ?? DEFAULT_POSITRON_THEME_COLORS;
				const themeImport = parseThemeImport(content, {
					defaultColors,
					fileName: file.name,
				});
				await importTheme(themeImport);
			} catch (err) {
				setActionNotice({
					status: 'error',
					message: err instanceof Error ? err.message : __('Invalid JSON file.', 'minimal-map'),
				});
			}
		};
		reader.onerror = () => {
			setActionNotice({
				status: 'error',
				message: __('Failed to read the selected file.', 'minimal-map'),
			});
		};
		reader.readAsText(file);
	}, [ importTheme, themes ]);

	const openCreateModal = () => setIsCreateModalOpen(true);
	const closeCreateModal = () => setIsCreateModalOpen(false);
	const openDeleteModal = () => setIsDeleteModalOpen(true);
	const closeDeleteModal = () => setIsDeleteModalOpen(false);

	useSingleKeyShortcut({
		active,
		blocked: isCreateModalOpen || isDeleteModalOpen || isLoading || isSaving || !hasChanges,
		key: 's',
		onTrigger: saveTheme,
	});

	const headerAction = useMemo(() => {
		if (!active) return null;

		return (
			<div className="minimal-map-styles__header-actions">
				<div className="minimal-map-styles__theme-controls">
					<CreateThemeButton onClick={openCreateModal} />
					<DeleteThemeButton slug={activeThemeSlug} onClick={openDeleteModal} />
					<ExportThemeButton onExport={exportTheme} />
					<ImportThemeButton onImport={onImportFiles} />
					<ApplyPaletteTemplateDropdown
						templates={paletteTemplates}
						disabled={paletteTemplates.length === 0 || isApplyingPaletteTemplate || isLoading}
						isBusy={isApplyingPaletteTemplate}
						onSelect={(templateId) => {
							void applyPaletteTemplate(templateId);
						}}
					/>
				</div>

				<ThemeSelector
					activeTheme={activeTheme}
					themes={themes}
					onSwitch={switchTheme}
				/>

				<Button
					variant="primary"
					onClick={saveTheme}
					isBusy={isSaving}
					disabled={isSaving || isApplyingPaletteTemplate || !hasChanges}
					aria-keyshortcuts={getShortcutAriaKeys(['s'])}
					__next40pxDefaultSize
				>
					<span className="minimal-map-admin__button-shortcut-content">
						<span>{__('Save Theme', 'minimal-map')}</span>
						<KeyboardShortcut keys={['s']} variant="blue" />
					</span>
				</Button>
			</div>
		);
	}, [
		active,
		activeTheme,
		activeThemeSlug,
		themes,
		draftColors,
		isSaving,
		isApplyingPaletteTemplate,
		paletteTemplates,
		saveTheme,
		exportTheme,
		onImportFiles,
		applyPaletteTemplate,
		switchTheme,
		isLoading,
	]);

	return {
		themes,
		activeTheme,
		paletteTemplates,
		isLoading,
		isSaving,
		isApplyingPaletteTemplate,
		draftColors,
		actionNotice,
		setDraftColor,
		saveTheme,
		createTheme,
		deleteTheme,
		applyPaletteTemplate,
		switchTheme,
		onImportFiles,
		exportTheme,
		headerAction,
		dismissActionNotice: () => setActionNotice(null),
		isCreateModalOpen,
		isDeleteModalOpen,
		openCreateModal,
		closeCreateModal,
		openDeleteModal,
		closeDeleteModal,
	};
}

function getTemplateThemeLabel(themes: StyleThemeRecord[], baseLabel: string): string {
	const existingLabels = new Set(themes.map((theme) => theme.label.toLowerCase()));

	if (!existingLabels.has(baseLabel.toLowerCase())) {
		return baseLabel;
	}

	let suffix = 2;
	while (existingLabels.has(`${baseLabel} ${suffix}`.toLowerCase())) {
		suffix += 1;
	}

	return `${baseLabel} ${suffix}`;
}

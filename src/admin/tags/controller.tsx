import { Button } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { BrushCleaning, Plus } from 'lucide-react';
import type { ViewGrid } from '@wordpress/dataviews';
import { KeyboardShortcut, getShortcutAriaKeys } from '../../components/Kbd';
import { useSingleKeyShortcut } from '../../lib/keyboard/useSingleKeyShortcut';
import type {
	TagFormState,
	TagRecord,
	TagsAdminConfig,
	StyleThemeRecord,
} from '../../types';
import { DEFAULT_FORM_STATE, DEFAULT_GRID_VIEW } from './constants';
import { fetchAdminTags } from '../../lib/admin/fetchPaginatedRecords';
import { configureApiFetch } from '../../lib/locations/configureApiFetch';
import { fetchAllTags } from '../../lib/tags/fetchAllTags';
import { createTag } from '../../lib/tags/createTag';
import { updateTag } from '../../lib/tags/updateTag';
import { deleteTag } from '../../lib/tags/deleteTag';
import { ThemeSelector } from '../styles/ThemeSelector';
import type { TagsController } from './types';

export function useTagsController(
	config: TagsAdminConfig,
	enabled: boolean,
	themeData: {
		activeTheme: StyleThemeRecord | null;
		themes: StyleThemeRecord[];
		onSwitchTheme: (slug: string) => void;
	}
): TagsController {
	const [actionNotice, setActionNotice] = useState<TagsController['actionNotice']>(null);
	const [tags, setTags] = useState<TagRecord[]>([]);
	const [totalItems, setTotalItems] = useState(0);
	const [editingTag, setEditingTag] = useState<TagRecord | null>(null);
	const [form, setForm] = useState<TagFormState>(DEFAULT_FORM_STATE);
	const [formMode, setFormMode] = useState<TagsController['formMode']>('create');
	const [isDeleteAllTagsModalOpen, setDeleteAllTagsModalOpen] = useState(false);
	const [isDeletingAllTags, setDeletingAllTags] = useState(false);
	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [isModalOpen, setModalOpen] = useState(false);
	const [isLoading, setLoading] = useState(enabled);
	const [isRowActionPending, setRowActionPending] = useState(false);
	const [selectedTag, setSelectedTag] = useState<TagRecord | null>(null);
	const [isSubmitting, setSubmitting] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [view, setView] = useState<ViewGrid>(DEFAULT_GRID_VIEW);

	const loadTags = useCallback(async (): Promise<void> => {
		if (!enabled) {
			return;
		}

		setLoading(true);
		setLoadError(null);

		try {
			const result = await fetchAdminTags(config, {
				page: view.page ?? 1,
				perPage: view.perPage ?? DEFAULT_GRID_VIEW.perPage,
				search: view.search ?? '',
			});
			setTags(result.items);
			setTotalItems(result.totalItems);
		} catch (error) {
			setLoadError(
				error instanceof Error
					? error.message
					: __('Tags could not be loaded.', 'minimal-map')
			);
		} finally {
			setLoading(false);
		}
	}, [config, enabled, view.page, view.perPage, view.search]);

	useEffect(() => {
		configureApiFetch(config.nonce);

		if (!enabled) {
			return;
		}

		void loadTags();
	}, [config.nonce, enabled, loadTags]);

	const resetModalState = useCallback((): void => {
		setEditingTag(null);
		setForm(DEFAULT_FORM_STATE);
		setFormMode('create');
		setSubmitError(null);
	}, []);

	const onAddTag = useCallback((): void => {
		resetModalState();
		setModalOpen(true);
	}, [resetModalState]);

	const isAddTagShortcutBlocked =
		isModalOpen ||
		isDeleteAllTagsModalOpen ||
		isDeleteModalOpen ||
		isDeletingAllTags ||
		isSubmitting ||
		isLoading ||
		isRowActionPending;

	useSingleKeyShortcut({
		active: enabled,
		blocked: isAddTagShortcutBlocked,
		key: 'n',
		onTrigger: onAddTag,
	});

	const onEditTag = useCallback(
		(tag: TagRecord): void => {
			resetModalState();
			setEditingTag(tag);
			setFormMode('edit');
			setForm({
				name: tag.name,
				background_color: tag.background_color,
				foreground_color: tag.foreground_color,
			});
			setModalOpen(true);
		},
		[resetModalState]
	);

	const onCancel = useCallback((): void => {
		if (isSubmitting) {
			return;
		}

		setModalOpen(false);
	}, [isSubmitting]);

	const onCloseDeleteModal = useCallback((): void => {
		if (isRowActionPending) {
			return;
		}

		setDeleteModalOpen(false);
		setSelectedTag(null);
	}, [isRowActionPending]);

	const onCloseDeleteAllTagsModal = useCallback((): void => {
		if (isDeletingAllTags || isRowActionPending) {
			return;
		}

		setDeleteAllTagsModalOpen(false);
	}, [isDeletingAllTags, isRowActionPending]);

	const onOpenDeleteAllTagsModal = useCallback((): void => {
		setDeleteAllTagsModalOpen(true);
	}, []);

	const onOpenDeleteModal = useCallback((tag: TagRecord): void => {
		setSelectedTag(tag);
		setDeleteModalOpen(true);
	}, []);

	const onChangeFormValue = useCallback(
		(key: keyof TagFormState, value: string): void => {
			setForm((currentForm) => ({
				...currentForm,
				[key]: value,
			}));
			setSubmitError(null);
		},
		[]
	);

	const onConfirm = useCallback(async (): Promise<void> => {
		if (!form.name.trim()) {
			setSubmitError(__('Tag name is required.', 'minimal-map'));
			return;
		}

		setSubmitting(true);
		setSubmitError(null);
		setActionNotice(null);

		try {
			if (formMode === 'edit' && editingTag) {
				await updateTag(config, editingTag.id, form);
			} else {
				await createTag(config, form);
			}

			await loadTags();
			setModalOpen(false);
			resetModalState();
			setActionNotice({
				status: 'success',
				message:
					formMode === 'edit'
						? __('Tag updated.', 'minimal-map')
						: __('Tag created.', 'minimal-map'),
			});
		} catch (error) {
			setSubmitError(
				error instanceof Error
					? error.message
					: formMode === 'edit'
					? __('Tag could not be updated.', 'minimal-map')
					: __('Tag could not be created.', 'minimal-map')
			);
		} finally {
			setSubmitting(false);
		}
	}, [config, editingTag, form, formMode, loadTags, resetModalState]);

	const onDeleteTag = useCallback(
		async (tag: TagRecord): Promise<void> => {
			setRowActionPending(true);
			setActionNotice(null);

			try {
				await deleteTag(config, tag.id);
				await loadTags();
				setActionNotice({
					status: 'success',
					message: __('Tag deleted.', 'minimal-map'),
				});
			} catch (error) {
				setActionNotice({
					status: 'error',
					message:
						error instanceof Error
							? error.message
							: __('Tag could not be deleted.', 'minimal-map'),
				});
				throw error;
			} finally {
				setRowActionPending(false);
			}
		},
		[config, loadTags]
	);

	const onConfirmDeleteTag = useCallback(async (): Promise<void> => {
		if (!selectedTag) {
			return;
		}

		try {
			await onDeleteTag(selectedTag);
			setDeleteModalOpen(false);
			setSelectedTag(null);
		} catch (error) {
			return;
		}
	}, [onDeleteTag, selectedTag]);

	const onDeleteAllTags = useCallback(async (): Promise<void> => {
		if (totalItems === 0) {
			setDeleteAllTagsModalOpen(false);
			return;
		}

		setDeletingAllTags(true);
		setRowActionPending(true);
		setActionNotice(null);

		try {
			const allTags = await fetchAllTags(config);

			for (const tag of allTags) {
				await deleteTag(config, tag.id);
			}

			await loadTags();
			setDeleteAllTagsModalOpen(false);
			setActionNotice({
				status: 'success',
				message: sprintf(
					_n('%d tag deleted.', '%d tags deleted.', allTags.length, 'minimal-map'),
					allTags.length
				),
			});
		} catch (error) {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Tags could not be deleted.', 'minimal-map'),
			});
			throw error;
		} finally {
			setDeletingAllTags(false);
			setRowActionPending(false);
		}
	}, [config, loadTags, totalItems]);

	const paginatedTags = useMemo(() => tags, [tags]);
	const totalPages = Math.max(1, Math.ceil(totalItems / (view.perPage ?? DEFAULT_GRID_VIEW.perPage ?? 20)));

	return {
		actionNotice,
		activeTheme: themeData.activeTheme,
		dismissActionNotice: () => setActionNotice(null),
		headerAction: enabled ? (
			<div className="minimal-map-admin__header-actions-group">
				<Button
					variant="tertiary"
					icon={<BrushCleaning size={18} strokeWidth={2} />}
					label={__('Delete all tags', 'minimal-map')}
					onClick={onOpenDeleteAllTagsModal}
					disabled={totalItems === 0 || isDeletingAllTags || isRowActionPending}
					__next40pxDefaultSize
				/>
				<Button
					__next40pxDefaultSize
					variant="primary"
					onClick={onAddTag}
					icon={<Plus size={18} strokeWidth={2} />}
					iconPosition="left"
					aria-keyshortcuts={getShortcutAriaKeys(['n'])}
				>
					<span className="minimal-map-admin__button-shortcut-content">
						<span>{__('Add tag', 'minimal-map')}</span>
						<KeyboardShortcut keys={['n']} variant="blue" />
					</span>
				</Button>
			</div>
		) : null,
		isDeleteAllTagsModalOpen,
		isDeletingAllTags,
		isDeleteModalOpen,
		isLoading,
		isRowActionPending,
		isSubmitting,
		isModalOpen,
		loadError,
		tags,
		totalItems,
		form,
		formMode,
		modalTitle: formMode === 'edit' ? __('Edit tag', 'minimal-map') : __('Add tag', 'minimal-map'),
		selectedTag,
		submitLabel: formMode === 'edit' ? __('Save changes', 'minimal-map') : __('Add tag', 'minimal-map'),
		submitError,
		onAddTag,
		onCloseDeleteAllTagsModal,
		onCloseDeleteModal,
		onDeleteAllTags,
		onConfirmDeleteTag,
		onDeleteTag,
		onEditTag,
		onOpenDeleteAllTagsModal,
		onOpenDeleteModal,
		onConfirm,
		onCancel,
		onChangeFormValue,
		onChangeView: (nextView: ViewGrid) => setView(nextView),
		paginatedTags,
		totalPages,
		view,
	};
}

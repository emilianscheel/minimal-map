import { Button } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { BrushCleaning, Library } from 'lucide-react';
import type { ViewGrid } from '@wordpress/dataviews';
import apiFetch from '@wordpress/api-fetch';
import type {
	MarkerRecord,
	MarkersAdminConfig,
} from '../../types';
import { fetchAdminMarkers } from '../../lib/admin/fetchPaginatedRecords';
import { formatFilename, hasFilenameBasename, parseFilenameParts } from '../../lib/filenames';
import { configureApiFetch } from '../../lib/locations/configureApiFetch';
import { fetchAllMarkers } from '../../lib/markers/fetchAllMarkers';
import { updateMarker } from '../../lib/markers/updateMarker';
import { applySvgColors, parseSvgColors } from '../../lib/markers/svgColors';
import type { SvgColorEntry } from '../../lib/markers/svgColors';
import { UploadMarkerButton } from './UploadMarkerButton';
import type { MarkersController } from './types';
import { triggerFileDownload } from '../../lib/download';

const DEFAULT_GRID_VIEW: ViewGrid = {
	type: 'grid',
	page: 1,
	perPage: 12,
	titleField: 'title',
	mediaField: 'map_preview',
	fields: [],
	showMedia: true,
	showTitle: true,
	showDescription: false,
	layout: {
		previewSize: 200,
		badgeFields: [],
	},
};

export function useMarkersController(
	config: MarkersAdminConfig,
	enabled: boolean,
): MarkersController {
	const [actionNotice, setActionNotice] = useState<MarkersController['actionNotice']>(null);
	const [editFilenameBasename, setEditFilenameBasename] = useState('');
	const [editFilenameExtension, setEditFilenameExtension] = useState('');
	const [editingMarker, setEditingMarker] = useState<MarkerRecord | null>(null);
	const [isDeleteAllMarkersModalOpen, setDeleteAllMarkersModalOpen] = useState(false);
	const [isDeletingAllMarkers, setDeletingAllMarkers] = useState(false);
	const [isEditModalOpen, setEditModalOpen] = useState(false);
	const [isColorEditModalOpen, setColorEditModalOpen] = useState(false);
	const [isLibraryModalOpen, setLibraryModalOpen] = useState(false);
	const [colorEditingMarker, setColorEditingMarker] = useState<MarkerRecord | null>(null);
	const [draftSvgColors, setDraftSvgColors] = useState<SvgColorEntry[]>([]);
	const [colorEditSubmitError, setColorEditSubmitError] = useState<string | null>(null);
	const [markers, setMarkers] = useState<MarkerRecord[]>([]);
	const [totalItems, setTotalItems] = useState(0);
	const [isLoading, setLoading] = useState(enabled);
	const [isRowActionPending, setRowActionPending] = useState(false);
	const [isSubmitting, setSubmitting] = useState(false);
	const [isUploading, setUploading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [view, setView] = useState<ViewGrid>(DEFAULT_GRID_VIEW);

	const loadMarkers = useCallback(async (): Promise<void> => {
		if (!enabled) {
			return;
		}

		setLoading(true);
		setLoadError(null);

		try {
			const result = await fetchAdminMarkers(config, {
				page: view.page ?? 1,
				perPage: view.perPage ?? DEFAULT_GRID_VIEW.perPage,
				search: view.search ?? '',
			});
			setMarkers(result.items);
			setTotalItems(result.totalItems);
		} catch (error) {
			setLoadError(
				error instanceof Error
					? error.message
					: __('Markers could not be loaded.', 'minimal-map')
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

		void loadMarkers();
	}, [config.nonce, enabled, loadMarkers]);

	const dismissActionNotice = useCallback((): void => {
		setActionNotice(null);
	}, []);

	const resetEditModalState = useCallback((): void => {
		setEditingMarker(null);
		setEditFilenameBasename('');
		setEditFilenameExtension('');
		setSubmitError(null);
	}, []);

	const resetColorEditModalState = useCallback((): void => {
		setColorEditingMarker(null);
		setDraftSvgColors([]);
		setColorEditSubmitError(null);
	}, []);

	const onEditMarker = useCallback((marker: MarkerRecord): void => {
		const { basename, extension } = parseFilenameParts(marker.title);

		setEditingMarker(marker);
		setEditFilenameBasename(basename);
		setEditFilenameExtension(extension);
		setSubmitError(null);
		setEditModalOpen(true);
	}, []);

	const onCancelEditMarker = useCallback((): void => {
		if (isSubmitting) {
			return;
		}

		setEditModalOpen(false);
		resetEditModalState();
	}, [isSubmitting, resetEditModalState]);

	const onChangeEditFilename = useCallback((value: string): void => {
		setEditFilenameBasename(value);
		setSubmitError(null);
	}, []);

	const onOpenEditMarkerColors = useCallback((marker: MarkerRecord): void => {
		setColorEditingMarker(marker);
		setDraftSvgColors(parseSvgColors(marker.content));
		setColorEditSubmitError(null);
		setColorEditModalOpen(true);
	}, []);

	const onCancelEditMarkerColors = useCallback((): void => {
		if (isSubmitting) {
			return;
		}
		setColorEditModalOpen(false);
		resetColorEditModalState();
	}, [isSubmitting, resetColorEditModalState]);

	const onChangeMarkerColor = useCallback((id: string, color: string): void => {
		setDraftSvgColors((prev) =>
			prev.map((entry) => (entry.id === id ? { ...entry, value: color, isNone: false } : entry))
		);
		setColorEditSubmitError(null);
	}, []);

	const onToggleMarkerColorNone = useCallback((id: string): void => {
		setDraftSvgColors((prev) =>
			prev.map((entry) => (entry.id === id ? { ...entry, isNone: !entry.isNone } : entry))
		);
		setColorEditSubmitError(null);
	}, []);

	const onConfirmEditMarkerColors = useCallback(async (): Promise<void> => {
		if (!colorEditingMarker) {
			return;
		}

		setSubmitting(true);
		setColorEditSubmitError(null);
		setActionNotice(null);

		try {
			const updatedContent = applySvgColors(colorEditingMarker.content, draftSvgColors);
			await updateMarker(config, colorEditingMarker.id, colorEditingMarker.title, updatedContent);
			await loadMarkers();
			setColorEditModalOpen(false);
			resetColorEditModalState();
			setActionNotice({
				status: 'success',
				message: __('Marker updated.', 'minimal-map'),
			});
		} catch (error) {
			setColorEditSubmitError(
				error instanceof Error ? error.message : __('Marker could not be updated.', 'minimal-map')
			);
		} finally {
			setSubmitting(false);
		}
	}, [colorEditingMarker, config, draftSvgColors, loadMarkers, resetColorEditModalState]);

	const onOpenLibraryModal = useCallback((): void => {
		setLibraryModalOpen(true);
	}, []);

	const onCloseLibraryModal = useCallback((): void => {
		setLibraryModalOpen(false);
	}, []);

	const onCloseDeleteAllMarkersModal = useCallback((): void => {
		if (isDeletingAllMarkers || isRowActionPending) {
			return;
		}

		setDeleteAllMarkersModalOpen(false);
	}, [isDeletingAllMarkers, isRowActionPending]);

	const onOpenDeleteAllMarkersModal = useCallback((): void => {
		setDeleteAllMarkersModalOpen(true);
	}, []);

	const onDeleteMarker = useCallback(
		async (marker: MarkerRecord): Promise<void> => {
			setRowActionPending(true);
			setActionNotice(null);

			try {
				await apiFetch({
					path: `${config.restPath}/${marker.id}`,
					method: 'DELETE',
				});
				await loadMarkers();
				setActionNotice({
					status: 'success',
					message: __('Marker deleted.', 'minimal-map'),
				});
			} catch (error) {
				setActionNotice({
					status: 'error',
					message:
						error instanceof Error
							? error.message
							: __('Marker could not be deleted.', 'minimal-map'),
				});
				throw error;
			} finally {
				setRowActionPending(false);
			}
		},
		[config.restPath, loadMarkers]
	);

	const onDeleteAllMarkers = useCallback(async (): Promise<void> => {
		if (totalItems === 0) {
			setDeleteAllMarkersModalOpen(false);
			return;
		}

		setDeletingAllMarkers(true);
		setRowActionPending(true);
		setActionNotice(null);

		try {
			const allMarkers = await fetchAllMarkers(config);

			for (const marker of allMarkers) {
				await apiFetch({
					path: `${config.restPath}/${marker.id}`,
					method: 'DELETE',
				});
			}

			await loadMarkers();
			setDeleteAllMarkersModalOpen(false);
			setActionNotice({
				status: 'success',
				message: sprintf(
					_n('%d marker deleted.', '%d markers deleted.', allMarkers.length, 'minimal-map'),
					allMarkers.length
				),
			});
		} catch (error) {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Markers could not be deleted.', 'minimal-map'),
			});
			throw error;
		} finally {
			setDeletingAllMarkers(false);
			setRowActionPending(false);
		}
	}, [config, config.restPath, loadMarkers, totalItems]);

	const onDownloadMarker = useCallback((marker: MarkerRecord): void => {
		const blob = new Blob([marker.content], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const fileName = marker.title.endsWith('.svg') ? marker.title : `${marker.title}.svg`;
		triggerFileDownload(url, fileName);
	}, []);

	const onConfirmEditMarker = useCallback(async (): Promise<void> => {
		if (!editingMarker) {
			return;
		}

		if (!hasFilenameBasename(editFilenameBasename)) {
			setSubmitError(__('Filename is required.', 'minimal-map'));
			return;
		}

		setSubmitting(true);
		setSubmitError(null);
		setActionNotice(null);

		try {
			await updateMarker(
				config,
				editingMarker.id,
				formatFilename(editFilenameBasename, editFilenameExtension)
			);
			await loadMarkers();
			setEditModalOpen(false);
			resetEditModalState();
			setActionNotice({
				status: 'success',
				message: __('Marker updated.', 'minimal-map'),
			});
		} catch (error) {
			setSubmitError(
				error instanceof Error ? error.message : __('Marker could not be updated.', 'minimal-map')
			);
		} finally {
			setSubmitting(false);
		}
	}, [
		config,
		editFilenameBasename,
		editFilenameExtension,
		editingMarker,
		loadMarkers,
		resetEditModalState,
	]);

	const onUploadMarkers = useCallback(
		async (files: FileList | File[]): Promise<void> => {
			const fileList = Array.from(files).filter((file) => file.type === 'image/svg+xml' || file.name.endsWith('.svg'));

			if (fileList.length === 0) {
				return;
			}

			setUploading(true);
			setActionNotice(null);

			try {
				await Promise.all(
					fileList.map(async (file) => {
						const content = await file.text();
						// Basic SVG validation (very simple)
						if (!content.includes('<svg')) {
							throw new Error(__('Invalid SVG file.', 'minimal-map'));
						}

						return apiFetch({
							path: config.restPath,
							method: 'POST',
							data: {
								title: file.name,
								content: content,
								status: 'publish',
							},
						});
					})
				);
				await loadMarkers();
				setActionNotice({
					status: 'success',
					message:
						fileList.length === 1
							? __('Marker uploaded.', 'minimal-map')
							: sprintf(
								_n( '%d marker uploaded.', '%d markers uploaded.', fileList.length, 'minimal-map' ),
								fileList.length
							),
				});
			} catch (error) {
				setActionNotice({
					status: 'error',
					message:
						error instanceof Error
							? error.message
							: __('Markers could not be uploaded.', 'minimal-map'),
				});
			} finally {
				setUploading(false);
			}
		},
		[config.restPath, loadMarkers]
	);

	const totalPages = Math.max(
		1,
		Math.ceil(totalItems / Math.max(1, view.perPage ?? DEFAULT_GRID_VIEW.perPage ?? 1))
	);

	return {
		actionNotice,
		dismissActionNotice,
		editFilenameBasename,
		editFilenameExtension,
		editingMarker,
		headerAction: enabled ? (
			<div className="minimal-map-admin__header-actions-group">
				<Button
					variant="tertiary"
					icon={<BrushCleaning size={18} strokeWidth={2} />}
					label={__('Delete all markers', 'minimal-map')}
					onClick={onOpenDeleteAllMarkersModal}
					disabled={totalItems === 0 || isDeletingAllMarkers || isRowActionPending || isUploading}
					__next40pxDefaultSize
				/>
				<Button
					variant="tertiary"
					icon={<Library size={18} strokeWidth={2} />}
					label={__('Marker library', 'minimal-map')}
					onClick={onOpenLibraryModal}
					disabled={isUploading || isDeletingAllMarkers || isRowActionPending}
					__next40pxDefaultSize
				/>
				<UploadMarkerButton onUpload={onUploadMarkers} isUploading={isUploading} />
			</div>
		) : null,
		isDeleteAllMarkersModalOpen,
		isDeletingAllMarkers,
		isEditModalOpen,
		isLoading,
		isRowActionPending,
		isSubmitting,
		isUploading,
		loadError,
		markers,
		totalItems,
		onCancelEditMarker,
		onChangeEditFilename,
		onCloseDeleteAllMarkersModal,
		onDeleteAllMarkers,
		onDeleteMarker,
		onDownloadMarker,
		onConfirmEditMarker,
		onEditMarker,
		onOpenDeleteAllMarkersModal,
		onUploadMarkers,
		onChangeView: (nextView: ViewGrid) => setView(nextView),
		paginatedMarkers: markers,
		submitError,
		totalPages,
		view,
		isColorEditModalOpen,
		colorEditingMarker,
		draftSvgColors,
		colorEditSubmitError,
		onOpenEditMarkerColors,
		onCancelEditMarkerColors,
		onChangeMarkerColor,
		onToggleMarkerColorNone,
		onConfirmEditMarkerColors,
		isLibraryModalOpen,
		onOpenLibraryModal,
		onCloseLibraryModal,
	};
}

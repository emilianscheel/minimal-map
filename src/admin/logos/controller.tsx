import apiFetch from '@wordpress/api-fetch';
import { Button } from '@wordpress/components';
import type { ViewGrid } from '@wordpress/dataviews';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { BrushCleaning } from 'lucide-react';
import { fetchAdminLogos } from '../../lib/admin/fetchPaginatedRecords';
import { configureApiFetch } from '../../lib/locations/configureApiFetch';
import { createLocationFormStateFromRecord } from '../../lib/locations/createLocationFormStateFromRecord';
import { formatFilename, hasFilenameBasename, parseFilenameParts } from '../../lib/filenames';
import { fetchAllLocations } from '../../lib/locations/fetchAllLocations';
import { updateLocation } from '../../lib/locations/updateLocation';
import { fetchAllLogos } from '../../lib/logos/fetchAllLogos';
import { updateLogo } from '../../lib/logos/updateLogo';
import type { LocationRecord, LogoRecord, LocationsAdminConfig, LogosAdminConfig } from '../../types';
import { UploadLogoButton } from './UploadLogoButton';
import type { LogosController } from './types';
import { triggerFileDownload } from '../../lib/download';

async function readLogoFile(file: File): Promise<string> {
	if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
		return await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				if (typeof reader.result === 'string') {
					resolve(reader.result);
					return;
				}

				reject(new Error(__('Invalid PNG file.', 'minimal-map')));
			};
			reader.onerror = () => {
				reject(new Error(__('PNG file could not be read.', 'minimal-map')));
			};
			reader.readAsDataURL(file);
		});
	}

	const content = await file.text();

	if (!content.includes('<svg')) {
		throw new Error(__('Invalid SVG file.', 'minimal-map'));
	}

	return content;
}

const DEFAULT_GRID_VIEW: ViewGrid = {
	type: 'grid',
	page: 1,
	perPage: 12,
	titleField: 'title',
	mediaField: 'logo_preview',
	fields: [],
	showMedia: true,
	showTitle: true,
	showDescription: false,
	layout: {
		previewSize: 240,
		badgeFields: [],
	},
};

export function useLogosController(
	config: LogosAdminConfig,
	locationsConfig: LocationsAdminConfig,
	enabled: boolean
): LogosController {
	const [actionNotice, setActionNotice] = useState<LogosController['actionNotice']>(null);
	const [editFilenameBasename, setEditFilenameBasename] = useState('');
	const [editFilenameExtension, setEditFilenameExtension] = useState('');
	const [editingLogo, setEditingLogo] = useState<LogoRecord | null>(null);
	const [isDeleteAllLogosModalOpen, setDeleteAllLogosModalOpen] = useState(false);
	const [isDeletingAllLogos, setDeletingAllLogos] = useState(false);
	const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
	const [isEditModalOpen, setEditModalOpen] = useState(false);
	const [isLoading, setLoading] = useState(enabled);
	const [isRowActionPending, setRowActionPending] = useState(false);
	const [isSubmitting, setSubmitting] = useState(false);
	const [isUploading, setUploading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [logos, setLogos] = useState<LogoRecord[]>([]);
	const [totalItems, setTotalItems] = useState(0);
	const [selectedLogo, setSelectedLogo] = useState<LogoRecord | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [view, setView] = useState<ViewGrid>(DEFAULT_GRID_VIEW);

	const loadLogos = useCallback(async (): Promise<void> => {
		if (!enabled) {
			return;
		}

		setLoading(true);
		setLoadError(null);

		try {
			const result = await fetchAdminLogos(config, {
				page: view.page ?? 1,
				perPage: view.perPage ?? DEFAULT_GRID_VIEW.perPage,
				search: view.search ?? '',
			});
			setLogos(result.items);
			setTotalItems(result.totalItems);
		} catch (error) {
			setLoadError(
				error instanceof Error ? error.message : __('Logos could not be loaded.', 'minimal-map')
			);
		} finally {
			setLoading(false);
		}
	}, [config, enabled, view.page, view.perPage, view.search]);

	useEffect(() => {
		configureApiFetch(config.nonce || locationsConfig.nonce);

		if (!enabled) {
			return;
		}

		void loadLogos();
	}, [config.nonce, enabled, loadLogos, locationsConfig.nonce]);

	const dismissActionNotice = useCallback((): void => {
		setActionNotice(null);
	}, []);

	const resetEditModalState = useCallback((): void => {
		setEditingLogo(null);
		setEditFilenameBasename('');
		setEditFilenameExtension('');
		setSubmitError(null);
	}, []);

	const onEditLogo = useCallback(
		(logo: LogoRecord): void => {
			const { basename, extension } = parseFilenameParts(logo.title);

			setEditingLogo(logo);
			setEditFilenameBasename(basename);
			setEditFilenameExtension(extension);
			setSubmitError(null);
			setEditModalOpen(true);
		},
		[]
	);

	const onCancelEditLogo = useCallback((): void => {
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

	const onCloseDeleteModal = useCallback((): void => {
		if (isRowActionPending) {
			return;
		}

		setDeleteModalOpen(false);
		setSelectedLogo(null);
	}, [isRowActionPending]);

	const onCloseDeleteAllLogosModal = useCallback((): void => {
		if (isDeletingAllLogos || isRowActionPending) {
			return;
		}

		setDeleteAllLogosModalOpen(false);
	}, [isDeletingAllLogos, isRowActionPending]);

	const onOpenDeleteAllLogosModal = useCallback((): void => {
		setDeleteAllLogosModalOpen(true);
	}, []);

	const onOpenDeleteModal = useCallback((logo: LogoRecord): void => {
		setSelectedLogo(logo);
		setDeleteModalOpen(true);
	}, []);

	const deleteLogoWithAssignments = useCallback(
		async (logo: LogoRecord, locations: LocationRecord[]): Promise<void> => {
			const assignedLocations = locations.filter((location) => location.logo_id === logo.id);

			await Promise.all(
				assignedLocations.map((location: LocationRecord) =>
					updateLocation(locationsConfig, location.id, {
						...createLocationFormStateFromRecord(location),
						logo_id: 0,
					})
				)
			);

			await apiFetch({
				path: `${config.restPath}/${logo.id}`,
				method: 'DELETE',
			});
		},
		[config.restPath, locationsConfig]
	);

	const onConfirmDeleteLogo = useCallback(async (): Promise<void> => {
		if (!selectedLogo) {
			return;
		}

		setRowActionPending(true);
		setActionNotice(null);

		try {
			const locations = await fetchAllLocations(locationsConfig);
			await deleteLogoWithAssignments(selectedLogo, locations);

			await loadLogos();
			setActionNotice({
				status: 'success',
				message: __('Logo deleted.', 'minimal-map'),
			});
			setDeleteModalOpen(false);
			setSelectedLogo(null);
		} catch (error) {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error ? error.message : __('Logo could not be deleted.', 'minimal-map'),
			});
		} finally {
			setRowActionPending(false);
		}
	}, [deleteLogoWithAssignments, loadLogos, locationsConfig, selectedLogo]);

	const onDeleteAllLogos = useCallback(async (): Promise<void> => {
		if (totalItems === 0) {
			setDeleteAllLogosModalOpen(false);
			return;
		}

		setDeletingAllLogos(true);
		setRowActionPending(true);
		setActionNotice(null);

		try {
			const locations = await fetchAllLocations(locationsConfig);
			const allLogos = await fetchAllLogos(config);

			for (const logo of allLogos) {
				await deleteLogoWithAssignments(logo, locations);
			}

			await loadLogos();
			setDeleteAllLogosModalOpen(false);
			setActionNotice({
				status: 'success',
				message: sprintf(
					_n('%d logo deleted.', '%d logos deleted.', allLogos.length, 'minimal-map'),
					allLogos.length
				),
			});
		} catch (error) {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error ? error.message : __('Logos could not be deleted.', 'minimal-map'),
			});
			throw error;
		} finally {
			setDeletingAllLogos(false);
			setRowActionPending(false);
		}
	}, [config, deleteLogoWithAssignments, loadLogos, locationsConfig, totalItems]);

	const onConfirmEditLogo = useCallback(async (): Promise<void> => {
		if (!editingLogo) {
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
			await updateLogo(
				config,
				editingLogo.id,
				formatFilename(editFilenameBasename, editFilenameExtension)
			);
			await loadLogos();
			setEditModalOpen(false);
			resetEditModalState();
			setActionNotice({
				status: 'success',
				message: __('Logo updated.', 'minimal-map'),
			});
		} catch (error) {
			setSubmitError(
				error instanceof Error ? error.message : __('Logo could not be updated.', 'minimal-map')
			);
		} finally {
			setSubmitting(false);
		}
	}, [
		config,
		editFilenameBasename,
		editFilenameExtension,
		editingLogo,
		loadLogos,
		resetEditModalState,
	]);

	const onDownloadLogo = useCallback((logo: LogoRecord): void => {
		const isDataUrl = logo.content.startsWith('data:');
		const href = isDataUrl
			? logo.content
			: URL.createObjectURL(new Blob([logo.content], { type: 'image/svg+xml' }));
		const hasKnownExtension = /\.(png|svg)$/i.test(logo.title);
		const inferredExtension = isDataUrl ? '.png' : '.svg';
		const fileName = hasKnownExtension ? logo.title : `${logo.title}${inferredExtension}`;

		triggerFileDownload(href, fileName);
	}, []);

	const onUploadLogos = useCallback(
		async (files: FileList | File[]): Promise<void> => {
			const fileList = Array.from(files).filter(
				(file) =>
					file.type === 'image/svg+xml' ||
					file.type === 'image/png' ||
					file.name.toLowerCase().endsWith('.svg') ||
					file.name.toLowerCase().endsWith('.png')
			);

			if (fileList.length === 0) {
				return;
			}

			setUploading(true);
			setActionNotice(null);

			try {
				await Promise.all(
					fileList.map(async (file) => {
						const content = await readLogoFile(file);

						return apiFetch({
							path: config.restPath,
							method: 'POST',
							data: {
								title: file.name,
								content,
								status: 'publish',
							},
						});
					})
				);
				await loadLogos();
				setActionNotice({
					status: 'success',
					message:
						fileList.length === 1
							? __('Logo uploaded.', 'minimal-map')
							: sprintf(
								_n( '%d logo uploaded.', '%d logos uploaded.', fileList.length, 'minimal-map' ),
								fileList.length
							),
				});
			} catch (error) {
				setActionNotice({
					status: 'error',
					message:
						error instanceof Error ? error.message : __('Logos could not be uploaded.', 'minimal-map'),
				});
			} finally {
				setUploading(false);
			}
		},
		[config.restPath, loadLogos]
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
		editingLogo,
		headerAction: enabled ? (
			<div className="minimal-map-admin__header-actions-group">
				<Button
					variant="tertiary"
					icon={<BrushCleaning size={18} strokeWidth={2} />}
					label={__('Delete all logos', 'minimal-map')}
					onClick={onOpenDeleteAllLogosModal}
					disabled={totalItems === 0 || isDeletingAllLogos || isRowActionPending || isUploading}
					__next40pxDefaultSize
				/>
				<UploadLogoButton onUpload={(files) => void onUploadLogos(files)} isUploading={isUploading} />
			</div>
		) : null,
		isDeleteAllLogosModalOpen,
		isDeletingAllLogos,
		isDeleteModalOpen,
		isEditModalOpen,
		isLoading,
		isRowActionPending,
		isSubmitting,
		isUploading,
		loadError,
		logos,
		totalItems,
		onChangeView: (nextView: ViewGrid) => setView(nextView),
		onCancelEditLogo,
		onChangeEditFilename,
		onCloseDeleteAllLogosModal,
		onCloseDeleteModal,
		onDeleteAllLogos,
		onConfirmDeleteLogo,
		onConfirmEditLogo,
		onDownloadLogo,
		onEditLogo,
		onOpenDeleteAllLogosModal,
		onOpenDeleteModal,
		onUploadLogos,
		paginatedLogos: logos,
		selectedLogo,
		submitError,
		totalPages,
		view,
	};
}

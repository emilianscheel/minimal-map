import { Button } from '@wordpress/components';
import type { ViewTable } from '@wordpress/dataviews';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { BrushCleaning, Plus } from 'lucide-react';
import { ExportLocationsDropdown } from './ExportLocationsDropdown';
import { ImportLocationsButton } from './ImportLocationsButton';
import { KeyboardShortcut, getShortcutAriaKeys } from '../../components/Kbd';
import type {
	CsvImportAssignments,
	CsvImportMapping,
	ParsedLocationImportData,
} from '../../lib/locations/importLocations';
import type {
	AdminLocationListItem,
	CollectionRecord,
	CollectionsAdminConfig,
	LocationModalStep,
	LocationFormMode,
	LocationFormState,
	LocationOpeningHoursDay,
	LocationRecord,
	LogoRecord,
	MarkerRecord,
	LogosAdminConfig,
	MarkersAdminConfig,
	LocationsAdminConfig,
	MapCoordinates,
	OpeningHoursDayKey,
	StyleThemeRecord,
	TagRecord,
	TagsAdminConfig,
} from '../../types';
import {
	fetchAdminLocations,
	fetchAllLocationLookupResource,
} from '../../lib/admin/fetchPaginatedRecords';
import { triggerFileDownload } from '../../lib/download';
import { buildTimestampedFileName } from '../../lib/downloadFileName';
import { fetchAllCollections } from '../../lib/collections/fetchAllCollections';
import { fetchAllLogos } from '../../lib/logos/fetchAllLogos';
import { fetchAllMarkers } from '../../lib/markers/fetchAllMarkers';
import { fetchAllTags } from '../../lib/tags/fetchAllTags';
import { updateCollection } from '../../lib/collections/updateCollection';
import { configureApiFetch } from '../../lib/locations/configureApiFetch';
import { createEmptyFieldErrors } from '../../lib/locations/createEmptyFieldErrors';
import { createLocationFormStateFromRecord } from '../../lib/locations/createLocationFormStateFromRecord';
import { createLocation } from '../../lib/locations/createLocation';
import { deleteLocation } from '../../lib/locations/deleteLocation';
import { duplicateLocation } from '../../lib/locations/duplicateLocation';
import { fetchAllLocations } from '../../lib/locations/fetchAllLocations';
import {
	buildLocationExportCsv,
	buildLocationExportJson,
	createExampleLocationExportData,
	createEmptyCsvImportAssignments,
	createEmptyCsvImportMapping,
	createEmptyCsvOpeningHoursImportMapping,
	getValidCsvOpeningHoursColumnIndexes,
	isCommonCsvFormat,
	parseLocationImportFile,
	runCommonCsvImport,
	runMappedCsvImport,
	type CsvOpeningHoursImportMapping,
} from '../../lib/locations/importLocations';
import {
	exportLocationsFile,
	getLocationsExportErrorMessage,
} from '../../lib/locations/exportLocationsFile';
import { geocodeAddress } from '../../lib/locations/geocodeAddress';
import { hasFieldErrors } from '../../lib/locations/hasFieldErrors';
import { hasLocationAddressChanged } from '../../lib/locations/hasLocationAddressChanged';
import { useSingleKeyShortcut } from '../../lib/keyboard/useSingleKeyShortcut';
import { updateLocationCoordinates } from '../../lib/locations/updateLocationCoordinates';
import { updateLocation } from '../../lib/locations/updateLocation';
import { validateAddressStep } from '../../lib/locations/validateAddressStep';
import { validateDetailsStep } from '../../lib/locations/validateDetailsStep';
import { validateOpeningHoursStep } from '../../lib/locations/validateOpeningHoursStep';
import { updateLocationsSettings } from '../../lib/locations/updateLocationsSettings';
import {
	applyLocationsTableViewChange,
	createDefaultLocationsView,
	DEFAULT_FORM_STATE,
	DEFAULT_LOCATIONS_TABLE_PER_PAGE,
} from './constants';
import {
	getLocationsWithAssignedLogos,
	getLocationsWithAssignedMarkers,
	getLocationsWithAssignedTags,
	mergeLocationTagIds,
} from './assignmentHelpers';
import { buildCsvImportColumnOptions } from './customCsvImport';
import type { LocationsController } from './types';

const DEFAULT_MAP_CENTER: MapCoordinates = {
	lat: 52.517,
	lng: 13.388,
};

export function useLocationsController(
	config: LocationsAdminConfig,
	collectionsConfig: CollectionsAdminConfig,
	logosConfig: LogosAdminConfig,
	markersConfig: MarkersAdminConfig,
	tagsConfig: TagsAdminConfig,
	enabled: boolean,
	themeData: {
		activeTheme: StyleThemeRecord | null;
		themes: StyleThemeRecord[];
		onSwitchTheme: (slug: string) => void;
	}
): LocationsController {
	const [form, setForm] = useState<LocationFormState>(DEFAULT_FORM_STATE);
	const [formMode, setFormMode] = useState<LocationFormMode>('create');
	const [editingLocation, setEditingLocation] = useState<LocationRecord | null>(null);
	const [originalForm, setOriginalForm] = useState<LocationFormState | null>(null);
	const [fieldErrors, setFieldErrors] = useState(createEmptyFieldErrors());
	const [isModalOpen, setModalOpen] = useState(false);
	const [isMarkerColorModalOpen, setMarkerColorModalOpen] = useState(false);
	const [isSubmitting, setSubmitting] = useState(false);
	const [isGeocoding, setGeocoding] = useState(false);
	const [isLoading, setLoading] = useState(enabled);
	const [isRowActionPending, setRowActionPending] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [actionNotice, setActionNotice] = useState<LocationsController['actionNotice']>(null);
	const [geocodeError, setGeocodeError] = useState<string | null>(null);
	const [geocodeNotice, setGeocodeNotice] = useState<string | null>(null);
	const [locations, setLocations] = useState<AdminLocationListItem[]>([]);
	const [totalItems, setTotalItems] = useState(0);
	const [collections, setCollections] = useState<CollectionRecord[]>([]);
	const [logos, setLogos] = useState<LogoRecord[]>([]);
	const [markers, setMarkers] = useState<MarkerRecord[]>([]);
	const [tags, setTags] = useState<TagRecord[]>([]);
	const [step, setStep] = useState<LocationModalStep>('details');
	const [view, setView] = useState<ViewTable>(() =>
		createDefaultLocationsView(config.preferredPerPage)
	);
	const [mapCenter, setMapCenter] = useState<MapCoordinates | null>(null);
	const [selectedCoordinates, setSelectedCoordinates] = useState<MapCoordinates | null>(null);
	const [isAssignToCollectionModalOpen, setAssignToCollectionModalOpen] = useState(false);
	const [selectedAssignmentLocation, setSelectedAssignmentLocation] = useState<LocationRecord | null>(null);
	const [assignmentCollectionId, setAssignmentCollectionId] = useState('');
	const [isAssignLogoModalOpen, setAssignLogoModalOpen] = useState(false);
	const [selectedLogoLocations, setSelectedLogoLocations] = useState<LocationRecord[]>([]);
	const [assignmentLogoId, setAssignmentLogoId] = useState('');
	const [isAssignMarkerModalOpen, setAssignMarkerModalOpen] = useState(false);
	const [selectedMarkerLocations, setSelectedMarkerLocations] = useState<LocationRecord[]>([]);
	const [selectedMarkerColorLocations, setSelectedMarkerColorLocations] = useState<LocationRecord[]>([]);
	const [assignmentMarkerId, setAssignmentMarkerId] = useState('');
	const [isAssignTagsModalOpen, setAssignTagsModalOpen] = useState(false);
	const [selectedTagsLocations, setSelectedTagsLocations] = useState<LocationRecord[]>([]);
	const [assignmentTagIds, setAssignmentTagIds] = useState<number[]>([]);
	const [isAssignOpeningHoursModalOpen, setAssignOpeningHoursModalOpen] = useState(false);
	const [selectedOpeningHoursLocations, setSelectedOpeningHoursLocations] = useState<LocationRecord[]>([]);
	const [isAssignmentSaving, setAssignmentSaving] = useState(false);
	const [isDeleteLogoConfirmationModalOpen, setDeleteLogoConfirmationModalOpen] = useState(false);
	const [selectedLogoRemovalLocations, setSelectedLogoRemovalLocations] =
		useState<LocationRecord[]>([]);
	const [isRemoveMarkerConfirmationModalOpen, setRemoveMarkerConfirmationModalOpen] =
		useState(false);
	const [selectedMarkerRemovalLocations, setSelectedMarkerRemovalLocations] =
		useState<LocationRecord[]>([]);
	const [isRemoveTagsConfirmationModalOpen, setRemoveTagsConfirmationModalOpen] =
		useState(false);
	const [selectedTagRemovalLocations, setSelectedTagRemovalLocations] =
		useState<LocationRecord[]>([]);
	const [isShowLocationConfirmationModalOpen, setShowLocationConfirmationModalOpen] =
		useState(false);
	const [selectedShownLocation, setSelectedShownLocation] =
		useState<LocationRecord | null>(null);
	const [isRemoveCollectionAssignmentModalOpen, setRemoveCollectionAssignmentModalOpen] =
		useState(false);
	const [selectedRemovalLocation, setSelectedRemovalLocation] = useState<LocationRecord | null>(
		null
	);
	const [selectedRemovalCollection, setSelectedRemovalCollection] =
		useState<CollectionRecord | null>(null);
	const [isRemovingCollectionAssignment, setRemovingCollectionAssignment] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [isCustomCsvImportModalOpen, setCustomCsvImportModalOpen] = useState(false);
	const [isLocationImportProgressModalOpen, setLocationImportProgressModalOpen] = useState(false);
	const [isDeleteAllLocationsModalOpen, setDeleteAllLocationsModalOpen] = useState(false);
	const [customCsvImportStep, setCustomCsvImportStep] = useState<'mapping' | 'opening_hours'>(
		'mapping'
	);
	const [pendingCsvImport, setPendingCsvImport] = useState<ParsedLocationImportData | null>(null);
	const [csvImportMapping, setCsvImportMapping] = useState<CsvImportMapping>(
		createEmptyCsvImportMapping()
	);
	const [csvImportOpeningHoursMapping, setCsvImportOpeningHoursMapping] =
		useState<CsvOpeningHoursImportMapping>(createEmptyCsvOpeningHoursImportMapping());
	const [csvImportLogoId, setCsvImportLogoId] = useState('');
	const [csvImportMarkerId, setCsvImportMarkerId] = useState('');
	const [csvImportTagIds, setCsvImportTagIds] = useState<number[]>([]);
	const [csvImportProgressCompleted, setCsvImportProgressCompleted] = useState(0);
	const [csvImportProgressTotal, setCsvImportProgressTotal] = useState(0);
	const [isDeletingAllLocations, setDeletingAllLocations] = useState(false);
	const [selection, setSelection] = useState<string[]>([]);
	const [debouncedSearch, setDebouncedSearch] = useState(view.search ?? '');

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setDebouncedSearch(view.search ?? '');
		}, 250);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [view.search]);

	const loadLocations = useCallback(async () => {
		if (!enabled) {
			return;
		}

		setLoading(true);
		setLoadError(null);

		try {
			const result = await fetchAdminLocations(config, {
				page: view.page ?? 1,
				perPage: view.perPage ?? DEFAULT_LOCATIONS_TABLE_PER_PAGE,
				search: debouncedSearch,
				orderBy: view.sort?.field === 'title' ? 'title' : undefined,
				order: view.sort?.direction === 'desc' ? 'desc' : 'asc',
			});
			setLocations(result.items);
			setTotalItems(result.totalItems);
		} catch (error) {
			setLoadError(
				error instanceof Error
					? error.message
					: __('Locations and collections could not be loaded.', 'minimal-map')
			);
		} finally {
			setLoading(false);
		}
	}, [config, debouncedSearch, enabled, view.page, view.perPage, view.sort?.direction, view.sort?.field]);

	useEffect(() => {
		configureApiFetch(collectionsConfig.nonce || config.nonce);

		if (!enabled) {
			return;
		}

		void loadLocations();
	}, [collectionsConfig.nonce, config.nonce, enabled, loadLocations]);

	const paginatedLocations = locations;
	const totalPages = Math.max(
		1,
		Math.ceil(totalItems / Math.max(1, view.perPage ?? DEFAULT_LOCATIONS_TABLE_PER_PAGE))
	);

	const persistLocationsPerPagePreference = useCallback(
		async (perPage: number): Promise<void> => {
			try {
				await updateLocationsSettings(config, { perPage });
			} catch (error) {
				setActionNotice({
					status: 'error',
					message:
						error instanceof Error
							? error.message
							: __('The locations page size could not be saved.', 'minimal-map'),
				});
			}
		},
		[config]
	);

	const tagsById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
	const logosById = useMemo(() => new Map(logos.map((logo) => [logo.id, logo])), [logos]);
	const markersById = useMemo(() => new Map(markers.map((marker) => [marker.id, marker])), [markers]);
	const locationsById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);

	const ensureCollectionLookups = useCallback(async (): Promise<CollectionRecord[]> => {
		if (collections.length > 0) {
			return collections;
		}

		const records = await fetchAllLocationLookupResource<CollectionRecord>(config, 'collections');
		setCollections(records);
		return records;
	}, [collections, config]);

	const ensureLogoLookups = useCallback(async (): Promise<LogoRecord[]> => {
		if (logos.length > 0) {
			return logos;
		}

		const records = await fetchAllLocationLookupResource<LogoRecord>(config, 'logos');
		setLogos(records);
		return records;
	}, [config, logos]);

	const ensureMarkerLookups = useCallback(async (): Promise<MarkerRecord[]> => {
		if (markers.length > 0) {
			return markers;
		}

		const records = await fetchAllLocationLookupResource<MarkerRecord>(config, 'markers');
		setMarkers(records);
		return records;
	}, [config, markers]);

	const ensureTagLookups = useCallback(async (): Promise<TagRecord[]> => {
		if (tags.length > 0) {
			return tags;
		}

		const records = await fetchAllLocationLookupResource<TagRecord>(config, 'tags');
		setTags(records);
		return records;
	}, [config, tags]);

	const getTagsForLocation = useCallback(
		(locationId: number): TagRecord[] => {
			const location = locations.find((loc) => loc.id === locationId);
			if (!location) {
				return [];
			}
			if (Array.isArray(location.tags_data) && location.tags_data.length > 0) {
				return location.tags_data;
			}
			return location.tag_ids
				.map((tagId) => tagsById.get(tagId))
				.filter((tag): tag is TagRecord => !!tag);
		},
		[locations, tagsById]
	);

	const getLogoForLocation = useCallback(
		(locationId: number): LogoRecord | null => {
			const location = locations.find((loc) => loc.id === locationId);
			if (!location) {
				return null;
			}

			if (location.logo) {
				return location.logo;
			}

			if (location.logo_id <= 0) {
				return null;
			}

			return logosById.get(location.logo_id) ?? null;
		},
		[locations, logosById]
	);

	const getMarkerForLocation = useCallback(
		(locationId: number): MarkerRecord | null => {
			const location = locations.find((loc) => loc.id === locationId);
			if (!location) {
				return null;
			}

			if (location.marker) {
				return location.marker;
			}

			if (location.marker_id <= 0) {
				return null;
			}

			return markersById.get(location.marker_id) ?? null;
		},
		[locations, markersById]
	);

	const normalizeLocationSelection = useCallback(
		(selectedLocations: LocationRecord | LocationRecord[]): LocationRecord[] =>
			Array.isArray(selectedLocations) ? selectedLocations : [selectedLocations],
		[]
	);

	const clearSelectionAfterBulkAction = useCallback((selectedLocations: LocationRecord[]): void => {
		if (selectedLocations.length > 1) {
			setSelection([]);
		}
	}, []);

	const onSetLocationVisibility = useCallback(
		async (selectedLocations: LocationRecord[], isHidden: boolean): Promise<void> => {
			if (selectedLocations.length === 0) {
				return;
			}

			const affectedLocations = selectedLocations.filter(
				(location) => location.is_hidden !== isHidden
			);

			setRowActionPending(true);
			setActionNotice(null);

			try {
				for (const location of affectedLocations) {
					await updateLocation(config, location.id, {
						...createLocationFormStateFromRecord(location),
						is_hidden: isHidden,
					});
				}

				if (affectedLocations.length > 0) {
					await loadLocations();
				}

				clearSelectionAfterBulkAction(selectedLocations);
				setActionNotice({
					status: 'success',
					message:
						affectedLocations.length === 0
							? isHidden
								? selectedLocations.length === 1
									? __('Location is already hidden.', 'minimal-map')
									: __('All selected locations are already hidden.', 'minimal-map')
								: selectedLocations.length === 1
									? __('Location is already shown.', 'minimal-map')
									: __('All selected locations are already shown.', 'minimal-map')
							: affectedLocations.length === 1
								? isHidden
									? __('Location hidden.', 'minimal-map')
									: __('Location shown.', 'minimal-map')
								: sprintf(
									isHidden
										? _n(
											'%d location hidden.',
											'%d locations hidden.',
											affectedLocations.length,
											'minimal-map'
										)
										: _n(
											'%d location shown.',
											'%d locations shown.',
											affectedLocations.length,
											'minimal-map'
										),
									affectedLocations.length
								),
				});
			} catch (error) {
				setActionNotice({
					status: 'error',
					message:
						error instanceof Error
							? error.message
							: __('Location visibility could not be updated.', 'minimal-map'),
				});
				throw error;
			} finally {
				setRowActionPending(false);
			}
		},
		[clearSelectionAfterBulkAction, config, loadLocations]
	);

	const resetModalState = useCallback((): void => {
		setFormMode('create');
		setEditingLocation(null);
		setOriginalForm(null);
		setForm(DEFAULT_FORM_STATE);
		setFieldErrors(createEmptyFieldErrors());
		setSubmitError(null);
		setGeocodeError(null);
		setGeocodeNotice(null);
		setMapCenter(null);
		setSelectedCoordinates(null);
		setStep('details');
	}, []);

	const resetMarkerColorModalState = useCallback((): void => {
		setEditingLocation(null);
		setSelectedMarkerColorLocations([]);
		setForm(DEFAULT_FORM_STATE);
		setSubmitError(null);
	}, []);

	const resetCustomCsvImportState = useCallback((): void => {
		setCustomCsvImportModalOpen(false);
		setCustomCsvImportStep('mapping');
		setPendingCsvImport(null);
		setCsvImportMapping(createEmptyCsvImportMapping());
		setCsvImportOpeningHoursMapping(createEmptyCsvOpeningHoursImportMapping());
		setCsvImportLogoId('');
		setCsvImportMarkerId('');
		setCsvImportTagIds([]);
		setCsvImportProgressCompleted(0);
		setCsvImportProgressTotal(0);
	}, []);

	const resetLocationImportProgressState = useCallback((): void => {
		setLocationImportProgressModalOpen(false);
		setCsvImportProgressCompleted(0);
		setCsvImportProgressTotal(0);
	}, []);

	const openLocationImportProgressModal = useCallback((total: number): void => {
		setCsvImportProgressCompleted(0);
		setCsvImportProgressTotal(total);
		setLocationImportProgressModalOpen(true);
	}, []);

	const resetDeleteAllLocationsState = useCallback((): void => {
		setDeleteAllLocationsModalOpen(false);
	}, []);

	const resetAssignToCollectionState = useCallback((): void => {
		setAssignToCollectionModalOpen(false);
		setSelectedAssignmentLocation(null);
		setAssignmentCollectionId('');
	}, []);

	const resetAssignLogoState = useCallback((): void => {
		setAssignLogoModalOpen(false);
		setSelectedLogoLocations([]);
		setAssignmentLogoId('');
	}, []);

	const resetAssignMarkerState = useCallback((): void => {
		setAssignMarkerModalOpen(false);
		setSelectedMarkerLocations([]);
		setAssignmentMarkerId('');
	}, []);

	const resetAssignTagsState = useCallback((): void => {
		setAssignTagsModalOpen(false);
		setSelectedTagsLocations([]);
		setAssignmentTagIds([]);
	}, []);

	const resetAssignOpeningHoursState = useCallback((): void => {
		setAssignOpeningHoursModalOpen(false);
		setSelectedOpeningHoursLocations([]);
		setForm((currentForm) => ({
			...currentForm,
			opening_hours: DEFAULT_FORM_STATE.opening_hours,
			opening_hours_notes: DEFAULT_FORM_STATE.opening_hours_notes,
		}));
		setFieldErrors(createEmptyFieldErrors());
	}, []);

	const closeAssignToCollectionModal = useCallback((): void => {
		if (isAssignmentSaving) {
			return;
		}

		resetAssignToCollectionState();
	}, [isAssignmentSaving, resetAssignToCollectionState]);

	const closeAssignLogoModal = useCallback((): void => {
		if (isAssignmentSaving) {
			return;
		}

		resetAssignLogoState();
	}, [isAssignmentSaving, resetAssignLogoState]);

	const closeAssignMarkerModal = useCallback((): void => {
		if (isAssignmentSaving) {
			return;
		}

		resetAssignMarkerState();
	}, [isAssignmentSaving, resetAssignMarkerState]);

	const closeAssignTagsModal = useCallback((): void => {
		if (isAssignmentSaving) {
			return;
		}

		resetAssignTagsState();
	}, [isAssignmentSaving, resetAssignTagsState]);

	const closeAssignOpeningHoursModal = useCallback((): void => {
		if (isAssignmentSaving) {
			return;
		}

		resetAssignOpeningHoursState();
	}, [isAssignmentSaving, resetAssignOpeningHoursState]);

	const resetDeleteLogoConfirmationState = useCallback((): void => {
		setDeleteLogoConfirmationModalOpen(false);
		setSelectedLogoRemovalLocations([]);
	}, []);

	const closeDeleteLogoConfirmationModal = useCallback((): void => {
		if (isAssignmentSaving) {
			return;
		}

		resetDeleteLogoConfirmationState();
	}, [isAssignmentSaving, resetDeleteLogoConfirmationState]);

	const resetRemoveMarkerConfirmationState = useCallback((): void => {
		setRemoveMarkerConfirmationModalOpen(false);
		setSelectedMarkerRemovalLocations([]);
	}, []);

	const closeRemoveMarkerConfirmationModal = useCallback((): void => {
		if (isAssignmentSaving) {
			return;
		}

		resetRemoveMarkerConfirmationState();
	}, [isAssignmentSaving, resetRemoveMarkerConfirmationState]);

	const resetRemoveTagsConfirmationState = useCallback((): void => {
		setRemoveTagsConfirmationModalOpen(false);
		setSelectedTagRemovalLocations([]);
	}, []);

	const resetShowLocationConfirmationState = useCallback((): void => {
		setShowLocationConfirmationModalOpen(false);
		setSelectedShownLocation(null);
	}, []);

	const closeRemoveTagsConfirmationModal = useCallback((): void => {
		if (isAssignmentSaving) {
			return;
		}

		resetRemoveTagsConfirmationState();
	}, [isAssignmentSaving, resetRemoveTagsConfirmationState]);

	const closeShowLocationConfirmationModal = useCallback((): void => {
		if (isRowActionPending) {
			return;
		}

		resetShowLocationConfirmationState();
	}, [isRowActionPending, resetShowLocationConfirmationState]);

	const resetRemoveCollectionAssignmentState = useCallback((): void => {
		setRemoveCollectionAssignmentModalOpen(false);
		setSelectedRemovalLocation(null);
		setSelectedRemovalCollection(null);
	}, []);

	const closeCustomCsvImportModal = useCallback((): void => {
		if (isImporting) {
			return;
		}

		resetCustomCsvImportState();
	}, [isImporting, resetCustomCsvImportState]);

	const closeLocationImportProgressModal = useCallback((): void => {
		if (isImporting) {
			return;
		}

		resetLocationImportProgressState();
	}, [isImporting, resetLocationImportProgressState]);

	const closeDeleteAllLocationsModal = useCallback((): void => {
		if (isDeletingAllLocations) {
			return;
		}

		resetDeleteAllLocationsState();
	}, [isDeletingAllLocations, resetDeleteAllLocationsState]);

	const closeRemoveCollectionAssignmentModal = useCallback((): void => {
		if (isRemovingCollectionAssignment) {
			return;
		}

		resetRemoveCollectionAssignmentState();
	}, [isRemovingCollectionAssignment, resetRemoveCollectionAssignmentState]);

	const openModal = useCallback((): void => {
		resetModalState();
		setModalOpen(true);
	}, [resetModalState]);

	const isAddLocationShortcutBlocked =
		isModalOpen ||
		isAssignToCollectionModalOpen ||
		isAssignLogoModalOpen ||
		isAssignMarkerModalOpen ||
		isAssignTagsModalOpen ||
		isAssignOpeningHoursModalOpen ||
		isDeleteLogoConfirmationModalOpen ||
		isRemoveMarkerConfirmationModalOpen ||
		isRemoveTagsConfirmationModalOpen ||
		isShowLocationConfirmationModalOpen ||
		isRemoveCollectionAssignmentModalOpen ||
		isCustomCsvImportModalOpen ||
		isDeleteAllLocationsModalOpen ||
		isSubmitting ||
		isGeocoding ||
		isImporting ||
		isExporting ||
		isDeletingAllLocations ||
		isRowActionPending;

	useSingleKeyShortcut({
		active: enabled,
		blocked: isAddLocationShortcutBlocked,
		key: 'n',
		onTrigger: openModal,
	});

	const onEditLocation = (location: LocationRecord): void => {
		const nextForm = createLocationFormStateFromRecord(location);
		const latitude = Number(location.latitude);
		const longitude = Number(location.longitude);
		const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
		const coordinates = hasCoordinates ? { lat: latitude, lng: longitude } : null;

		resetModalState();
		setFormMode('edit');
		setEditingLocation(location);
		setOriginalForm(nextForm);
		setForm(nextForm);
		setMapCenter(coordinates);
		setSelectedCoordinates(coordinates);
		setModalOpen(true);
	};

	const onCancel = (): void => {
		if (isSubmitting || isGeocoding) {
			return;
		}

		setModalOpen(false);
	};

	const onOpenMarkerColorModal = useCallback(
		(locations: LocationRecord | LocationRecord[]): void => {
			const locationsArray = Array.isArray(locations) ? locations : [locations];
			setSelectedMarkerColorLocations(locationsArray);

			if (locationsArray.length === 1) {
				setEditingLocation(locationsArray[0]);
				setForm(createLocationFormStateFromRecord(locationsArray[0]));
			} else {
				setEditingLocation(null);
				setForm({ ...DEFAULT_FORM_STATE, marker_color: '' });
			}

			setSubmitError(null);
			setMarkerColorModalOpen(true);
		},
		[]
	);

	const onCloseMarkerColorModal = useCallback((): void => {
		if (isSubmitting) {
			return;
		}

		setMarkerColorModalOpen(false);
		resetMarkerColorModalState();
	}, [isSubmitting, resetMarkerColorModalState]);

	const onConfirmMarkerColor = useCallback(async (): Promise<void> => {
		if (selectedMarkerColorLocations.length === 0) {
			return;
		}

		setSubmitting(true);
		setSubmitError(null);

		try {
			await Promise.all(
				selectedMarkerColorLocations.map((location) =>
					updateLocation(config, location.id, {
						...createLocationFormStateFromRecord(location),
						marker_color: form.marker_color,
					})
				)
			);
			await loadLocations();
			setMarkerColorModalOpen(false);
			clearSelectionAfterBulkAction(selectedMarkerColorLocations);
			resetMarkerColorModalState();
			setActionNotice({
				status: 'success',
				message:
					selectedMarkerColorLocations.length === 1
						? __('Marker color updated.', 'minimal-map')
						: __('Marker colors updated.', 'minimal-map'),
			});
		} catch (error) {
			setSubmitError(
				error instanceof Error
					? error.message
					: __('Marker color could not be updated.', 'minimal-map')
			);
		} finally {
			setSubmitting(false);
		}
	}, [
		clearSelectionAfterBulkAction,
		config,
		form.marker_color,
		loadLocations,
		resetMarkerColorModalState,
		selectedMarkerColorLocations,
	]);

	const onBack = (): void => {
		if (isSubmitting || isGeocoding) {
			return;
		}

		if (step === 'map') {
			setStep('address');
			return;
		}

		if (step === 'address') {
			setStep('opening_hours');
			return;
		}

		if (step === 'opening_hours') {
			setStep('social_media');
			return;
		}

		setStep('details');
	};

	const onChangeFormValue = (key: keyof LocationFormState, value: any): void => {
		setForm((currentForm) => ({
			...currentForm,
			[key]: value,
		}));

		setFieldErrors((currentErrors) => ({
			...currentErrors,
			[key]: undefined,
		}));

		if (
			key === 'street' ||
			key === 'house_number' ||
			key === 'postal_code' ||
			key === 'city' ||
			key === 'state' ||
			key === 'country'
		) {
			setGeocodeError(null);
			setGeocodeNotice(null);
		}
	};

	const onChangeOpeningHoursDayValue = (
		dayKey: OpeningHoursDayKey,
		field: keyof LocationOpeningHoursDay,
		value: string | number
	): void => {
		setForm((currentForm) => ({
			...currentForm,
			opening_hours: {
				...currentForm.opening_hours,
				[dayKey]: {
					...currentForm.opening_hours[dayKey],
					[field]:
						field === 'lunch_duration_minutes'
							? typeof value === 'number'
								? Math.max(0, value)
								: Math.max(0, Number.parseInt(`${value || 0}`, 10) || 0)
							: `${value}`,
				},
			},
		}));

		setFieldErrors((currentErrors) => ({
			...currentErrors,
			opening_hours: {
				...(currentErrors.opening_hours ?? {}),
				[dayKey]: undefined,
			},
		}));
	};

	const onChangeOpeningHoursNotes = (value: string): void => {
		setForm((currentForm) => ({
			...currentForm,
			opening_hours_notes: value,
		}));
	};

	const dismissActionNotice = useCallback((): void => {
		setActionNotice(null);
	}, []);

	const onOpenAssignToCollectionModal = useCallback((location: LocationRecord): void => {
		void ensureCollectionLookups().catch((error) => {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Collections could not be loaded.', 'minimal-map'),
			});
		});

		setSelectedAssignmentLocation(location);
		setAssignmentCollectionId('');
		setAssignToCollectionModalOpen(true);
	}, [ensureCollectionLookups]);

	const onOpenAssignLogoModal = useCallback((selectedLocations: LocationRecord | LocationRecord[]): void => {
		const nextLocations = normalizeLocationSelection(selectedLocations);

		if (nextLocations.length === 0) {
			return;
		}

		void ensureLogoLookups().catch((error) => {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Logos could not be loaded.', 'minimal-map'),
			});
		});

		setSelectedLogoLocations(nextLocations);
		setAssignmentLogoId('');
		setAssignLogoModalOpen(true);
	}, [ensureLogoLookups, normalizeLocationSelection]);

	const onOpenAssignMarkerModal = useCallback((selectedLocations: LocationRecord | LocationRecord[]): void => {
		const nextLocations = normalizeLocationSelection(selectedLocations);

		if (nextLocations.length === 0) {
			return;
		}

		void ensureMarkerLookups().catch((error) => {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Markers could not be loaded.', 'minimal-map'),
			});
		});

		setSelectedMarkerLocations(nextLocations);
		setAssignmentMarkerId('');
		setAssignMarkerModalOpen(true);
	}, [ensureMarkerLookups, normalizeLocationSelection]);

	const onOpenAssignTagsModal = useCallback((selectedLocations: LocationRecord | LocationRecord[]): void => {
		const nextLocations = normalizeLocationSelection(selectedLocations);

		if (nextLocations.length === 0) {
			return;
		}

		void ensureTagLookups().catch((error) => {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Tags could not be loaded.', 'minimal-map'),
			});
		});

		setSelectedTagsLocations(nextLocations);
		setAssignmentTagIds([]);
		setAssignTagsModalOpen(true);
	}, [ensureTagLookups, normalizeLocationSelection]);

	const onOpenAssignOpeningHoursModal = useCallback(
		(selectedLocations: LocationRecord | LocationRecord[]): void => {
			const nextLocations = normalizeLocationSelection(selectedLocations);

			if (nextLocations.length === 0) {
				return;
			}

			setSelectedOpeningHoursLocations(nextLocations);

			// Pre-fill with the first location's opening hours if only one location is selected
			if (nextLocations.length === 1) {
				setForm((currentForm) => ({
					...currentForm,
					opening_hours: nextLocations[0].opening_hours,
					opening_hours_notes: nextLocations[0].opening_hours_notes,
				}));
			} else {
				setForm((currentForm) => ({
					...currentForm,
					opening_hours: DEFAULT_FORM_STATE.opening_hours,
					opening_hours_notes: DEFAULT_FORM_STATE.opening_hours_notes,
				}));
			}

			setFieldErrors(createEmptyFieldErrors());
			setAssignOpeningHoursModalOpen(true);
		},
		[normalizeLocationSelection]
	);

	const onOpenDeleteLogoConfirmationModal = useCallback((selectedLocations: LocationRecord | LocationRecord[]): void => {
		const nextLocations = normalizeLocationSelection(selectedLocations);

		if (nextLocations.length === 0) {
			return;
		}

		setSelectedLogoRemovalLocations(nextLocations);
		setDeleteLogoConfirmationModalOpen(true);
	}, [normalizeLocationSelection]);

	const onOpenRemoveMarkerConfirmationModal = useCallback((selectedLocations: LocationRecord[]): void => {
		if (selectedLocations.length === 0) {
			return;
		}

		setSelectedMarkerRemovalLocations(selectedLocations);
		setRemoveMarkerConfirmationModalOpen(true);
	}, []);

	const onOpenRemoveTagsConfirmationModal = useCallback((selectedLocations: LocationRecord[]): void => {
		if (selectedLocations.length === 0) {
			return;
		}

		setSelectedTagRemovalLocations(selectedLocations);
		setRemoveTagsConfirmationModalOpen(true);
	}, []);

	const onOpenShowLocationConfirmationModal = useCallback((location: LocationRecord): void => {
		if (isRowActionPending || !location.is_hidden) {
			return;
		}

		setSelectedShownLocation(location);
		setShowLocationConfirmationModalOpen(true);
	}, [isRowActionPending]);

	const onOpenDeleteAllLocationsModal = useCallback((): void => {
		if (
			totalItems === 0 ||
			isRowActionPending ||
			isImporting ||
			isExporting ||
			isDeletingAllLocations
		) {
			return;
		}

		setDeleteAllLocationsModalOpen(true);
	}, [isDeletingAllLocations, isExporting, isImporting, isRowActionPending, totalItems]);

	const onConfirmShowLocation = useCallback(async (): Promise<void> => {
		if (!selectedShownLocation) {
			return;
		}

		await onSetLocationVisibility([selectedShownLocation], false);
		resetShowLocationConfirmationState();
	}, [
		onSetLocationVisibility,
		resetShowLocationConfirmationState,
		selectedShownLocation,
	]);

	const assignLogoToLocations = useCallback(
		async (
			targetLocations: LocationRecord[],
			logoId: number,
			onSuccess?: () => void
		): Promise<void> => {
			if (targetLocations.length === 0 || logoId <= 0) {
				return;
			}

			setAssignmentSaving(true);
			setActionNotice(null);

			try {
				for (const location of targetLocations) {
					await updateLocation(config, location.id, {
						...createLocationFormStateFromRecord(location),
						logo_id: logoId,
					});
				}
				await loadLocations();
				clearSelectionAfterBulkAction(targetLocations);
				setActionNotice({
					status: 'success',
					message:
						targetLocations.length === 1
							? __('Logo assigned to location.', 'minimal-map')
							: sprintf(
								_n(
									'%d location updated with a logo.',
									'%d locations updated with a logo.',
									targetLocations.length,
									'minimal-map'
								),
								targetLocations.length
							),
				});
				onSuccess?.();
			} catch (error) {
				setActionNotice({
					status: 'error',
					message:
						error instanceof Error
							? error.message
							: __('Location logos could not be updated.', 'minimal-map'),
				});
			} finally {
				setAssignmentSaving(false);
			}
		},
		[clearSelectionAfterBulkAction, config, loadLocations]
	);

	const assignMarkerToLocations = useCallback(
		async (
			targetLocations: LocationRecord[],
			markerId: number,
			onSuccess?: () => void
		): Promise<void> => {
			if (targetLocations.length === 0 || markerId <= 0) {
				return;
			}

			setAssignmentSaving(true);
			setActionNotice(null);

			try {
				for (const location of targetLocations) {
					await updateLocation(config, location.id, {
						...createLocationFormStateFromRecord(location),
						marker_id: markerId,
					});
				}
				await loadLocations();
				clearSelectionAfterBulkAction(targetLocations);
				setActionNotice({
					status: 'success',
					message:
						targetLocations.length === 1
							? __('Marker assigned to location.', 'minimal-map')
							: sprintf(
								_n(
									'%d location updated with a marker.',
									'%d locations updated with a marker.',
									targetLocations.length,
									'minimal-map'
								),
								targetLocations.length
							),
				});
				onSuccess?.();
			} catch (error) {
				setActionNotice({
					status: 'error',
					message:
						error instanceof Error
							? error.message
							: __('Location markers could not be updated.', 'minimal-map'),
				});
			} finally {
				setAssignmentSaving(false);
			}
		},
		[clearSelectionAfterBulkAction, config, loadLocations]
	);

	const assignTagsToLocations = useCallback(
		async (
			targetLocations: LocationRecord[],
			tagIds: number[],
			onSuccess?: () => void
		): Promise<void> => {
			if (targetLocations.length === 0 || tagIds.length === 0) {
				return;
			}

			setAssignmentSaving(true);
			setActionNotice(null);

			try {
				for (const location of targetLocations) {
					await updateLocation(config, location.id, {
						...createLocationFormStateFromRecord(location),
						tag_ids: mergeLocationTagIds(location.tag_ids, tagIds),
					});
				}
				await loadLocations();
				clearSelectionAfterBulkAction(targetLocations);
				setActionNotice({
					status: 'success',
					message:
						targetLocations.length === 1
							? __('Tags added to location.', 'minimal-map')
							: sprintf(
								_n(
									'%d location updated with new tags.',
									'%d locations updated with new tags.',
									targetLocations.length,
									'minimal-map'
								),
								targetLocations.length
							),
				});
				onSuccess?.();
			} catch (error) {
				setActionNotice({
					status: 'error',
					message:
						error instanceof Error
							? error.message
							: __('Location tags could not be updated.', 'minimal-map'),
				});
			} finally {
				setAssignmentSaving(false);
			}
		},
		[clearSelectionAfterBulkAction, config, loadLocations]
	);

	const onAssignLogoToLocation = useCallback(async (): Promise<void> => {
		if (selectedLogoLocations.length === 0 || !assignmentLogoId) {
			return;
		}

		await assignLogoToLocations(
			selectedLogoLocations,
			Number(assignmentLogoId),
			resetAssignLogoState
		);
	}, [
		assignLogoToLocations,
		assignmentLogoId,
		resetAssignLogoState,
		selectedLogoLocations,
	]);

	const onAssignMarkerToLocation = useCallback(async (): Promise<void> => {
		if (selectedMarkerLocations.length === 0 || !assignmentMarkerId) {
			return;
		}

		await assignMarkerToLocations(
			selectedMarkerLocations,
			Number(assignmentMarkerId),
			resetAssignMarkerState
		);
	}, [
		assignMarkerToLocations,
		assignmentMarkerId,
		resetAssignMarkerState,
		selectedMarkerLocations,
	]);

	const onAssignTagsToLocation = useCallback(async (): Promise<void> => {
		if (selectedTagsLocations.length === 0 || assignmentTagIds.length === 0) {
			return;
		}

		await assignTagsToLocations(selectedTagsLocations, assignmentTagIds, resetAssignTagsState);
	}, [
		assignmentTagIds,
		assignTagsToLocations,
		resetAssignTagsState,
		selectedTagsLocations,
	]);

	const onAssignOpeningHoursToLocations = useCallback(async (): Promise<void> => {
		if (selectedOpeningHoursLocations.length === 0) {
			return;
		}

		const errors = validateOpeningHoursStep(form);
		setFieldErrors(errors);

		if (hasFieldErrors(errors)) {
			return;
		}

		setAssignmentSaving(true);
		setActionNotice(null);

		try {
			for (const location of selectedOpeningHoursLocations) {
				await updateLocation(config, location.id, {
					...createLocationFormStateFromRecord(location),
					opening_hours: form.opening_hours,
					opening_hours_notes: form.opening_hours_notes,
				});
			}
			await loadLocations();
			clearSelectionAfterBulkAction(selectedOpeningHoursLocations);
			setActionNotice({
				status: 'success',
				message:
					selectedOpeningHoursLocations.length === 1
						? __('Opening hours updated.', 'minimal-map')
						: sprintf(
								_n(
									'%d location updated with new opening hours.',
									'%d locations updated with new opening hours.',
									selectedOpeningHoursLocations.length,
									'minimal-map'
								),
								selectedOpeningHoursLocations.length
						  ),
			});
			resetAssignOpeningHoursState();
		} catch (error) {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Opening hours could not be updated.', 'minimal-map'),
			});
		} finally {
			setAssignmentSaving(false);
		}
	}, [
		clearSelectionAfterBulkAction,
		config,
		form.opening_hours,
		form.opening_hours_notes,
		loadLocations,
		resetAssignOpeningHoursState,
		selectedOpeningHoursLocations,
	]);

	const onQuickAssignLogo = useCallback(
		async (location: LocationRecord, logoId: number): Promise<void> => {
			await assignLogoToLocations([location], logoId);
		},
		[assignLogoToLocations]
	);

	const onQuickAssignMarker = useCallback(
		async (location: LocationRecord, markerId: number): Promise<void> => {
			await assignMarkerToLocations([location], markerId);
		},
		[assignMarkerToLocations]
	);

	const onQuickAssignTag = useCallback(
		async (location: LocationRecord, tagId: number): Promise<void> => {
			await assignTagsToLocations([location], [tagId]);
		},
		[assignTagsToLocations]
	);

	const onClearLogosFromLocations = useCallback(async (): Promise<void> => {
		if (selectedLogoRemovalLocations.length === 0) {
			return;
		}

		const affectedLocations = getLocationsWithAssignedLogos(selectedLogoRemovalLocations);

		setAssignmentSaving(true);
		setActionNotice(null);

		try {
			if (affectedLocations.length > 0) {
				for (const location of affectedLocations) {
					await updateLocation(config, location.id, {
						...createLocationFormStateFromRecord(location),
						logo_id: 0,
					});
				}
				await loadLocations();
			}
			clearSelectionAfterBulkAction(selectedLogoRemovalLocations);
			setActionNotice({
				status: 'success',
				message:
					affectedLocations.length === 0
						? selectedLogoRemovalLocations.length === 1
							? __('The selected location already has no logo assigned.', 'minimal-map')
							: __('None of the selected locations have logos assigned.', 'minimal-map')
						: affectedLocations.length === 1
							? __('Logo removed from location.', 'minimal-map')
							: sprintf(
								_n('%d location cleared of its logo.', '%d locations cleared of their logos.', affectedLocations.length, 'minimal-map'),
								affectedLocations.length
							),
			});
			resetDeleteLogoConfirmationState();
		} catch (error) {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Logos could not be removed from the selected locations.', 'minimal-map'),
			});
		} finally {
			setAssignmentSaving(false);
		}
	}, [
		clearSelectionAfterBulkAction,
		config,
		loadLocations,
		resetDeleteLogoConfirmationState,
		selectedLogoRemovalLocations,
	]);

	const onClearMarkersFromLocations = useCallback(async (): Promise<void> => {
		if (selectedMarkerRemovalLocations.length === 0) {
			return;
		}

		const affectedLocations = getLocationsWithAssignedMarkers(selectedMarkerRemovalLocations);

		setAssignmentSaving(true);
		setActionNotice(null);

		try {
			if (affectedLocations.length > 0) {
				for (const location of affectedLocations) {
					await updateLocation(config, location.id, {
						...createLocationFormStateFromRecord(location),
						marker_id: 0,
					});
				}
				await loadLocations();
			}
			clearSelectionAfterBulkAction(selectedMarkerRemovalLocations);
			setActionNotice({
				status: 'success',
				message:
					affectedLocations.length === 0
						? selectedMarkerRemovalLocations.length === 1
							? __('The selected location already has no marker assigned.', 'minimal-map')
							: __('None of the selected locations have custom markers assigned.', 'minimal-map')
						: affectedLocations.length === 1
							? __('Marker removed from location.', 'minimal-map')
							: sprintf(
								_n('%d location cleared of its marker.', '%d locations cleared of their markers.', affectedLocations.length, 'minimal-map'),
								affectedLocations.length
							),
			});
			resetRemoveMarkerConfirmationState();
		} catch (error) {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Markers could not be removed from the selected locations.', 'minimal-map'),
			});
		} finally {
			setAssignmentSaving(false);
		}
	}, [
		clearSelectionAfterBulkAction,
		config,
		loadLocations,
		resetRemoveMarkerConfirmationState,
		selectedMarkerRemovalLocations,
	]);

	const onClearTagsFromLocations = useCallback(async (): Promise<void> => {
		if (selectedTagRemovalLocations.length === 0) {
			return;
		}

		const affectedLocations = getLocationsWithAssignedTags(selectedTagRemovalLocations);

		setAssignmentSaving(true);
		setActionNotice(null);

		try {
			if (affectedLocations.length > 0) {
				for (const location of affectedLocations) {
					await updateLocation(config, location.id, {
						...createLocationFormStateFromRecord(location),
						tag_ids: [],
					});
				}
				await loadLocations();
			}
			clearSelectionAfterBulkAction(selectedTagRemovalLocations);
			setActionNotice({
				status: 'success',
				message:
					affectedLocations.length === 0
						? selectedTagRemovalLocations.length === 1
							? __('The selected location already has no tags assigned.', 'minimal-map')
							: __('None of the selected locations have tags assigned.', 'minimal-map')
						: affectedLocations.length === 1
							? __('Tags removed from location.', 'minimal-map')
							: sprintf(
								_n('%d location cleared of its tags.', '%d locations cleared of their tags.', affectedLocations.length, 'minimal-map'),
								affectedLocations.length
							),
			});
			resetRemoveTagsConfirmationState();
		} catch (error) {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Tags could not be removed from the selected locations.', 'minimal-map'),
			});
		} finally {
			setAssignmentSaving(false);
		}
	}, [
		clearSelectionAfterBulkAction,
		config,
		loadLocations,
		resetRemoveTagsConfirmationState,
		selectedTagRemovalLocations,
	]);

	const onOpenRemoveCollectionAssignmentModal = useCallback(
		(location: LocationRecord, collection: CollectionRecord): void => {
			setSelectedRemovalLocation(location);
			setSelectedRemovalCollection(collection);
			setRemoveCollectionAssignmentModalOpen(true);
		},
		[]
	);

	const getCollectionsForLocation = useCallback(
		(locationId: number): CollectionRecord[] => {
			const location = locationsById.get(locationId);

			if (location?.collections?.length) {
				return location.collections;
			}

			return collections.filter((collection) => collection.location_ids.includes(locationId));
		},
		[collections, locationsById]
	);

	const onDuplicateLocation = useCallback(
		async (location: LocationRecord): Promise<void> => {
			setRowActionPending(true);
			setActionNotice(null);

			try {
				await duplicateLocation(
					config,
					location,
					(await fetchAllLocations(config)).map((item) => item.title)
				);
				await loadLocations();
				setActionNotice({
					status: 'success',
					message: __('Location duplicated.', 'minimal-map'),
				});
			} catch (error) {
				setActionNotice({
					status: 'error',
					message:
						error instanceof Error
							? error.message
							: __('Location could not be duplicated.', 'minimal-map'),
				});
				throw error;
			} finally {
				setRowActionPending(false);
			}
		},
		[config, loadLocations]
	);

	const onRetrieveLocation = useCallback(
		async (location: LocationRecord): Promise<void> => {
			const errors = validateAddressStep(location);
			const validationMessage = Object.values(errors).find(Boolean);

			if (validationMessage) {
				const error = new Error(validationMessage);
				setActionNotice({
					status: 'error',
					message: validationMessage,
				});
				throw error;
			}

			setRowActionPending(true);
			setActionNotice(null);

			try {
				const result = await geocodeAddress(config, location);

				if (!result.success) {
					const error = new Error(result.message);
					setActionNotice({
						status: 'error',
						message: result.message,
					});
					throw error;
				}

				await updateLocationCoordinates(config, location.id, {
					lat: result.lat,
					lng: result.lng,
				});
				await loadLocations();
				setActionNotice({
					status: 'success',
					message: __('Location coordinates updated.', 'minimal-map'),
				});
			} catch (error) {
				if (!(error instanceof Error && error.message === validationMessage)) {
					setActionNotice({
						status: 'error',
						message:
							error instanceof Error
								? error.message
								: __('Location could not be retrieved.', 'minimal-map'),
					});
				}
				throw error;
			} finally {
				setRowActionPending(false);
			}
		},
		[config, loadLocations]
	);

	const onDeleteLocation = useCallback(
		async (location: LocationRecord): Promise<void> => {
			setRowActionPending(true);
			setActionNotice(null);

			try {
				await deleteLocation(config, location.id);
				await loadLocations();
				setActionNotice({
					status: 'success',
					message: __('Location deleted.', 'minimal-map'),
				});
			} catch (error) {
				setActionNotice({
					status: 'error',
					message:
						error instanceof Error
							? error.message
							: __('Location could not be deleted.', 'minimal-map'),
				});
				throw error;
			} finally {
				setRowActionPending(false);
			}
		},
		[config, loadLocations]
	);

	const onDeleteLocations = useCallback(
		async (items: LocationRecord[]): Promise<void> => {
			setRowActionPending(true);
			setActionNotice(null);

			try {
				for (const item of items) {
					await deleteLocation(config, item.id);
				}
				await loadLocations();
				setActionNotice({
					status: 'success',
					message:
						items.length === 1
							? __('Location deleted.', 'minimal-map')
							: sprintf(
								_n( '%d location deleted.', '%d locations deleted.', items.length, 'minimal-map' ),
								items.length
							),
				});
			} catch (error) {
				setActionNotice({
					status: 'error',
					message:
						error instanceof Error
							? error.message
							: __('Locations could not be deleted.', 'minimal-map'),
				});
				throw error;
			} finally {
				setRowActionPending(false);
			}
		},
		[config, loadLocations]
	);

	const onDeleteAllLocations = useCallback(async (): Promise<void> => {
		if (totalItems === 0) {
			resetDeleteAllLocationsState();
			return;
		}

		setDeletingAllLocations(true);
		setRowActionPending(true);
		setActionNotice(null);

		try {
			const allLocations = await fetchAllLocations(config);

			for (const location of allLocations) {
				await deleteLocation(config, location.id);
			}
			await loadLocations();
			setSelection([]);
			resetDeleteAllLocationsState();
			setActionNotice({
				status: 'success',
				message: sprintf(
					_n(
						'%d location deleted.',
						'%d locations deleted.',
						allLocations.length,
						'minimal-map'
					),
					allLocations.length
				),
			});
		} catch (error) {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Locations could not be deleted.', 'minimal-map'),
			});
			throw error;
		} finally {
			setDeletingAllLocations(false);
			setRowActionPending(false);
		}
	}, [config, loadLocations, resetDeleteAllLocationsState, totalItems]);

	const onAssignLocationToCollection = useCallback(async (): Promise<void> => {
		if (!selectedAssignmentLocation || !assignmentCollectionId) {
			return;
		}

		const collectionId = Number(assignmentCollectionId);
		const availableCollections = await ensureCollectionLookups();
		const selectedCollection = availableCollections.find((collection) => collection.id === collectionId);

		if (!selectedCollection) {
			setActionNotice({
				status: 'error',
				message: __('Selected collection could not be found.', 'minimal-map'),
			});
			return;
		}

		if (selectedCollection.location_ids.includes(selectedAssignmentLocation.id)) {
			setActionNotice({
				status: 'success',
				message: __('Location is already assigned to that collection.', 'minimal-map'),
			});
			resetAssignToCollectionState();
			return;
		}

		setAssignmentSaving(true);
		setActionNotice(null);

		try {
			await updateCollection(
				collectionsConfig,
				selectedCollection.id,
				selectedCollection.title,
				Array.from(new Set([...selectedCollection.location_ids, selectedAssignmentLocation.id]))
			);
			await loadLocations();
			setActionNotice({
				status: 'success',
				message: __('Location assigned to collection.', 'minimal-map'),
			});
			resetAssignToCollectionState();
		} catch (error) {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Location could not be assigned to the collection.', 'minimal-map'),
			});
		} finally {
			setAssignmentSaving(false);
		}
	}, [
		assignmentCollectionId,
		collectionsConfig,
		ensureCollectionLookups,
		loadLocations,
		resetAssignToCollectionState,
		selectedAssignmentLocation,
	]);

	const onRemoveCollectionAssignment = useCallback(async (): Promise<void> => {
		if (!selectedRemovalLocation || !selectedRemovalCollection) {
			return;
		}

		setRemovingCollectionAssignment(true);
		setActionNotice(null);

		try {
			await updateCollection(
				collectionsConfig,
				selectedRemovalCollection.id,
				selectedRemovalCollection.title,
				selectedRemovalCollection.location_ids.filter(
					(locationId) => locationId !== selectedRemovalLocation.id
				)
			);
			await loadLocations();
			setActionNotice({
				status: 'success',
				message: __('Collection removed from location.', 'minimal-map'),
			});
			resetRemoveCollectionAssignmentState();
		} catch (error) {
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Collection could not be removed from the location.', 'minimal-map'),
			});
		} finally {
			setRemovingCollectionAssignment(false);
		}
	}, [
		collectionsConfig,
		loadLocations,
		resetRemoveCollectionAssignmentState,
		selectedRemovalCollection,
		selectedRemovalLocation,
	]);

	const onMapLocationSelect = useCallback((coordinates: MapCoordinates): void => {
		setSelectedCoordinates(coordinates);
		setMapCenter(coordinates);
		setForm((currentForm) => ({
			...currentForm,
			latitude: `${coordinates.lat}`,
			longitude: `${coordinates.lng}`,
		}));
		setSubmitError(null);
		setGeocodeError(null);
	}, []);

	const onConfirm = useCallback(async (): Promise<void> => {
		if (step === 'details') {
			const errors = validateDetailsStep(form);
			setFieldErrors(errors);

			if (hasFieldErrors(errors)) {
				return;
			}

			setSubmitError(null);
			setStep('social_media');
			return;
		}

		if (step === 'social_media') {
			setSubmitError(null);
			setStep('opening_hours');
			return;
		}

		if (step === 'opening_hours') {
			const errors = validateOpeningHoursStep(form);
			setFieldErrors(errors);

			if (hasFieldErrors(errors)) {
				return;
			}

			setSubmitError(null);
			setStep('address');
			return;
		}

		if (step === 'address') {
			const errors = {
				...validateDetailsStep(form),
				...validateOpeningHoursStep(form),
				...validateAddressStep(form),
			};
			setFieldErrors(errors);

			if (hasFieldErrors(errors)) {
				return;
			}

			if (formMode === 'edit' && !hasLocationAddressChanged(form, originalForm)) {
				const latitude = Number(originalForm?.latitude ?? '');
				const longitude = Number(originalForm?.longitude ?? '');
				const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
				const coordinates = hasCoordinates ? { lat: latitude, lng: longitude } : null;

				setSubmitError(null);
				setGeocodeError(null);
				setGeocodeNotice(null);
				setMapCenter(coordinates ?? DEFAULT_MAP_CENTER);
				setSelectedCoordinates(coordinates);
				setForm((currentForm) => ({
					...currentForm,
					latitude: coordinates ? `${coordinates.lat}` : '',
					longitude: coordinates ? `${coordinates.lng}` : '',
				}));
				setStep('map');
				return;
			}

			setGeocoding(true);
			setSubmitError(null);
			setGeocodeError(null);
			setGeocodeNotice(null);

			try {
				const result = await geocodeAddress(config, form);

				if (result.success) {
					const coordinates = { lat: result.lat, lng: result.lng };
					setMapCenter(coordinates);
					setSelectedCoordinates(coordinates);
					setForm((currentForm) => ({
						...currentForm,
						latitude: `${result.lat}`,
						longitude: `${result.lng}`,
					}));
					if (result.label) {
						setGeocodeNotice(result.label);
					}
				} else {
					setMapCenter(DEFAULT_MAP_CENTER);
					setSelectedCoordinates(null);
					setForm((currentForm) => ({
						...currentForm,
						latitude: '',
						longitude: '',
					}));
					setGeocodeError(result.message);
				}
			} catch (error) {
				setMapCenter(DEFAULT_MAP_CENTER);
				setSelectedCoordinates(null);
				setForm((currentForm) => ({
					...currentForm,
					latitude: '',
					longitude: '',
				}));
				setGeocodeError(
					error instanceof Error
						? error.message
						: __(
								'The address could not be geocoded right now. Select the location manually on the map.',
								'minimal-map'
						  )
				);
			} finally {
				setGeocoding(false);
				setStep('map');
			}

			return;
		}

		if (!selectedCoordinates) {
			setSubmitError(__('Select a location on the map before finishing.', 'minimal-map'));
			return;
		}

		setSubmitting(true);
		setSubmitError(null);

		try {
			const nextForm = {
				...form,
				latitude: `${selectedCoordinates.lat}`,
				longitude: `${selectedCoordinates.lng}`,
			};

			if (formMode === 'edit' && editingLocation) {
				await updateLocation(config, editingLocation.id, nextForm);
			} else {
				await createLocation(config, nextForm);
			}
			await loadLocations();
			setModalOpen(false);
			resetModalState();
		} catch (error) {
			setSubmitError(
				error instanceof Error
					? error.message
					: formMode === 'edit'
						? __('Location could not be updated.', 'minimal-map')
						: __('Location could not be created.', 'minimal-map')
			);
		} finally {
			setSubmitting(false);
		}
	}, [
		step,
		form,
		formMode,
		originalForm,
		config,
		loadLocations,
		editingLocation,
		selectedCoordinates,
	]);

	const onChangeCsvImportMapping = useCallback(
		(field: keyof CsvImportMapping, columnIndex: string): void => {
			setCsvImportMapping((currentMapping) => ({
				...currentMapping,
				[field]: columnIndex === '' ? null : Number(columnIndex),
			}));
		},
		[]
	);

	const onChangeCsvImportOpeningHoursMapping = useCallback(
		(field: keyof CsvOpeningHoursImportMapping, columnIndex: string): void => {
			setCsvImportOpeningHoursMapping((currentMapping) => ({
				...currentMapping,
				[field]: columnIndex === '' ? null : Number(columnIndex),
			}));
		},
		[]
	);

	const onAdvanceCustomCsvImportStep = useCallback((): void => {
		setCustomCsvImportStep((currentStep) =>
			currentStep === 'mapping' ? 'opening_hours' : currentStep
		);
	}, []);

	const onBackCustomCsvImportStep = useCallback((): void => {
		setCustomCsvImportStep((currentStep) =>
			currentStep === 'opening_hours' ? 'mapping' : currentStep
		);
	}, []);

	const onImportLocations = useCallback(async (file: File) => {
		setActionNotice(null);

		try {
			const parsedData = await parseLocationImportFile(file);
			const [logoRecords, markerRecords, tagRecords] = await Promise.all([
				ensureLogoLookups(),
				ensureMarkerLookups(),
				ensureTagLookups(),
			]);

			if (isCommonCsvFormat(parsedData)) {
				openLocationImportProgressModal(parsedData.rows.length);
				setIsImporting(true);

				try {
					const result = await runCommonCsvImport(parsedData, config, collectionsConfig, {
						logos: logoRecords,
						markers: markerRecords,
						tags: tagRecords,
						onProgress: (completed, total) => {
							setCsvImportProgressCompleted(completed);
							setCsvImportProgressTotal(total);
						},
					});

					await loadLocations();
					setActionNotice({
						status: 'success',
						message: sprintf(
							_n(
								'%d location imported and assigned to a new collection.',
								'%d locations imported and assigned to a new collection.',
								result.importedCount,
								'minimal-map'
							),
							result.importedCount
						),
					});
				} finally {
					resetLocationImportProgressState();
					setIsImporting(false);
				}

				return;
			}

			resetCustomCsvImportState();
			setPendingCsvImport(parsedData);
			setCustomCsvImportStep('mapping');
			setCustomCsvImportModalOpen(true);
		} catch (error) {
			setActionNotice({
				status: 'error',
				message: error instanceof Error ? error.message : __('Failed to import locations.', 'minimal-map'),
			});
		}
	}, [
		collectionsConfig,
		config,
		ensureLogoLookups,
		ensureMarkerLookups,
		ensureTagLookups,
		loadLocations,
		openLocationImportProgressModal,
		resetCustomCsvImportState,
		resetLocationImportProgressState,
	]);

	const onStartCustomCsvImport = useCallback(async (): Promise<void> => {
		if (!pendingCsvImport) {
			return;
		}

		const csvImportAssignments: CsvImportAssignments = {
			...createEmptyCsvImportAssignments(),
			logoId: csvImportLogoId === '' ? 0 : Number(csvImportLogoId),
			markerId: csvImportMarkerId === '' ? 0 : Number(csvImportMarkerId),
			tagIds: csvImportTagIds,
		};

		setActionNotice(null);
		setCustomCsvImportModalOpen(false);
		openLocationImportProgressModal(pendingCsvImport.rows.length);
		setIsImporting(true);

		try {
			const result = await runMappedCsvImport(
				pendingCsvImport,
				csvImportMapping,
				csvImportOpeningHoursMapping,
				csvImportAssignments,
				config,
				collectionsConfig,
				{
					onProgress: (completed, total) => {
						setCsvImportProgressCompleted(completed);
						setCsvImportProgressTotal(total);
					},
				}
			);

			await loadLocations();
			setActionNotice({
				status: 'success',
				message: sprintf(
					_n(
						'%d location imported and assigned to a new collection.',
						'%d locations imported and assigned to a new collection.',
						result.importedCount,
						'minimal-map'
					),
					result.importedCount
				),
			});
			resetCustomCsvImportState();
			resetLocationImportProgressState();
		} catch (error) {
			resetCustomCsvImportState();
			resetLocationImportProgressState();
			setActionNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Failed to import locations.', 'minimal-map'),
			});
		} finally {
			setIsImporting(false);
		}
	}, [
		collectionsConfig,
		config,
		csvImportLogoId,
		csvImportMapping,
		csvImportOpeningHoursMapping,
		csvImportMarkerId,
		csvImportTagIds,
		loadLocations,
		openLocationImportProgressModal,
		pendingCsvImport,
		resetCustomCsvImportState,
		resetLocationImportProgressState,
	]);

	const csvImportColumnOptions = useMemo(
		() => buildCsvImportColumnOptions(pendingCsvImport),
		[pendingCsvImport]
	);

	const csvImportOpeningHoursColumnOptions = useMemo(() => {
		if (!pendingCsvImport) {
			return buildCsvImportColumnOptions(null);
		}

		const validColumnIndexes = getValidCsvOpeningHoursColumnIndexes(
			pendingCsvImport.rows,
			pendingCsvImport.headers.length
		);

		return buildCsvImportColumnOptions(pendingCsvImport, validColumnIndexes);
	}, [pendingCsvImport]);

	const exportAllLocations = useCallback(async (format: 'csv' | 'xlsx' | 'json'): Promise<void> => {
		if (totalItems === 0) {
			return;
		}

		setIsExporting(true);
		setActionNotice(null);

		try {
			await exportLocationsFile(format, {
				nonce: config.nonce,
				locationsRestPath: config.restPath,
				logosRestPath: logosConfig.restPath,
				markersRestPath: markersConfig.restPath,
				tagsRestPath: tagsConfig.restPath,
			});
		} catch (error) {
			setActionNotice({
				status: 'error',
				message: getLocationsExportErrorMessage(error),
			});
		} finally {
			setIsExporting(false);
		}
	}, [config, logosConfig, markersConfig, tagsConfig, totalItems]);

	const onExportLocations = useCallback(() => {
		void exportAllLocations('csv');
	}, [exportAllLocations]);

	const onExportExcel = useCallback(() => {
		void exportAllLocations('xlsx');
	}, [exportAllLocations]);

	const onExportJson = useCallback(() => {
		void exportAllLocations('json');
	}, [exportAllLocations]);

	const onExportExample = useCallback(() => {
		const csvContent = buildLocationExportCsv(createExampleLocationExportData());
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		triggerFileDownload(url, buildTimestampedFileName('minimal-map-example', 'csv'));
	}, []);

	const onExportExampleExcel = useCallback(async () => {
		const { headers, rows } = createExampleLocationExportData();
		const { exportToExcel } = await import('../../lib/locations/excel');
		exportToExcel(headers, rows, 'minimal-map-example.xlsx');
	}, []);

	const onExportExampleJson = useCallback(() => {
		const jsonContent = buildLocationExportJson(createExampleLocationExportData());
		const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		triggerFileDownload(url, buildTimestampedFileName('minimal-map-example', 'json'));
	}, []);

	return {
		actionNotice,
		activeTheme: themeData.activeTheme,
		assignmentCollectionId,
		assignmentLogoId,
		assignmentMarkerId,
		assignmentTagIds,
		csvImportColumnOptions,
		csvImportHeaders: pendingCsvImport?.headers ?? [],
		csvImportLogoId,
		csvImportMarkerId,
		csvImportOpeningHoursColumnOptions,
		csvImportOpeningHoursMapping,
		csvImportRows: pendingCsvImport?.rows ?? [],
		csvImportTagIds,
		csvImportMapping,
		csvImportProgressCompleted,
		csvImportProgressTotal,
		csvImportStep: customCsvImportStep,
		collections,
		logos,
		markers,
		tags,
		editingLocation,
		dismissActionNotice,
		fieldErrors,
		form,
		formMode,
		getCollectionsForLocation,
		getLogoForLocation,
		getMarkerForLocation,
		getTagsForLocation,
		geocodeError,
		geocodeNotice,
		headerAction: enabled ? (
			<div className="minimal-map-admin__header-actions-group">
				<div className="minimal-map-admin__header-actions-group">
						<Button
							variant="tertiary"
						icon={<BrushCleaning size={18} strokeWidth={2} />}
						label={__('Delete all locations', 'minimal-map')}
						onClick={onOpenDeleteAllLocationsModal}
						disabled={
							totalItems === 0 ||
							isDeletingAllLocations ||
							isRowActionPending ||
							isImporting ||
							isExporting
							}
							__next40pxDefaultSize
						/>
					<ImportLocationsButton onImport={onImportLocations} isImporting={isImporting} />
					<ExportLocationsDropdown
						onExport={onExportLocations}
						onExportExcel={onExportExcel}
						onExportJson={onExportJson}
						onExportExample={onExportExample}
						onExportExampleExcel={onExportExampleExcel}
						onExportExampleJson={onExportExampleJson}
					/>
				</div>
				<Button
					variant="primary"
					onClick={openModal}
					icon={<Plus size={18} strokeWidth={2} />}
					iconPosition="left"
					aria-keyshortcuts={getShortcutAriaKeys(['n'])}
				>
					<span className="minimal-map-admin__button-shortcut-content">
						<span>{__('Add location', 'minimal-map')}</span>
						<KeyboardShortcut keys={['n']} variant="blue" />
					</span>
				</Button>
			</div>
		) : null,
		isAssignToCollectionModalOpen,
		isAssignLogoModalOpen,
		isAssignMarkerModalOpen,
		isAssignTagsModalOpen,
		isAssignOpeningHoursModalOpen,
		isAssignmentSaving,
		isDeleteAllLocationsModalOpen,
		isDeletingAllLocations,
		isDeleteLogoConfirmationModalOpen,
		isRemoveMarkerConfirmationModalOpen,
		isRemoveTagsConfirmationModalOpen,
		isShowLocationConfirmationModalOpen,
		isModalOpen,
		isMarkerColorModalOpen,
		isCustomCsvImportModalOpen,
		isLocationImportProgressModalOpen,
		isGeocoding,
		isLoading,
		isRemoveCollectionAssignmentModalOpen,
		isRemovingCollectionAssignment,
		isRowActionPending,
		isSubmitting,
		isImporting,
		isExporting,
		loadError,
		locations,
		totalItems,
		mapCenter,
		modalTitle:
			formMode === 'edit'
				? __('Edit location', 'minimal-map')
				: __('Add location', 'minimal-map'),
		onBack,
		onAssignLocationToCollection,
		onAssignLogoToLocation,
		onAssignMarkerToLocation,
		onAssignTagsToLocation,
		onAssignOpeningHoursToLocations,
		onAdvanceCustomCsvImportStep,
		onCancel,
		onChangeCsvImportMapping,
		onChangeCsvImportOpeningHoursMapping,
		onChangeFormValue,
		onChangeOpeningHoursDayValue,
		onChangeOpeningHoursNotes,
		onBackCustomCsvImportStep,
		onCloseAssignToCollectionModal: closeAssignToCollectionModal,
		onCloseCustomCsvImportModal: closeCustomCsvImportModal,
		onCloseLocationImportProgressModal: closeLocationImportProgressModal,
		onCloseDeleteAllLocationsModal: closeDeleteAllLocationsModal,
		onCloseAssignLogoModal: closeAssignLogoModal,
		onCloseAssignMarkerModal: closeAssignMarkerModal,
		onCloseAssignTagsModal: closeAssignTagsModal,
		onCloseAssignOpeningHoursModal: closeAssignOpeningHoursModal,
		onCloseMarkerColorModal,
		onCloseDeleteLogoConfirmationModal: closeDeleteLogoConfirmationModal,
		onCloseRemoveMarkerConfirmationModal: closeRemoveMarkerConfirmationModal,
		onCloseRemoveTagsConfirmationModal: closeRemoveTagsConfirmationModal,
		onCloseShowLocationConfirmationModal: closeShowLocationConfirmationModal,
		onCloseRemoveCollectionAssignmentModal: closeRemoveCollectionAssignmentModal,
		onOpenAssignToCollectionModal,
		onOpenAssignLogoModal,
		onOpenAssignMarkerModal,
		onOpenAssignTagsModal,
		onOpenAssignOpeningHoursModal,
		onOpenMarkerColorModal,
		onOpenDeleteAllLocationsModal,
		onQuickAssignLogo,
		onQuickAssignMarker,
		onQuickAssignTag,
		onOpenDeleteLogoConfirmationModal,
		onOpenRemoveMarkerConfirmationModal,
		onOpenRemoveTagsConfirmationModal,
		onOpenShowLocationConfirmationModal,
		onOpenRemoveCollectionAssignmentModal,
		onChangeView: (nextView) => {
			const nextViewState = applyLocationsTableViewChange(
				view,
				nextView,
				config.preferredPerPage
			);
			setView(nextViewState.view);
			setSelection([]);

			if (nextViewState.hasPerPageChanged) {
				void persistLocationsPerPagePreference(
					nextViewState.view.perPage ?? DEFAULT_LOCATIONS_TABLE_PER_PAGE
				);
			}
		},
		onChangeSelection: (nextSelection) => setSelection(nextSelection),
		onConfirm,
		onConfirmMarkerColor,
		onDeleteLocation,
		onDeleteLocations,
		onDeleteAllLocations,
		onDuplicateLocation,
		onEditLocation,
		onImportLocations,
		onStartCustomCsvImport,
		onExportLocations,
		onExportExcel,
		onExportJson,
		onExportExample,
		onExportExampleExcel,
		onExportExampleJson,
		onSetLocationVisibility,
		onMapLocationSelect,
		onClearLogosFromLocations,
		onClearMarkersFromLocations,
		onClearTagsFromLocations,
		onConfirmShowLocation,
		onRemoveCollectionAssignment,
		onRetrieveLocation,
		onSelectAssignmentCollection: setAssignmentCollectionId,
		onSelectAssignmentLogo: setAssignmentLogoId,
		onSelectAssignmentMarker: setAssignmentMarkerId,
		onSelectAssignmentTags: setAssignmentTagIds,
		onSelectCsvImportLogo: setCsvImportLogoId,
		onSelectCsvImportMarker: setCsvImportMarkerId,
		onSelectCsvImportTags: setCsvImportTagIds,
		onAddLocation: openModal,
		paginatedLocations,
		selection,
		selectedAssignmentLocation,
		selectedMarkerLocations,
		selectedMarkerColorLocations,
		selectedLogoLocations,
		selectedOpeningHoursLocations,
		selectedLogoRemovalLocations,
		selectedMarkerRemovalLocations,
		selectedTagRemovalLocations,
		selectedShownLocation,
		selectedTagsLocations,
		selectedCoordinates,
		selectedRemovalCollection,
		selectedRemovalLocation,
		submitLabel:
			formMode === 'edit'
				? __('Save changes', 'minimal-map')
				: __('Finish', 'minimal-map'),
		submitError,
		step,
		totalPages,
		view,
	};
}

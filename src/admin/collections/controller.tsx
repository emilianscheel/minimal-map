import { Button } from "@wordpress/components";
import { __, _n, sprintf } from "@wordpress/i18n";
import { useCallback, useEffect, useState, useRef } from "@wordpress/element";
import { BrushCleaning, Merge, Plus } from "lucide-react";
import type { ViewGrid, ViewPickerTable } from "@wordpress/dataviews";
import type {
  AdminCollectionListItem,
  AdminLocationLookupItem,
  CollectionFormState,
  CollectionRecord,
  CollectionsAdminConfig,
  LocationsAdminConfig,
  StyleThemeRecord,
} from "../../types";
import {
  DEFAULT_ASSIGNMENT_VIEW,
  DEFAULT_FORM_STATE,
  DEFAULT_GRID_VIEW,
} from "./constants";
import {
  fetchAdminCollections,
  fetchAdminLocationAssignmentOptions,
} from "../../lib/admin/fetchPaginatedRecords";
import { configureApiFetch } from "../../lib/locations/configureApiFetch";
import { createCollection } from "../../lib/collections/createCollection";
import { deleteCollection } from "../../lib/collections/deleteCollection";
import {
  getDeleteAllCollectionsLocationPlan,
  getCollectionsWithoutDeletedLocationIds,
  getDeleteCollectionLocationPlan,
} from "../../lib/collections/deleteCollectionLocations";
import { fetchAllCollections } from '../../lib/collections/fetchAllCollections';
import { importLocations } from '../../lib/locations/importLocations';
import { updateCollection } from "../../lib/collections/updateCollection";
import { deleteLocation } from "../../lib/locations/deleteLocation";
import { ImportLocationsButton } from "../locations/ImportLocationsButton";
import { KeyboardShortcut, getShortcutAriaKeys } from "../../components/Kbd";
import { useSingleKeyShortcut } from "../../lib/keyboard/useSingleKeyShortcut";
import type {
  CollectionsController,
  DeleteCollectionOptions,
  MergeCollectionsStep,
} from "./types";

export function useCollectionsController(
  collectionsConfig: CollectionsAdminConfig,
  locationsConfig: LocationsAdminConfig,
  enabled: boolean,
  themeData: {
    activeTheme: StyleThemeRecord | null;
  },
): CollectionsController {
  const buildDeleteCollectionNotice = useCallback(
    (
      options: DeleteCollectionOptions,
      deletedLocationCount: number,
      sharedLocationCount: number,
    ): string => {
      if (!options.deleteLocations) {
        return __("Collection deleted.", "minimal-map");
      }

      const deletedLocationsMessage = sprintf(
        _n(
          "%d assigned location deleted",
          "%d assigned locations deleted",
          deletedLocationCount,
          "minimal-map",
        ),
        deletedLocationCount,
      );

      if (!options.skipSharedLocations) {
        return sprintf(
          __("Collection deleted. %s.", "minimal-map"),
          deletedLocationsMessage,
        );
      }

      return sprintf(
        __("Collection deleted. %1$s. Shared locations kept: %2$d.", "minimal-map"),
        deletedLocationsMessage,
        sharedLocationCount,
      );
    },
    [],
  );

  const buildDeleteCollectionsNotice = useCallback(
    (
      collectionCount: number,
      options: DeleteCollectionOptions,
      deletedLocationCount: number,
      sharedLocationCount: number,
    ): string => {
      if (!options.deleteLocations) {
        return sprintf(
          _n(
            "%d collection deleted.",
            "%d collections deleted.",
            collectionCount,
            "minimal-map",
          ),
          collectionCount,
        );
      }

      const deletedLocationsMessage = sprintf(
        _n(
          "%d assigned location deleted",
          "%d assigned locations deleted",
          deletedLocationCount,
          "minimal-map",
        ),
        deletedLocationCount,
      );

      return sprintf(
        options.skipSharedLocations
          ? _n(
              "%1$d collection deleted. %2$s. Shared locations kept: %3$d.",
              "%1$d collections deleted. %2$s. Shared locations kept: %3$d.",
              collectionCount,
              "minimal-map",
            )
          : _n(
              "%1$d collection deleted. %2$s.",
              "%1$d collections deleted. %2$s.",
              collectionCount,
              "minimal-map",
            ),
        collectionCount,
        deletedLocationsMessage,
        sharedLocationCount,
      );
    },
    [],
  );

  const [actionNotice, setActionNotice] =
    useState<CollectionsController["actionNotice"]>(null);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentLocationsView, setAssignmentLocationsView] =
    useState<ViewPickerTable>(DEFAULT_ASSIGNMENT_VIEW);
  const [collections, setCollections] = useState<AdminCollectionListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [editingCollection, setEditingCollection] =
    useState<CollectionRecord | null>(null);
  const [form, setForm] = useState<CollectionFormState>(DEFAULT_FORM_STATE);
  const [formMode, setFormMode] =
    useState<CollectionsController["formMode"]>("create");
  const [isAssignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [isAssignmentSaving, setAssignmentSaving] = useState(false);
  const [isDeleteAllCollectionsModalOpen, setDeleteAllCollectionsModalOpen] =
    useState(false);
  const [isDeletingAllCollections, setDeletingAllCollections] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isLoading, setLoading] = useState(enabled);
  const [isRowActionPending, setRowActionPending] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isMergeModalOpen, setMergeModalOpen] = useState(false);
  const [isMerging, setMerging] = useState(false);
  const [mergeStep, setMergeStep] = useState<MergeCollectionsStep>("selection");
  const [selectedMergeCollectionIds, setSelectedMergeCollectionIds] = useState<
    number[]
  >([]);
  const [mergeTitle, setMergeTitle] = useState("");
  const [shouldDeleteAfterMerge, setShouldDeleteAfterMerge] = useState(false);
  const [mergeSelectionView, setMergeSelectionView] = useState<ViewPickerTable>(
    {
      type: "pickerTable",
      page: 1,
      perPage: 100,
      fields: ["title", "location_count"],
      layout: { enableMoving: false },
    },
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignmentLocations, setAssignmentLocations] = useState<AdminLocationLookupItem[]>([]);
  const [assignmentTotalItems, setAssignmentTotalItems] = useState(0);
  const [selectedAssignmentCollection, setSelectedAssignmentCollection] =
    useState<CollectionRecord | null>(null);
  const [selectedLocationIds, setSelectedLocationIds] = useState<number[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [view, setView] = useState<ViewGrid>(DEFAULT_GRID_VIEW);
  const [isImporting, setIsImporting] = useState(false);
  const [mergeCollections, setMergeCollections] = useState<CollectionRecord[]>([]);
  const [mergeCollectionsTotalItems, setMergeCollectionsTotalItems] = useState(0);
  
  // The lock prevents DataViewsPicker from clearing selection during unmount transition
  const isMergeSelectionLocked = useRef(false);

  const loadCollections = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    const result = await fetchAdminCollections(collectionsConfig, {
      page: view.page ?? 1,
      perPage: view.perPage ?? DEFAULT_GRID_VIEW.perPage,
      search: view.search ?? "",
    });

    setCollections(result.items);
    setTotalItems(result.totalItems);
  }, [collectionsConfig, enabled, view.page, view.perPage, view.search]);

  const loadAssignmentLocations = useCallback(async (): Promise<void> => {
    if (!enabled || !selectedAssignmentCollection) {
      return;
    }

    const result = await fetchAdminLocationAssignmentOptions(locationsConfig, {
      page: assignmentLocationsView.page ?? 1,
      perPage: assignmentLocationsView.perPage ?? DEFAULT_ASSIGNMENT_VIEW.perPage,
      search: assignmentSearch,
    });

    setAssignmentLocations(result.items);
    setAssignmentTotalItems(result.totalItems);
  }, [
    assignmentLocationsView.page,
    assignmentLocationsView.perPage,
    assignmentSearch,
    enabled,
    locationsConfig,
    selectedAssignmentCollection,
  ]);

  const loadData = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      await loadCollections();
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : __("Collections could not be loaded.", "minimal-map"),
      );
    } finally {
      setLoading(false);
    }
  }, [enabled, loadCollections]);

  useEffect(() => {
    configureApiFetch(collectionsConfig.nonce || locationsConfig.nonce);

    if (!enabled) {
      return;
    }

    void loadData();
  }, [collectionsConfig.nonce, enabled, loadData, locationsConfig.nonce]);

  useEffect(() => {
    if (!selectedAssignmentCollection) {
      return;
    }

    void loadAssignmentLocations();
  }, [loadAssignmentLocations, selectedAssignmentCollection]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / Math.max(1, view.perPage ?? DEFAULT_GRID_VIEW.perPage ?? 1)),
  );
  const assignmentTotalPages = Math.max(
    1,
    Math.ceil(
      assignmentTotalItems /
        Math.max(1, assignmentLocationsView.perPage ?? DEFAULT_ASSIGNMENT_VIEW.perPage ?? 1),
    ),
  );

  const resetModalState = useCallback((): void => {
    setEditingCollection(null);
    setForm(DEFAULT_FORM_STATE);
    setFormMode("create");
    setSubmitError(null);
  }, []);

  const dismissActionNotice = useCallback((): void => {
    setActionNotice(null);
  }, []);

  const openModal = useCallback((): void => {
    resetModalState();
    setModalOpen(true);
  }, [resetModalState]);

  const isAddCollectionShortcutBlocked =
    isModalOpen ||
    isAssignmentModalOpen ||
    isDeleteAllCollectionsModalOpen ||
    isMergeModalOpen ||
    isAssignmentSaving ||
    isDeletingAllCollections ||
    isSubmitting ||
    isLoading ||
    isRowActionPending ||
    isMerging ||
    isImporting;

  useSingleKeyShortcut({
    active: enabled,
    blocked: isAddCollectionShortcutBlocked,
    key: "n",
    onTrigger: openModal,
  });

  const onEditCollection = useCallback(
    (collection: CollectionRecord): void => {
      resetModalState();
      setEditingCollection(collection);
      setFormMode("edit");
      setForm({
        title: collection.title,
      });
      setModalOpen(true);
    },
    [resetModalState],
  );

  const onCancel = useCallback((): void => {
    if (isSubmitting) {
      return;
    }

    setModalOpen(false);
  }, [isSubmitting]);

  const onChangeFormValue = useCallback((
    key: keyof CollectionFormState,
    value: string,
  ): void => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
    setSubmitError(null);
  }, []);

  const onConfirm = useCallback(async (): Promise<void> => {
    if (!form.title.trim()) {
      setSubmitError(__("Collection title is required.", "minimal-map"));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setActionNotice(null);

    try {
      if (formMode === "edit" && editingCollection) {
        await updateCollection(
          collectionsConfig,
          editingCollection.id,
          form.title,
          editingCollection.location_ids,
        );
      } else {
        await createCollection(collectionsConfig, form.title);
      }

      await loadCollections();
      setModalOpen(false);
      resetModalState();
      setActionNotice({
        status: "success",
        message:
          formMode === "edit"
            ? __("Collection updated.", "minimal-map")
            : __("Collection created.", "minimal-map"),
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : formMode === "edit"
          ? __("Collection could not be updated.", "minimal-map")
          : __("Collection could not be created.", "minimal-map"),
      );
    } finally {
      setSubmitting(false);
    }
  }, [form, formMode, editingCollection, collectionsConfig, loadCollections, resetModalState]);

  const onDeleteCollection = useCallback(
    async (
      collection: CollectionRecord,
      options: DeleteCollectionOptions,
    ): Promise<void> => {
      setRowActionPending(true);
      setActionNotice(null);

      try {
        let deletedLocationCount = 0;
        let sharedLocationCount = 0;
        const allCollections =
          options.deleteLocations || selectedAssignmentCollection
            ? await fetchAllCollections(collectionsConfig)
            : collections;

        if (options.deleteLocations) {
          const { deletedLocationIds, sharedLocationIds } =
            getDeleteCollectionLocationPlan(
              collection,
              allCollections,
              options.skipSharedLocations,
            );

          sharedLocationCount = options.skipSharedLocations
            ? sharedLocationIds.length
            : 0;

          for (const locationId of deletedLocationIds) {
            await deleteLocation(locationsConfig, locationId);
          }

          deletedLocationCount = deletedLocationIds.length;

          const collectionUpdates = getCollectionsWithoutDeletedLocationIds(
            allCollections,
            deletedLocationIds,
            collection.id,
          );

          for (const collectionUpdate of collectionUpdates) {
            await updateCollection(
              collectionsConfig,
              collectionUpdate.id,
              collectionUpdate.title,
              collectionUpdate.location_ids,
            );
          }
        }

        await deleteCollection(collectionsConfig, collection.id);
        await loadCollections();
        setActionNotice({
          status: "success",
          message: buildDeleteCollectionNotice(
            options,
            deletedLocationCount,
            sharedLocationCount,
          ),
        });
      } catch (error) {
        setActionNotice({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : __("Collection could not be deleted.", "minimal-map"),
        });
        throw error;
      } finally {
        setRowActionPending(false);
      }
    },
    [
      buildDeleteCollectionNotice,
      collections,
      collectionsConfig,
      loadCollections,
      locationsConfig,
      selectedAssignmentCollection,
    ],
  );

  const onDeleteAllCollections = useCallback(
    async (options: DeleteCollectionOptions): Promise<void> => {
      const normalizedOptions: DeleteCollectionOptions = {
        ...options,
        skipSharedLocations: false,
      };

      if (totalItems === 0) {
        setDeleteAllCollectionsModalOpen(false);
        return;
      }

      setDeletingAllCollections(true);
      setRowActionPending(true);
      setActionNotice(null);

      try {
        let deletedLocationCount = 0;
        let sharedLocationCount = 0;
        const allCollections = await fetchAllCollections(collectionsConfig);
        const collectionCount = allCollections.length;

        if (normalizedOptions.deleteLocations) {
          const { deletedLocationIds, sharedLocationIds } =
            getDeleteAllCollectionsLocationPlan(
              allCollections,
              normalizedOptions.skipSharedLocations,
            );

          sharedLocationCount = normalizedOptions.skipSharedLocations
            ? sharedLocationIds.length
            : 0;

          for (const locationId of deletedLocationIds) {
            await deleteLocation(locationsConfig, locationId);
          }

          deletedLocationCount = deletedLocationIds.length;
        }

        for (const collection of allCollections) {
          await deleteCollection(collectionsConfig, collection.id);
        }

        await loadCollections();
        setDeleteAllCollectionsModalOpen(false);
        setActionNotice({
          status: "success",
          message: buildDeleteCollectionsNotice(
            collectionCount,
            normalizedOptions,
            deletedLocationCount,
            sharedLocationCount,
          ),
        });
      } catch (error) {
        setActionNotice({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : __("Collections could not be deleted.", "minimal-map"),
        });
        throw error;
      } finally {
        setDeletingAllCollections(false);
        setRowActionPending(false);
      }
    },
    [
      buildDeleteCollectionsNotice,
      collectionsConfig,
      loadCollections,
      locationsConfig,
      totalItems,
    ],
  );

  const onOpenAssignmentModal = useCallback(
    (collection: CollectionRecord): void => {
      setSelectedAssignmentCollection(collection);
      setSelectedLocationIds(collection.location_ids);
      setAssignmentSearch("");
      setAssignmentLocationsView(DEFAULT_ASSIGNMENT_VIEW);
      setAssignmentModalOpen(true);
    },
    [],
  );

  const onOpenDeleteAllCollectionsModal = useCallback((): void => {
    if (
      totalItems === 0 ||
      isRowActionPending ||
      isImporting ||
      isDeletingAllCollections
    ) {
      return;
    }

    setDeleteAllCollectionsModalOpen(true);
  }, [isDeletingAllCollections, isImporting, isRowActionPending, totalItems]);

  const onCloseAssignmentModal = useCallback((): void => {
    if (isAssignmentSaving) {
      return;
    }

    setAssignmentModalOpen(false);
    setSelectedAssignmentCollection(null);
    setSelectedLocationIds([]);
    setAssignmentSearch("");
  }, [isAssignmentSaving]);

  const onChangeAssignmentLocationsSelection = useCallback(
    (nextSelection: string[]): void => {
      setSelectedLocationIds(
        nextSelection
        .map((locationId) => Number.parseInt(locationId, 10))
        .filter((locationId) => Number.isInteger(locationId) && locationId > 0),
      );
    },
    [],
  );

  const onSaveAssignments = useCallback(async (): Promise<void> => {
    if (!selectedAssignmentCollection) {
      return;
    }

    setAssignmentSaving(true);
    setActionNotice(null);

    try {
      await updateCollection(
        collectionsConfig,
        selectedAssignmentCollection.id,
        selectedAssignmentCollection.title,
        selectedLocationIds,
      );
      await loadCollections();
      await loadAssignmentLocations();
      setAssignmentModalOpen(false);
      setSelectedAssignmentCollection(null);
      setSelectedLocationIds([]);
      setActionNotice({
        status: "success",
        message: __("Collection locations saved.", "minimal-map"),
      });
    } catch (error) {
      setActionNotice({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : __("Collection locations could not be saved.", "minimal-map"),
      });
    } finally {
      setAssignmentSaving(false);
    }
  }, [
    collectionsConfig,
    loadAssignmentLocations,
    loadCollections,
    selectedAssignmentCollection,
    selectedLocationIds,
  ]);

  const onOpenMergeModal = useCallback((): void => {
    isMergeSelectionLocked.current = false;
    setMergeStep("selection");
    setSelectedMergeCollectionIds([]);
    setMergeTitle("");
    setShouldDeleteAfterMerge(false);
    setSubmitError(null);
    setMergeModalOpen(true);

    void fetchAllCollections(collectionsConfig)
      .then((records) => {
        setMergeCollections(records);
        setMergeCollectionsTotalItems(records.length);
      })
      .catch((error) => {
        setSubmitError(
          error instanceof Error
            ? error.message
            : __("Collections could not be loaded.", "minimal-map"),
        );
      });
  }, [collectionsConfig]);

  useSingleKeyShortcut({
    active: enabled,
    blocked: isAddCollectionShortcutBlocked,
    key: "m",
    onTrigger: onOpenMergeModal,
  });

  const onCloseMergeModal = useCallback((): void => {
    if (isMerging) {
      return;
    }

    setMergeModalOpen(false);
    setMergeCollections([]);
    setMergeCollectionsTotalItems(0);
  }, [isMerging]);

  const onCloseDeleteAllCollectionsModal = useCallback((): void => {
    if (isDeletingAllCollections) {
      return;
    }

    setDeleteAllCollectionsModalOpen(false);
  }, [isDeletingAllCollections]);

  const onMergeConfirm = useCallback(async (): Promise<void> => {
    if (mergeStep === "selection") {
      if (selectedMergeCollectionIds.length < 2) {
        setSubmitError(
          __("Select at least two collections to merge.", "minimal-map"),
        );
        return;
      }
      setSubmitError(null);
      // Lock selection immediately to prevent unmount-triggered changes
      isMergeSelectionLocked.current = true;
      setMergeStep("details");
      return;
    }

    if (!mergeTitle.trim()) {
      setSubmitError(__("Collection title is required.", "minimal-map"));
      return;
    }

    setMerging(true);
    setSubmitError(null);
    setActionNotice(null);

    try {
      const allLocationIds = new Set<number>();

      mergeCollections.forEach((collection) => {
        if (selectedMergeCollectionIds.includes(collection.id)) {
          collection.location_ids.forEach((id) => allLocationIds.add(id));
        }
      });

      await createCollection(
        collectionsConfig,
        mergeTitle,
        Array.from(allLocationIds),
      );

      if (shouldDeleteAfterMerge) {
        const idsToDelete = [...selectedMergeCollectionIds];
        for (const id of idsToDelete) {
          await deleteCollection(collectionsConfig, id);
        }
      }

      await loadCollections();
      setMergeModalOpen(false);
      setActionNotice({
        status: "success",
        message: __("Collections merged successfully.", "minimal-map"),
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : __("Collections could not be merged.", "minimal-map"),
      );
    } finally {
      setMerging(false);
    }
  }, [
    mergeStep,
    selectedMergeCollectionIds,
    mergeTitle,
    mergeCollections,
    collectionsConfig,
    shouldDeleteAfterMerge,
    loadCollections,
  ]);

  const onMergeBack = useCallback((): void => {
    if (isMerging) {
      return;
    }
    isMergeSelectionLocked.current = false;
    setMergeStep("selection");
  }, [isMerging]);

  const onChangeMergeSelection = useCallback(
    (nextSelection: string[]): void => {
      if (isMergeSelectionLocked.current || mergeStep !== "selection") {
        return;
      }

      const nextIds = nextSelection
        .map((id) => Number.parseInt(id, 10))
        .filter((id) => !Number.isNaN(id));
      setSelectedMergeCollectionIds(nextIds);
      setSubmitError(null);
    },
    [mergeStep],
  );

  const onChangeMergeTitle = useCallback((value: string): void => {
    setMergeTitle(value);
    setSubmitError(null);
  }, []);

  const onToggleDeleteAfterMerge = useCallback((): void => {
    setShouldDeleteAfterMerge((current) => !current);
  }, []);

  const onImportLocations = useCallback(
    async (file: File) => {
      setIsImporting(true);
      setActionNotice(null);

      try {
        const count = await importLocations(
          file,
          locationsConfig,
          collectionsConfig,
        );

        await loadCollections();
        setActionNotice({
          status: "success",
          message: sprintf(
            _n(
              "%d location imported and assigned to a new collection.",
              "%d locations imported and assigned to a new collection.",
              count,
              "minimal-map",
            ),
            count,
          ),
        });
      } catch (error) {
        setActionNotice({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : __("Failed to import locations.", "minimal-map"),
        });
      } finally {
        setIsImporting(false);
      }
    },
    [locationsConfig, collectionsConfig, loadCollections],
  );

  return {
    actionNotice,
    activeTheme: themeData.activeTheme,
    assignmentLocations,
    assignmentSearch,
    assignmentLocationsView,
    collections,
    filteredAssignmentLocationsCount: assignmentTotalItems,
    form,
    formMode,
    headerAction: enabled ? (
      <div className="minimal-map-admin__header-actions-group">
        <div className="minimal-map-admin__header-actions-group">
          <Button
            __next40pxDefaultSize
            variant="tertiary"
            icon={<BrushCleaning size={18} strokeWidth={2} />}
            label={__("Delete all collections", "minimal-map")}
            onClick={onOpenDeleteAllCollectionsModal}
            disabled={
              totalItems === 0 ||
              isDeletingAllCollections ||
              isRowActionPending ||
              isImporting
            }
          />
          <ImportLocationsButton
            onImport={onImportLocations}
            isImporting={isImporting}
          />
        </div>
        <Button
          __next40pxDefaultSize
          variant="secondary"
          onClick={onOpenMergeModal}
          disabled={isRowActionPending}
          icon={<Merge size={14} strokeWidth={2} />}
          iconPosition="left"
          aria-keyshortcuts={getShortcutAriaKeys(["m"])}
        >
          <span className="minimal-map-admin__button-shortcut-content">
            <span>{__("Merge collections", "minimal-map")}</span>
            <KeyboardShortcut keys={["m"]} variant="neutral" />
          </span>
        </Button>
        <Button
          __next40pxDefaultSize
          variant="primary"
          onClick={openModal}
          icon={<Plus size={18} strokeWidth={2} />}
          iconPosition="left"
          aria-keyshortcuts={getShortcutAriaKeys(["n"])}
        >
          <span className="minimal-map-admin__button-shortcut-content">
            <span>{__("Add collection", "minimal-map")}</span>
            <KeyboardShortcut keys={["n"]} variant="blue" />
          </span>
        </Button>
      </div>
    ) : null,
    isAssignmentModalOpen,
    isAssignmentSaving,
    isDeleteAllCollectionsModalOpen,
    isDeletingAllCollections,
    isModalOpen,
    isLoading,
    isRowActionPending,
    isSubmitting,
    isMergeModalOpen,
    isMerging,
    isImporting,
    totalItems,
    assignmentTotalItems,
    mergeCollections,
    mergeCollectionsTotalItems,
    mergeStep,
    mergeSelectionView,
    selectedMergeCollectionIds,
    mergeTitle,
    shouldDeleteAfterMerge,
    loadError,
    modalTitle:
      formMode === "edit"
        ? __("Edit collection", "minimal-map")
        : __("Add collection", "minimal-map"),
    selectedAssignmentCollection,
    selectedLocationIds,
    submitError,
    submitLabel:
      formMode === "edit"
        ? __("Save changes", "minimal-map")
        : __("Add collection", "minimal-map"),
    view,
    dismissActionNotice,
    onCancel,
    onChangeAssignmentSearch: setAssignmentSearch,
    onChangeAssignmentLocationsSelection,
    onChangeAssignmentLocationsView: (nextView: ViewPickerTable) =>
      setAssignmentLocationsView(nextView),
    onChangeFormValue,
    onChangeView: (nextView: ViewGrid) => setView(nextView),
    onCloseAssignmentModal,
    onCloseDeleteAllCollectionsModal,
    onConfirm,
    onDeleteAllCollections,
    onDeleteCollection,
    onEditCollection,
    onOpenDeleteAllCollectionsModal,
    onOpenAssignmentModal,
    onSaveAssignments,
    onImportLocations,
    onOpenMergeModal,
    onCloseMergeModal,
    onMergeConfirm,
    onMergeBack,
    onChangeMergeSelection,
    onChangeMergeView: (nextView: ViewPickerTable) =>
      setMergeSelectionView(nextView),
    onChangeMergeTitle,
    onToggleDeleteAfterMerge,
    onAddCollection: openModal,
    paginatedCollections: collections,
    totalPages: totalPages,
  };
}

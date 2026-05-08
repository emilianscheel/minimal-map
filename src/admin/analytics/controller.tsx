import type { ViewTable } from '@wordpress/dataviews';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { exportAnalyticsFile, getAnalyticsExportErrorMessage } from '../../lib/analytics/exportAnalyticsFile';
import { resetAnalyticsData } from '../../lib/analytics/resetAnalyticsData';
import { configureApiFetch } from '../../lib/locations/configureApiFetch';
import { fetchAnalyticsQueries } from '../../lib/analytics/fetchAnalyticsQueries';
import { fetchAnalyticsSummary } from '../../lib/analytics/fetchAnalyticsSummary';
import { normalizeAnalyticsTableView } from '../../lib/analytics/normalizeAnalyticsView';
import { updateAnalyticsSettings } from '../../lib/analytics/updateAnalyticsSettings';
import type {
	ActionAnalyticsSummary,
	AnalyticsAdminConfig,
	AnalyticsEventCategory,
	AnalyticsQueriesResponse,
	AnalyticsRangeKey,
	AnalyticsSettings,
	AnalyticsSummary,
	SearchAnalyticsSummary,
	SelectionAnalyticsSummary,
} from '../../types';
import AnalyticsHeaderActions from './AnalyticsHeaderActions';
import {
	DEFAULT_ANALYTICS_RANGE,
	EMPTY_ACTION_ANALYTICS_SUMMARY,
	EMPTY_ANALYTICS_TABLES,
	EMPTY_SEARCH_ANALYTICS_SUMMARY,
	EMPTY_SELECTION_ANALYTICS_SUMMARY,
} from './constants';
import type {
	AnalyticsController,
	AnalyticsSummaryByCategory,
	AnalyticsTableState,
	AnalyticsTablesByCategory,
} from './types';

interface AnalyticsControllerDependencies {
	exportFile?: typeof exportAnalyticsFile;
	fetchQueries?: typeof fetchAnalyticsQueries;
	fetchSummary?: typeof fetchAnalyticsSummary;
	resetData?: typeof resetAnalyticsData;
	updateSettings?: typeof updateAnalyticsSettings;
}

function toSearchSummary(summary: AnalyticsSummary): SearchAnalyticsSummary {
	return summary.category === 'search' ? summary : EMPTY_SEARCH_ANALYTICS_SUMMARY;
}

function toSelectionSummary(summary: AnalyticsSummary): SelectionAnalyticsSummary {
	return summary.category === 'selection' ? summary : EMPTY_SELECTION_ANALYTICS_SUMMARY;
}

function toActionSummary(summary: AnalyticsSummary): ActionAnalyticsSummary {
	return summary.category === 'action' ? summary : EMPTY_ACTION_ANALYTICS_SUMMARY;
}

function updateTableState(
	currentTables: AnalyticsTablesByCategory,
	category: AnalyticsEventCategory,
	nextState: Partial<AnalyticsTableState>,
): AnalyticsTablesByCategory {
	return {
		...currentTables,
		[category]: {
			...currentTables[category],
			...nextState,
		},
	};
}

export function useAnalyticsController(
	config: AnalyticsAdminConfig,
	dependencies: AnalyticsControllerDependencies = {},
): AnalyticsController {
	const exportFile = dependencies.exportFile ?? exportAnalyticsFile;
	const fetchQueries = dependencies.fetchQueries ?? fetchAnalyticsQueries;
	const fetchSummary = dependencies.fetchSummary ?? fetchAnalyticsSummary;
	const resetData = dependencies.resetData ?? resetAnalyticsData;
	const updateSettings = dependencies.updateSettings ?? updateAnalyticsSettings;
	const [enabled, setEnabled] = useState(config.enabled);
	const [complianzEnabled, setComplianzEnabled] = useState(config.complianzEnabled);
	const complianzInstalled = config.complianzInstalled;
	const [isConfirmEnableModalOpen, setConfirmEnableModalOpen] = useState(false);
	const [isDeleteAllAnalyticsModalOpen, setDeleteAllAnalyticsModalOpen] = useState(false);
	const [isDeletingAllAnalytics, setDeletingAllAnalytics] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [isLoadingSummary, setLoadingSummary] = useState(true);
	const [isLoadingTables, setLoadingTables] = useState<Record<AnalyticsEventCategory, boolean>>({
		search: true,
		selection: true,
		action: true,
	});
	const [isSavingSettings, setSavingSettings] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [notice, setNotice] = useState<AnalyticsController['notice']>(null);
	const [range, setRange] = useState<AnalyticsRangeKey>(DEFAULT_ANALYTICS_RANGE);
	const [summaries, setSummaries] = useState<AnalyticsSummaryByCategory>({
		search: EMPTY_SEARCH_ANALYTICS_SUMMARY,
		selection: EMPTY_SELECTION_ANALYTICS_SUMMARY,
		action: EMPTY_ACTION_ANALYTICS_SUMMARY,
	});
	const [tables, setTables] = useState<AnalyticsTablesByCategory>(EMPTY_ANALYTICS_TABLES);

	const loadSummary = useCallback(async () => {
		const [searchSummary, selectionSummary, actionSummary] = await Promise.all([
			fetchSummary(config, range, 'search'),
			fetchSummary(config, range, 'selection'),
			fetchSummary(config, range, 'action'),
		]);

		setSummaries({
			search: toSearchSummary(searchSummary),
			selection: toSelectionSummary(selectionSummary),
			action: toActionSummary(actionSummary),
		});
	}, [config, fetchSummary, range]);

	const loadQueries = useCallback(async (
		category: AnalyticsEventCategory,
		nextView: ViewTable,
	) => {
		const safeView = normalizeAnalyticsTableView(category, nextView);
		const response: AnalyticsQueriesResponse = await fetchQueries(
			config,
			{
				page: safeView.page,
				perPage: safeView.perPage,
				search: safeView.search,
			},
			range,
			category,
		);

		setTables((currentTables) => updateTableState(currentTables, category, {
			queries: response.items,
			totalItems: response.totalItems,
			totalPages: response.totalPages,
		}));
	}, [config, fetchQueries, range]);

	useEffect(() => {
		configureApiFetch(config.nonce);
	}, [config.nonce]);

	useEffect(() => {
		let isMounted = true;

		setLoadingSummary(true);
		setLoadError(null);

		void loadSummary()
			.catch((error) => {
				if (!isMounted) {
					return;
				}

				setLoadError(
					error instanceof Error
						? error.message
						: __('Analytics data could not be loaded.', 'minimal-map')
				);
			})
			.finally(() => {
				if (isMounted) {
					setLoadingSummary(false);
				}
			});

		return () => {
			isMounted = false;
		};
	}, [loadSummary]);

	useEffect(() => {
		let isMounted = true;
		const nextView = tables.search.view;

		setLoadingTables((current) => ({ ...current, search: true }));
		setLoadError(null);

		void loadQueries('search', nextView)
			.catch((error) => {
				if (!isMounted) {
					return;
				}

				setLoadError(
					error instanceof Error
						? error.message
						: __('Analytics data could not be loaded.', 'minimal-map')
				);
			})
			.finally(() => {
				if (isMounted) {
					setLoadingTables((current) => ({ ...current, search: false }));
				}
			});

		return () => {
			isMounted = false;
		};
	}, [loadQueries, tables.search.view]);

	useEffect(() => {
		let isMounted = true;
		const nextView = tables.selection.view;

		setLoadingTables((current) => ({ ...current, selection: true }));
		setLoadError(null);

		void loadQueries('selection', nextView)
			.catch((error) => {
				if (!isMounted) {
					return;
				}

				setLoadError(
					error instanceof Error
						? error.message
						: __('Analytics data could not be loaded.', 'minimal-map')
				);
			})
			.finally(() => {
				if (isMounted) {
					setLoadingTables((current) => ({ ...current, selection: false }));
				}
			});

		return () => {
			isMounted = false;
		};
	}, [loadQueries, tables.selection.view]);

	useEffect(() => {
		let isMounted = true;
		const nextView = tables.action.view;

		setLoadingTables((current) => ({ ...current, action: true }));
		setLoadError(null);

		void loadQueries('action', nextView)
			.catch((error) => {
				if (!isMounted) {
					return;
				}

				setLoadError(
					error instanceof Error
						? error.message
						: __('Analytics data could not be loaded.', 'minimal-map')
				);
			})
			.finally(() => {
				if (isMounted) {
					setLoadingTables((current) => ({ ...current, action: false }));
				}
			});

		return () => {
			isMounted = false;
		};
	}, [loadQueries, tables.action.view]);

	const onChangeView = useCallback((category: AnalyticsEventCategory, nextView: ViewTable) => {
		setTables((currentTables) => {
			const currentView = currentTables[category].view;
			const mergedView = {
				...currentView,
				...nextView,
				page: nextView.search !== currentView.search ? 1 : (nextView.page ?? currentView.page),
			};

			return updateTableState(currentTables, category, {
				view: normalizeAnalyticsTableView(category, mergedView),
			});
		});
	}, []);

	const onChangeRange = useCallback((nextRange: AnalyticsRangeKey) => {
		setRange(nextRange);
		setTables((currentTables) => ({
			search: {
				...currentTables.search,
				view: {
					...currentTables.search.view,
					page: 1,
				},
			},
			selection: {
				...currentTables.selection,
				view: {
					...currentTables.selection.view,
					page: 1,
				},
			},
			action: {
				...currentTables.action,
				view: {
					...currentTables.action.view,
					page: 1,
				},
			},
		}));
	}, []);

	const persistSettings = useCallback(async (nextSettings: Partial<AnalyticsSettings>) => {
		setSavingSettings(true);
		setNotice(null);

		try {
			const response = await updateSettings(config, nextSettings);
			if (response.enabled !== undefined) {
				setEnabled(response.enabled);
			}
			if (response.complianzEnabled !== undefined) {
				setComplianzEnabled(response.complianzEnabled);
			}
			setConfirmEnableModalOpen(false);
		} catch (error) {
			setNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Analytics settings could not be updated.', 'minimal-map'),
			});
		} finally {
			setSavingSettings(false);
		}
	}, [config, updateSettings]);

	const onExportCategory = useCallback(async (category: AnalyticsEventCategory) => {
		setIsExporting(true);
		setNotice(null);

		try {
			await exportFile(config, range, category);
		} catch (error) {
			setNotice({
				status: 'error',
				message: getAnalyticsExportErrorMessage(error),
			});
		} finally {
			setIsExporting(false);
		}
	}, [config, exportFile, range]);

	const onCloseDeleteAllAnalyticsModal = useCallback(() => {
		if (isDeletingAllAnalytics) {
			return;
		}

		setDeleteAllAnalyticsModalOpen(false);
	}, [isDeletingAllAnalytics]);

	const onDeleteAllAnalytics = useCallback(async () => {
		setDeletingAllAnalytics(true);
		setNotice(null);

		try {
			await resetData(config);
			setSummaries({
				search: EMPTY_SEARCH_ANALYTICS_SUMMARY,
				selection: EMPTY_SELECTION_ANALYTICS_SUMMARY,
				action: EMPTY_ACTION_ANALYTICS_SUMMARY,
			});
			setTables((currentTables) => ({
				search: {
					...currentTables.search,
					queries: [],
					totalItems: 0,
					totalPages: 1,
				},
				selection: {
					...currentTables.selection,
					queries: [],
					totalItems: 0,
					totalPages: 1,
				},
				action: {
					...currentTables.action,
					queries: [],
					totalItems: 0,
					totalPages: 1,
				},
			}));
			setDeleteAllAnalyticsModalOpen(false);
			setNotice({
				status: 'success',
				message: __('All tracking data deleted.', 'minimal-map'),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: __('Analytics tracking data could not be deleted.', 'minimal-map'),
			});
		} finally {
			setDeletingAllAnalytics(false);
		}
	}, [config, resetData]);

	const headerAction = useMemo(() => (
		<AnalyticsHeaderActions
			complianzEnabled={complianzEnabled}
			complianzInstalled={complianzInstalled}
			enabled={enabled}
			isDeletingAllAnalytics={isDeletingAllAnalytics}
			isExporting={isExporting}
			isSavingSettings={isSavingSettings}
			range={range}
			onChangeRange={onChangeRange}
			onOpenDeleteAllAnalyticsModal={() => setDeleteAllAnalyticsModalOpen(true)}
			onExportCategory={(category) => {
				void onExportCategory(category);
			}}
			onToggleComplianz={() => {
				void persistSettings({ complianzEnabled: !complianzEnabled });
			}}
			onToggleAnalytics={() => {
				if (enabled) {
					void persistSettings({ enabled: false });
					return;
				}

				setConfirmEnableModalOpen(true);
			}}
		/>
	), [
		complianzEnabled,
		complianzInstalled,
		enabled,
		isDeletingAllAnalytics,
		isExporting,
		isSavingSettings,
		onChangeRange,
		onExportCategory,
		persistSettings,
		range,
	]);

	return {
		enabled,
		complianzEnabled,
		complianzInstalled,
		headerAction,
		isConfirmEnableModalOpen,
		isDeleteAllAnalyticsModalOpen,
		isDeletingAllAnalytics,
		isLoading: isLoadingSummary || isLoadingTables.search || isLoadingTables.selection || isLoadingTables.action,
		isLoadingSummary,
		isSavingSettings,
		loadError,
		notice,
		range,
		summaries,
		tables,
		dismissNotice: () => setNotice(null),
		onChangeRange,
		onChangeView,
		onCloseConfirmEnableModal: () => setConfirmEnableModalOpen(false),
		onCloseDeleteAllAnalyticsModal,
		onConfirmEnableAnalytics: async () => {
			await persistSettings({ enabled: true });
		},
		onDeleteAllAnalytics,
		onOpenDeleteAllAnalyticsModal: () => setDeleteAllAnalyticsModalOpen(true),
		onToggleAnalytics: () => {
			if (enabled) {
				void persistSettings({ enabled: false });
				return;
			}

			setConfirmEnableModalOpen(true);
		},
		onToggleComplianz: () => {
			void persistSettings({ complianzEnabled: !complianzEnabled });
		},
	};
}

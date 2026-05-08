import { createRoot, useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { LoaderCircle, Search, SearchX, X } from 'lucide-react';
import type { FormEvent, KeyboardEvent } from 'react';
import Kbd from '../components/Kbd';
import type {
	AnalyticsActionTrackPayload,
	AnalyticsQueryType,
	AnalyticsSearchTrackPayload,
	AnalyticsTrackPayload,
	GeocodeResponse,
	MapCoordinates,
	MapLocationSelection,
	MapLocationPoint,
	NormalizedMapConfig,
} from '../types';
import { getMapDomContext } from './dom-context';
import {
	formatCoordinateSearchValue,
	parseCoordinateSearchValue,
} from './coordinate-search';
import { geocodeSearchQuery } from './geocodeSearchQuery';
import {
	buildDistanceSearchResults,
	type DistanceSearchResult,
} from './location-distance';
import { LiveLocationResultCard, LocationResultCard } from './location-card';
import {
	collectLocationTags,
	filterLocationsByCategoryTagIds,
	filterLocationsByOpenedStatus,
} from './category-filter';
import { isOpeningHoursConfigured } from '../lib/locations/openingHours';
import {
	buildLocationSearchIndex,
	normalizeSearchValue,
	searchIndexedLocations,
} from './location-search';
import { applySearchPanelCssVariables } from './search-panel-layout';
import { isMobileViewport } from './responsive';

type SearchMode =
	| 'text-results'
	| 'address-prompt'
	| 'address-loading'
	| 'address-results'
	| 'address-empty';

type SearchResultView =
	| {
			location: MapLocationPoint;
			distanceLabel?: undefined;
	  }
	| {
			location: MapLocationPoint;
			distanceLabel: string;
	  };

type GeocodeSearchFn = (query: string) => Promise<GeocodeResponse>;
type GeolocationRequestOptions = PositionOptions;

const PRIMARY_LIVE_LOCATION_OPTIONS: GeolocationRequestOptions = {
	enableHighAccuracy: true,
	maximumAge: 0,
	timeout: 10000,
};

const FALLBACK_LIVE_LOCATION_OPTIONS: GeolocationRequestOptions = {
	enableHighAccuracy: false,
	maximumAge: 300000,
	timeout: 15000,
};

function isTransientLiveLocationError(error?: GeolocationPositionError): boolean {
	if (!error) {
		return false;
	}

	const normalizedMessage = `${error.message ?? ''}`.toLowerCase();

	return (
		error.code === error.POSITION_UNAVAILABLE ||
		normalizedMessage.includes('kclerrorlocationunknown') ||
		normalizedMessage.includes('locationunknown') ||
		normalizedMessage.includes('location unknown')
	);
}

function requestBrowserLocation(
	geolocation: Geolocation,
	options: GeolocationRequestOptions
): Promise<MapCoordinates> {
	return new Promise((resolve, reject) => {
		geolocation.getCurrentPosition(
			(position) => {
				resolve({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				});
			},
			(error) => {
				reject(error);
			},
			options
		);
	});
}

interface SearchControlProps {
	doc: Document;
	host?: HTMLElement;
	frontendGeocodePath?: string;
	enableLiveLocationSearch: boolean;
	geocodeSearch: GeocodeSearchFn;
	googleMapsNavigation: boolean;
	googleMapsButtonShowIcon: boolean;
	enableCategoryFilter: boolean;
	enableOpenedFilter: boolean;
	locations: MapLocationPoint[];
	activeCategoryTagIds: number[];
	isOpenedFilterActive: boolean;
	currentTimeMs: number;
	onCategoryFilterChange: (tagIds: number[]) => void;
	onOpenedFilterChange: (isActive: boolean) => void;
	onEscape?: () => void;
	onLiveLocationActionChange?: (action: () => void) => void;
	onLiveLocationStateChange?: (isBusy: boolean) => void;
	onOpenStateChange?: (isOpen: boolean) => void;
	onSelect: (selection: MapLocationSelection) => void;
	selectedId?: number;
	siteLocale: string;
	siteTimezone: string;
	onAnalyticsTrack?: (payload: AnalyticsTrackPayload) => void;
}

export const MapSearchControl = ({
	doc,
	host,
	frontendGeocodePath,
	enableLiveLocationSearch,
	geocodeSearch,
	googleMapsNavigation,
	googleMapsButtonShowIcon,
	enableCategoryFilter,
	enableOpenedFilter,
	locations,
	activeCategoryTagIds,
	isOpenedFilterActive,
	currentTimeMs,
	onCategoryFilterChange,
	onOpenedFilterChange,
	onEscape,
	onLiveLocationActionChange,
	onLiveLocationStateChange,
	onOpenStateChange,
	onSelect,
	selectedId: selectedIdProp,
	siteLocale,
	siteTimezone,
	onAnalyticsTrack,
}: SearchControlProps) => {
	const responsiveHost = host ?? doc.documentElement;
	const [searchTerm, setSearchTerm] = useState('');
	const [isPanelOpen, setPanelOpen] = useState(false);
	const [isPanelDismissed, setPanelDismissed] = useState(false);
	const [isLiveLocationPending, setLiveLocationPending] = useState(false);
	const [liveLocationError, setLiveLocationError] = useState<string | null>(null);
	const [addressSearchMode, setAddressSearchMode] = useState<
		'idle' | 'loading' | 'results' | 'empty'
	>('idle');
	const [addressResults, setAddressResults] = useState<DistanceSearchResult[]>([]);
	const [selectedId, setSelectedId] = useState<number | undefined>(selectedIdProp);
	const [viewportWidth, setViewportWidth] = useState<number | null>(
		Math.ceil(responsiveHost.getBoundingClientRect().width) ||
			doc.defaultView?.innerWidth ||
			null
	);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const searchTermRef = useRef(searchTerm);
	const lastTrackedEventKeyRef = useRef('');
	const isMobile = isMobileViewport(viewportWidth);
	const isOpen =
		!isPanelDismissed && (isPanelOpen || (!isMobile && typeof selectedId === 'number'));
	const trimmedSearchTerm = searchTerm.trim();
	const normalizedSearchTerm = useMemo(
		() => normalizeSearchValue(trimmedSearchTerm),
		[trimmedSearchTerm]
	);
	const liveLocationLabel = __('My location', 'minimal-map');
	const hasOpenedQuickFilter = useMemo(
		() =>
			enableOpenedFilter &&
			locations.some(
				(location) =>
					location.opening_hours &&
					isOpeningHoursConfigured(location.opening_hours)
			),
		[enableOpenedFilter, locations]
	);
	const availableTags = useMemo(
		() => collectLocationTags(locations),
		[locations]
	);
	const tagFilteredLocations = useMemo(
		() => (
			enableCategoryFilter
				? filterLocationsByCategoryTagIds(locations, activeCategoryTagIds)
				: locations
		),
		[activeCategoryTagIds, enableCategoryFilter, locations]
	);
	const quickFilteredLocations = useMemo(
		() => {
			if (!isOpenedFilterActive) {
				return tagFilteredLocations;
			}

			return filterLocationsByOpenedStatus(
				tagFilteredLocations,
				siteTimezone,
				new Date(currentTimeMs)
			);
		},
		[currentTimeMs, isOpenedFilterActive, siteTimezone, tagFilteredLocations]
	);
	const indexedLocations = useMemo(
		() => buildLocationSearchIndex(quickFilteredLocations),
		[quickFilteredLocations]
	);
	const liveLocationAliases = useMemo(
		() => Array.from(
			new Set([
				liveLocationLabel,
				'My location',
				'location',
				'Mein Standort',
			].map((value) => normalizeSearchValue(value)).filter(Boolean))
		),
		[liveLocationLabel]
	);

	useEffect(() => {
		searchTermRef.current = searchTerm;
	}, [searchTerm]);

	useEffect(() => {
		if (!trimmedSearchTerm) {
			lastTrackedEventKeyRef.current = '';
		}
	}, [trimmedSearchTerm]);

	useEffect(() => {
		setSelectedId(selectedIdProp);
		setPanelDismissed(false);
	}, [selectedIdProp]);

	useEffect(() => {
		onOpenStateChange?.(isOpen);
	}, [isOpen, onOpenStateChange]);

	useEffect(() => {
		onLiveLocationStateChange?.(isLiveLocationPending);
	}, [isLiveLocationPending, onLiveLocationStateChange]);

	useEffect(() => () => {
		onLiveLocationStateChange?.(false);
	}, [onLiveLocationStateChange]);

	useEffect(() => {
		const view = doc.defaultView;

		if (!view) {
			return;
		}

		const updateViewportWidth = () => {
			const nextWidth = Math.ceil(responsiveHost.getBoundingClientRect().width);
			setViewportWidth(
				nextWidth > 0 ? nextWidth : view.innerWidth || null
			);
		};

		updateViewportWidth();

		const resizeObserver =
			typeof view.ResizeObserver === 'function'
				? new view.ResizeObserver(() => {
						updateViewportWidth();
				  })
				: null;

		resizeObserver?.observe(responsiveHost);
		view.addEventListener('resize', updateViewportWidth);

		return () => {
			resizeObserver?.disconnect();
			view.removeEventListener('resize', updateViewportWidth);
		};
	}, [doc, responsiveHost]);

	const filteredLocations = useMemo(() => {
		if (!isOpen) {
			return [];
		}

		if (!trimmedSearchTerm) {
			return quickFilteredLocations.slice(0, 50);
		}

		return searchIndexedLocations(indexedLocations, trimmedSearchTerm);
	}, [indexedLocations, isOpen, quickFilteredLocations, trimmedSearchTerm]);

	useEffect(() => {
		setAddressSearchMode('idle');
		setAddressResults([]);
	}, [quickFilteredLocations]);

	const searchMode = useMemo<SearchMode>(() => {
		if (!trimmedSearchTerm) {
			return 'text-results';
		}

		if (filteredLocations.length > 0) {
			return 'text-results';
		}

		if (addressSearchMode === 'loading') {
			return 'address-loading';
		}

		if (addressSearchMode === 'results' && addressResults.length > 0) {
			return 'address-results';
		}

		if (addressSearchMode === 'empty') {
			return 'address-empty';
		}

		return 'address-prompt';
	}, [addressResults.length, addressSearchMode, filteredLocations.length, trimmedSearchTerm]);

	const renderedResults = useMemo<SearchResultView[]>(() => {
		if (searchMode === 'address-results') {
			return addressResults.map((result) => ({
				location: result.location,
				distanceLabel: result.distanceLabel,
			}));
		}

		return filteredLocations.map((location) => ({ location }));
	}, [addressResults, filteredLocations, searchMode]);
	const liveLocationMatchesQuery = useMemo(() => {
		if (!normalizedSearchTerm || !enableLiveLocationSearch) {
			return false;
		}

		return liveLocationAliases.some(
			(alias) =>
				alias.includes(normalizedSearchTerm) ||
				normalizedSearchTerm.includes(alias)
		);
	}, [enableLiveLocationSearch, liveLocationAliases, normalizedSearchTerm]);
	const shouldShowLiveLocationCard =
		isOpen &&
		(enableLiveLocationSearch || isLiveLocationPending || liveLocationError !== null) &&
		(
			trimmedSearchTerm === '' ||
			liveLocationMatchesQuery ||
			isLiveLocationPending ||
			liveLocationError !== null
		);
	const hasRenderableResults =
		shouldShowLiveLocationCard || renderedResults.length > 0;

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setPanelOpen(false);
			}
		};

		doc.addEventListener('mousedown', handleClickOutside);

		return () => {
			doc.removeEventListener('mousedown', handleClickOutside);
		};
	}, [doc]);

	useEffect(() => {
		if (!selectedId) {
			return;
		}

		const element = doc.getElementById(`minimal-map-result-${selectedId}`);
		element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}, [doc, selectedId]);

	const handleSelect = useCallback((
		location: MapLocationPoint,
		distanceLabel?: string,
		selectionOrigin: 'tap' | 'auto' = 'tap'
	) => {
		setSelectedId(location.id);

		if (isMobileViewport(viewportWidth) && selectionOrigin === 'tap') {
			setPanelOpen(false);
		}

		if (selectionOrigin === 'tap' && onAnalyticsTrack && location.id) {
			onAnalyticsTrack({
				eventCategory: 'selection',
				interactionSource: 'search_panel',
				locationId: location.id,
				locationTitle: location.title ?? '',
				queryText: trimmedSearchTerm || undefined,
			});
		}

		onSelect({ location, distanceLabel });
	}, [onAnalyticsTrack, onSelect, trimmedSearchTerm, viewportWidth]);

	const resetAddressSearch = (nextTerm = '') => {
		searchTermRef.current = nextTerm;
		setSearchTerm(nextTerm);
		setAddressSearchMode('idle');
		setAddressResults([]);
	};

	const trackAnalyticsQuery = useCallback((payload: AnalyticsSearchTrackPayload) => {
		const queryText = payload.queryText.trim();

		if (!onAnalyticsTrack || !queryText) {
			return;
		}

		const normalizedDistance =
			typeof payload.nearestDistanceMeters === 'number'
				? Math.max(0, Math.round(payload.nearestDistanceMeters))
				: null;
		const eventKey = [
			payload.queryType,
			queryText,
			payload.resultCount,
			normalizedDistance ?? '',
		].join('::');

		if (lastTrackedEventKeyRef.current === eventKey) {
			return;
		}

		lastTrackedEventKeyRef.current = eventKey;
		onAnalyticsTrack({
			...payload,
			eventCategory: 'search',
			queryText,
			nearestDistanceMeters: normalizedDistance,
		});
	}, [onAnalyticsTrack]);

	const trackAnalyticsAction = useCallback((
		location: MapLocationPoint,
		actionType: AnalyticsActionTrackPayload['actionType'],
		actionTarget = '',
	) => {
		if (!onAnalyticsTrack || !location.id) {
			return;
		}

		onAnalyticsTrack({
			actionTarget,
			actionType,
			eventCategory: 'action',
			interactionSource: 'search_panel',
			locationId: location.id,
			locationTitle: location.title ?? '',
		});
	}, [onAnalyticsTrack]);

	const applyCoordinateSearchResults = useCallback((
		coordinates: MapCoordinates,
		nextTerm: string,
		queryType: AnalyticsQueryType,
		trackedQueryText = nextTerm
	) => {
		setSearchTerm(nextTerm);

		const nextAddressResults = buildDistanceSearchResults(
			coordinates,
			quickFilteredLocations,
		);

		setAddressResults(nextAddressResults);
		setAddressSearchMode(nextAddressResults.length > 0 ? 'results' : 'empty');

		const bestResult = nextAddressResults[0];

		if (bestResult) {
			handleSelect(bestResult.location, bestResult.distanceLabel, 'auto');
		}

		trackAnalyticsQuery({
			eventCategory: 'search',
			queryText: trackedQueryText,
			queryType,
			resultCount: nextAddressResults.length,
			nearestDistanceMeters: bestResult?.distanceMeters ?? null,
		});
	}, [handleSelect, quickFilteredLocations, trackAnalyticsQuery]);

	const formatLiveLocationError = useCallback((error?: GeolocationPositionError) => {
		if (!error) {
			return __('Live location could not be loaded.', 'minimal-map');
		}

		if (error.code === error.PERMISSION_DENIED) {
			return __('Location access was denied.', 'minimal-map');
		}

		if (error.code === error.POSITION_UNAVAILABLE) {
			if (isTransientLiveLocationError(error)) {
				return __('Current location is still being determined. Please try again in a moment.', 'minimal-map');
			}

			return __('Current location is unavailable.', 'minimal-map');
		}

		if (error.code === error.TIMEOUT) {
			return __('Location request timed out.', 'minimal-map');
		}

		return __('Live location could not be loaded.', 'minimal-map');
	}, []);

	const handleAddressSearch = useCallback(async (
		queryOverride?: string,
		queryTypeOverride?: AnalyticsQueryType,
		trackedQueryTextOverride?: string,
	): Promise<void> => {
		const query = (queryOverride ?? searchTermRef.current).trim();

		if (query === '' || addressSearchMode === 'loading') {
			return;
		}

		const parsedCoordinates = parseCoordinateSearchValue(query);

		if (parsedCoordinates) {
			applyCoordinateSearchResults(
				parsedCoordinates,
				query,
				queryTypeOverride === 'live_location' ? 'live_location' : 'coordinates',
				trackedQueryTextOverride ?? query
			);
			return;
		}

		if (filteredLocations.length > 0 || !frontendGeocodePath) {
			return;
		}

		searchTermRef.current = query;
		setSearchTerm(query);
		setAddressSearchMode('loading');
		setAddressResults([]);

		let result: GeocodeResponse;

		try {
			result = await geocodeSearch(query);
		} catch {
			if (searchTermRef.current.trim() !== query) {
				return;
			}

			setAddressSearchMode('empty');
			trackAnalyticsQuery({
				eventCategory: 'search',
				queryText: trackedQueryTextOverride ?? query,
				queryType: queryTypeOverride ?? 'address',
				resultCount: 0,
				nearestDistanceMeters: null,
			});
			return;
		}

		if (searchTermRef.current.trim() !== query) {
			return;
		}

		if (!result.success) {
			setAddressSearchMode('empty');
			trackAnalyticsQuery({
				eventCategory: 'search',
				queryText: trackedQueryTextOverride ?? query,
				queryType: queryTypeOverride ?? 'address',
				resultCount: 0,
				nearestDistanceMeters: null,
			});
			return;
		}

		applyCoordinateSearchResults(
			{
				lat: result.lat,
				lng: result.lng,
			},
			query,
			queryTypeOverride ?? 'address',
			trackedQueryTextOverride ?? query
		);
	}, [
		addressSearchMode,
		applyCoordinateSearchResults,
		filteredLocations.length,
		frontendGeocodePath,
		geocodeSearch,
		trackAnalyticsQuery,
	]);

	const requestLiveLocation = useCallback(() => {
		if (isLiveLocationPending) {
			return;
		}

		setPanelDismissed(false);
		setPanelOpen(true);
		setLiveLocationError(null);
		inputRef.current?.focus();

		const geolocation = doc.defaultView?.navigator?.geolocation;

		if (!geolocation) {
			setLiveLocationError(
				__('Live location is not supported in this browser.', 'minimal-map')
			);
			return;
		}

		setLiveLocationPending(true);

		void (async () => {
			try {
				const coordinates = await requestBrowserLocation(
					geolocation,
					PRIMARY_LIVE_LOCATION_OPTIONS
				);

				const formattedCoordinates = formatCoordinateSearchValue(coordinates);

				setLiveLocationPending(false);
				setLiveLocationError(null);
				void handleAddressSearch(
					formattedCoordinates,
					'live_location',
					liveLocationLabel
				);
			} catch (error) {
				if (
					isTransientLiveLocationError(error as GeolocationPositionError)
				) {
					try {
						const coordinates = await requestBrowserLocation(
							geolocation,
							FALLBACK_LIVE_LOCATION_OPTIONS
						);
						const formattedCoordinates = formatCoordinateSearchValue(coordinates);

						setLiveLocationPending(false);
						setLiveLocationError(null);
						void handleAddressSearch(
							formattedCoordinates,
							'live_location',
							liveLocationLabel
						);
						return;
					} catch (retryError) {
						setLiveLocationPending(false);
						setLiveLocationError(
							formatLiveLocationError(retryError as GeolocationPositionError)
						);
						return;
					}
				}

				setLiveLocationPending(false);
				setLiveLocationError(
					formatLiveLocationError(error as GeolocationPositionError)
				);
			}
		})();
	}, [doc.defaultView, formatLiveLocationError, handleAddressSearch, isLiveLocationPending, liveLocationLabel]);

	useEffect(() => {
		onLiveLocationActionChange?.(requestLiveLocation);
	}, [onLiveLocationActionChange, requestLiveLocation]);

	const toggleCategoryTagId = (tagId: number) => {
		const nextActiveTagIds = activeCategoryTagIds.includes(tagId)
			? activeCategoryTagIds.filter((activeTagId) => activeTagId !== tagId)
			: [ ...activeCategoryTagIds, tagId ];

		onCategoryFilterChange(nextActiveTagIds);
	};

	const renderQuickFilters = () => {
		if (!hasOpenedQuickFilter && (!enableCategoryFilter || availableTags.length === 0)) {
			return null;
		}

		return (
			<div className="minimal-map-search__quick-filters">
				{hasOpenedQuickFilter ? (
					<button
						type="button"
						className={`minimal-map-search__quick-filter-pill${
							isOpenedFilterActive ? ' is-selected' : ''
						}`}
						aria-pressed={isOpenedFilterActive}
						onClick={() => onOpenedFilterChange(!isOpenedFilterActive)}
					>
						{__('Opened', 'minimal-map')}
					</button>
				) : null}
				{enableCategoryFilter ? availableTags.map((tag) => (
					<button
						key={tag.id}
						type="button"
						className={`minimal-map-search__quick-filter-pill${
							activeCategoryTagIds.includes(tag.id) ? ' is-selected' : ''
						}`}
						aria-pressed={activeCategoryTagIds.includes(tag.id)}
						onClick={() => toggleCategoryTagId(tag.id)}
					>
						{tag.name}
					</button>
				)) : null}
			</div>
		);
	};

	const renderResultCards = () => (
		<div className="minimal-map-search__results">
			{shouldShowLiveLocationCard ? (
				<LiveLocationResultCard
					errorMessage={liveLocationError}
					isPending={isLiveLocationPending}
					label={liveLocationLabel}
					onSelect={requestLiveLocation}
				/>
			) : null}
			{renderedResults.map(({ location, distanceLabel }) => (
				<LocationResultCard
					analyticsSource="search_panel"
					key={location.id}
					distanceLabel={distanceLabel}
					googleMapsButtonShowIcon={googleMapsButtonShowIcon}
					googleMapsNavigation={googleMapsNavigation}
					id={`minimal-map-result-${location.id}`}
					isSelected={selectedId === location.id}
					location={location}
					mode="search"
					onAnalyticsAction={(actionType, actionTarget) => {
						trackAnalyticsAction(location, actionType, actionTarget);
					}}
					onSelect={handleSelect}
					siteLocale={siteLocale}
					siteTimezone={siteTimezone}
				/>
			))}
		</div>
	);

	const handleSearchInput = (nextValue: string) => {
		resetAddressSearch(nextValue);
	};

	const handleSearchFocus = () => {
		setPanelDismissed(false);
		setPanelOpen(true);
	};

	const dismissSearchPanel = () => {
		setPanelOpen(false);
		setPanelDismissed(true);
		inputRef.current?.blur();
		onEscape?.();
	};

	const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Escape') {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		dismissSearchPanel();
	};

	const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const submittedQuery = inputRef.current?.value ?? searchTermRef.current;
		void handleAddressSearch(submittedQuery);
	};

	useEffect(() => {
		if (
			!isOpen ||
			!trimmedSearchTerm ||
			addressSearchMode === 'loading' ||
			parseCoordinateSearchValue(trimmedSearchTerm) ||
			liveLocationMatchesQuery
		) {
			return undefined;
		}

		const timeoutId = window.setTimeout(() => {
			trackAnalyticsQuery({
				eventCategory: 'search',
				queryText: trimmedSearchTerm,
				queryType: 'text',
				resultCount: filteredLocations.length,
				nearestDistanceMeters: null,
			});
		}, 450);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [
		isOpen,
		addressSearchMode,
		filteredLocations.length,
		liveLocationMatchesQuery,
		trackAnalyticsQuery,
		trimmedSearchTerm,
	]);

	return (
		<>
			{isOpen ? (
				<div
					className="minimal-map-search-backdrop"
					onClick={() => setPanelOpen(false)}
				/>
			) : null}
			<div
				ref={containerRef}
				className={`minimal-map-search ${isOpen ? 'is-focused' : ''}`}
			>
				<form
					className="minimal-map-search__input-wrapper"
					onSubmit={handleSearchSubmit}
				>
					<div className="minimal-map-search__icon-container">
						<Search size={18} />
					</div>
					<input
						ref={inputRef}
						type="search"
						className="minimal-map-search__input"
						value={searchTerm}
						onChange={(event) => handleSearchInput(event.target.value)}
						onInput={(event) =>
							handleSearchInput(
								(event.target as HTMLInputElement | null)?.value ?? '',
							)
						}
						onFocus={handleSearchFocus}
						onKeyDown={handleSearchKeyDown}
						enterKeyHint="search"
						placeholder={__('Search locations...', 'minimal-map')}
						aria-label={__('Search locations', 'minimal-map')}
					/>
					{searchTerm ? (
						<button
							type="button"
							className="minimal-map-search__clear"
							onClick={() => resetAddressSearch('')}
							aria-label={__('Clear search', 'minimal-map')}
						>
							<X size={16} />
						</button>
					) : null}
				</form>

				{renderQuickFilters()}

				{isOpen ? (
					<div className="minimal-map-search__results-container">
						{hasRenderableResults ? (
							renderResultCards()
						) : searchMode === 'address-prompt' ? (
							<div className="minimal-map-search__state">
								<LoaderCircle
									size={24}
									className="minimal-map-search__state-spinner"
								/>
								<div className="minimal-map-search__state-message">
									{__('Press', 'minimal-map')} <Kbd variant="search">Enter</Kbd>{' '}
									{__('to load results', 'minimal-map')}
								</div>
							</div>
						) : searchMode === 'address-loading' ? (
							<div className="minimal-map-search__state">
								<LoaderCircle
									size={24}
									className="minimal-map-search__state-spinner"
								/>
								<div className="minimal-map-search__state-message">
									{__('Loading results...', 'minimal-map')}
								</div>
							</div>
						) : searchMode === 'address-empty' ? (
							<div className="minimal-map-search__state">
								<SearchX
									size={24}
									className="minimal-map-search__state-icon"
								/>
								<div className="minimal-map-search__state-message">
									{__('No locations found', 'minimal-map')}
								</div>
							</div>
						) : null}
					</div>
				) : null}
			</div>
		</>
	);
};

export interface WordPressSearchControl {
	destroy: () => void;
	requestLiveLocation: () => void;
	update: (
		config: NormalizedMapConfig,
		selectedId?: number,
		activeCategoryTagIds?: number[],
		isOpenedFilterActive?: boolean,
		currentTimeMs?: number
	) => void;
}

export function createWordPressSearchControl(
	host: HTMLElement,
	initialConfig: NormalizedMapConfig,
	frontendGeocodePath?: string,
	initialSelectedId?: number,
	onLocationSelect?: (selection: MapLocationSelection) => void,
	geocodeSearchFn?: GeocodeSearchFn,
	initialActiveCategoryTagIds: number[] = [],
	initialIsOpenedFilterActive = false,
	onCategoryFilterChange?: (tagIds: number[]) => void,
	onOpenedFilterChange?: (isActive: boolean) => void,
	onEscape?: () => void,
	onOpenStateChange?: (isOpen: boolean) => void,
	onLiveLocationStateChange?: (isBusy: boolean) => void,
	onAnalyticsTrack?: (payload: AnalyticsTrackPayload) => void,
): WordPressSearchControl {
	const context = getMapDomContext(host);
	const container = context.doc.createElement('div');
	let requestLiveLocationAction = () => {};
	container.className = 'minimal-map-search-host';

	container.style.position = 'absolute';
	container.style.top = '0';
	container.style.left = '0';
	container.style.right = '0';
	container.style.bottom = '0';
	container.style.zIndex = '10';
	container.style.pointerEvents = 'none';

	host.appendChild(container);

	const root = createRoot(container);
	const geocodeSearch =
		geocodeSearchFn ??
		((query: string) => {
			if (!frontendGeocodePath) {
				return Promise.resolve({
					success: false,
					message: __('No locations found', 'minimal-map'),
				} satisfies GeocodeResponse);
			}

			return geocodeSearchQuery(frontendGeocodePath, query);
		});

	const onSelect = (selection: MapLocationSelection) => {
		onLocationSelect?.(selection);
	};

	const render = (
		config: NormalizedMapConfig,
		selectedId?: number,
		activeCategoryTagIds: number[] = [],
		isOpenedFilterActive = false,
		currentTimeMs = Date.now()
	) => {
		applySearchPanelCssVariables(container, config);
		root.render(
			<MapSearchControl
				activeCategoryTagIds={activeCategoryTagIds}
				currentTimeMs={currentTimeMs}
				doc={context.doc}
				enableCategoryFilter={config.enableCategoryFilter}
				enableOpenedFilter={config.enableOpenedFilter}
				enableLiveLocationSearch={config.enableLiveLocationSearch}
				frontendGeocodePath={frontendGeocodePath}
				geocodeSearch={geocodeSearch}
				googleMapsNavigation={config.googleMapsNavigation}
				googleMapsButtonShowIcon={config.googleMapsButtonShowIcon}
				host={host}
				isOpenedFilterActive={isOpenedFilterActive}
				locations={config.locations}
				onCategoryFilterChange={onCategoryFilterChange ?? (() => {})}
				onOpenedFilterChange={onOpenedFilterChange ?? (() => {})}
				onEscape={onEscape}
				onLiveLocationActionChange={(action) => {
					requestLiveLocationAction = action;
				}}
				onLiveLocationStateChange={onLiveLocationStateChange}
				onOpenStateChange={onOpenStateChange}
				onAnalyticsTrack={onAnalyticsTrack}
				onSelect={onSelect}
				selectedId={selectedId}
				siteLocale={config.siteLocale}
				siteTimezone={config.siteTimezone}
			/>
		);
	};

	render(
		initialConfig,
		initialSelectedId,
		initialActiveCategoryTagIds,
		initialIsOpenedFilterActive
	);

	return {
		destroy() {
			requestLiveLocationAction = () => {};
			root.unmount();
			container.remove();
		},
		requestLiveLocation() {
			requestLiveLocationAction();
		},
		update(
			config,
			selectedId,
			activeCategoryTagIds = [],
			isOpenedFilterActive = false,
			currentTimeMs = Date.now()
		) {
			render(
				config,
				selectedId,
				activeCategoryTagIds,
				isOpenedFilterActive,
				currentTimeMs
			);
		},
	};
}

import { Card, CardBody, Spinner } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import {
	BarChart3,
	ChartColumn,
	MapPin,
	PieChart,
	Route,
	Search,
	SearchX,
	Target,
} from 'lucide-react';
import type { AnalyticsBreakdownDatum, AnalyticsSummary } from '../../types';
import { normalizeAnalyticsSummary } from '../../lib/analytics/normalizeAnalyticsSummary';
import AnalyticsSparkline, { formatPercentage } from './AnalyticsSparkline';
import AnimatedNumber, { type AnimatedNumberProps } from '../AnimatedNumber';

function formatMetricValue(value: number | null, suffix = ''): string {
	if (value === null) {
		return '—';
	}

	return `${Math.round(value)}${suffix}`;
}

function formatSparklineDistance(value: number | null): string {
	if (value === null) {
		return '—';
	}

	if (value >= 1000) {
		return `${(value / 1000).toFixed(1)} km`;
	}

	return `${Math.round(value)} m`;
}

function getTopBreakdownItem(items: AnalyticsBreakdownDatum[]): AnalyticsBreakdownDatum | null {
	return items.length > 0 ? items[0] : null;
}

function getDominantBreakdownItem(items: AnalyticsBreakdownDatum[]): AnalyticsBreakdownDatum | null {
	if (items.length === 0) {
		return null;
	}

	return [...items].sort((left, right) => right.value - left.value)[0] ?? null;
}

export function getAnalyticsSectionTitle(category: AnalyticsSummary['category']): string {
	switch (category) {
		case 'selection':
			return __('Selection', 'minimal-map');
		case 'action':
			return __('Action', 'minimal-map');
		case 'search':
		default:
			return __('Search', 'minimal-map');
	}
}

export default function AnalyticsCards({
	isLoading,
	siteLocale,
	summary,
}: {
	isLoading: boolean;
	siteLocale: string;
	summary: AnalyticsSummary;
}) {
	const safeSummary = normalizeAnalyticsSummary(summary);

	const createCountValue = (value: number | null, suffix = ''): AnimatedNumberProps => ({
		locale: siteLocale,
		suffix,
		value,
	});

	const createPercentageValue = (value: number | null): AnimatedNumberProps => ({
		locale: siteLocale,
		suffix: '%',
		value,
	});

	const createDistanceValue = (distanceMeters: number | null, hasData: boolean): AnimatedNumberProps => {
		if (!hasData || distanceMeters === null) {
			return {
				locale: siteLocale,
				value: null,
			};
		}

		if (distanceMeters >= 1000) {
			return {
				decimals: 1,
				locale: siteLocale,
				suffix: ' km',
				value: distanceMeters / 1000,
			};
		}

		return {
			locale: siteLocale,
			suffix: ' m',
			value: Math.round(distanceMeters),
		};
	};

	if (safeSummary.category === 'selection') {
		const hasData = safeSummary.totalSelections > 0;
		const topLocation = getTopBreakdownItem(safeSummary.breakdowns.topLocations);
		const dominantSource = getDominantBreakdownItem(safeSummary.breakdowns.sourceMix);
		const dominantSourceShare = dominantSource && hasData
			? (dominantSource.value / safeSummary.totalSelections) * 100
			: null;

		const cards = [
			{
				id: 'selection-total',
				icon: <ChartColumn aria-hidden="true" size={22} strokeWidth={1.8} />,
				title: __('Total selections', 'minimal-map'),
				value: createCountValue(hasData ? safeSummary.totalSelections : null),
				description: __('Explicit location picks from search or marker clicks.', 'minimal-map'),
				chart: (
					<AnalyticsSparkline
						ariaLabel={__('Total selections trend', 'minimal-map')}
						formatTooltipValue={formatMetricValue}
						isEmpty={!hasData}
						series={safeSummary.series.totalSelections}
						variant="line"
					/>
				),
			},
			{
				id: 'selection-conversion',
				icon: <Target aria-hidden="true" size={22} strokeWidth={1.8} />,
				title: __('Search-to-selection conversion', 'minimal-map'),
				value: createPercentageValue(hasData ? safeSummary.conversionRate : null),
				description: __('How often searches turn into a location choice.', 'minimal-map'),
				chart: (
					<AnalyticsSparkline
						ariaLabel={__('Selection conversion trend', 'minimal-map')}
						formatTooltipValue={formatPercentage}
						isEmpty={!hasData}
						series={safeSummary.series.conversionRate}
						variant="line"
					/>
				),
			},
			{
				id: 'selection-source-mix',
				icon: <PieChart aria-hidden="true" size={22} strokeWidth={1.8} />,
				title: __('Selection source mix', 'minimal-map'),
				value: createPercentageValue(dominantSourceShare),
				description: dominantSource && dominantSourceShare !== null
					? sprintf(
						__('%1$s leads with %2$s.', 'minimal-map'),
						dominantSource.label,
						formatPercentage(dominantSourceShare),
					)
					: __('Where people choose locations from.', 'minimal-map'),
				chart: (
					<AnalyticsSparkline
						ariaLabel={__('Selection source mix', 'minimal-map')}
						data={safeSummary.breakdowns.sourceMix}
						isEmpty={!hasData}
						variant="donut"
					/>
				),
			},
			{
				id: 'selection-top-locations',
				icon: <MapPin aria-hidden="true" size={22} strokeWidth={1.8} />,
				title: __('Top selected locations', 'minimal-map'),
				value: createCountValue(topLocation?.value ?? null),
				description: topLocation
					? sprintf(__('Most selected: %s', 'minimal-map'), topLocation.label)
					: __('No selected locations in this period yet.', 'minimal-map'),
				chart: (
					<AnalyticsSparkline
						ariaLabel={__('Top selected locations', 'minimal-map')}
						data={safeSummary.breakdowns.topLocations}
						isEmpty={!hasData}
						variant="bar"
					/>
				),
			},
		];

		return (
			<div className="minimal-map-admin__analytics-cards">
				{cards.map((card) => (
					<Card key={card.id} className="minimal-map-admin__feature-card minimal-map-admin__analytics-card">
						<CardBody>
							<div className="minimal-map-admin__analytics-card-chart" aria-busy={isLoading}>
								{card.chart}
								{isLoading ? (
									<div className="minimal-map-admin__analytics-card-chart-spinner">
										<Spinner />
									</div>
								) : null}
							</div>
							<div className="minimal-map-admin__feature-meta">
								<span className="minimal-map-admin__feature-icon">{card.icon}</span>
								<AnimatedNumber
									{...card.value}
									className="minimal-map-admin__analytics-card-value"
								/>
							</div>
							<h3 className="minimal-map-admin__feature-title">{card.title}</h3>
							<p className="minimal-map-admin__analytics-card-description">{card.description}</p>
						</CardBody>
					</Card>
				))}
			</div>
		);
	}

	if (safeSummary.category === 'action') {
		const hasData = safeSummary.totalActions > 0;
		const topLocation = getTopBreakdownItem(safeSummary.breakdowns.topLocations);
		const dominantActionType = getDominantBreakdownItem(safeSummary.breakdowns.actionTypeMix);
		const dominantSource = getDominantBreakdownItem(safeSummary.breakdowns.sourceMix);
		const dominantActionTypeShare = dominantActionType && hasData
			? (dominantActionType.value / safeSummary.totalActions) * 100
			: null;
		const dominantSourceShare = dominantSource && hasData
			? (dominantSource.value / safeSummary.totalActions) * 100
			: null;

		const cards = [
			{
				id: 'action-total',
				icon: <ChartColumn aria-hidden="true" size={22} strokeWidth={1.8} />,
				title: __('Total actions', 'minimal-map'),
				value: createCountValue(hasData ? safeSummary.totalActions : null),
				description: __('Clicks and expansions after a location is viewed.', 'minimal-map'),
				chart: (
					<AnalyticsSparkline
						ariaLabel={__('Total actions trend', 'minimal-map')}
						formatTooltipValue={formatMetricValue}
						isEmpty={!hasData}
						series={safeSummary.series.totalActions}
						variant="line"
					/>
				),
			},
			{
				id: 'action-type-mix',
				icon: <PieChart aria-hidden="true" size={22} strokeWidth={1.8} />,
				title: __('Action type mix', 'minimal-map'),
				value: createPercentageValue(dominantActionTypeShare),
				description: dominantActionType && dominantActionTypeShare !== null
					? sprintf(
						__('%1$s leads with %2$s.', 'minimal-map'),
						dominantActionType.label,
						formatPercentage(dominantActionTypeShare),
					)
					: __('Which follow-up actions visitors use most.', 'minimal-map'),
				chart: (
					<AnalyticsSparkline
						ariaLabel={__('Action type mix', 'minimal-map')}
						data={safeSummary.breakdowns.actionTypeMix}
						isEmpty={!hasData}
						variant="donut"
					/>
				),
			},
			{
				id: 'action-source-mix',
				icon: <BarChart3 aria-hidden="true" size={22} strokeWidth={1.8} />,
				title: __('Action source mix', 'minimal-map'),
				value: createPercentageValue(dominantSourceShare),
				description: dominantSource && dominantSourceShare !== null
					? sprintf(
						__('%1$s drives %2$s of actions.', 'minimal-map'),
						dominantSource.label,
						formatPercentage(dominantSourceShare),
					)
					: __('Where follow-up actions happen most often.', 'minimal-map'),
				chart: (
					<AnalyticsSparkline
						ariaLabel={__('Action source mix', 'minimal-map')}
						data={safeSummary.breakdowns.sourceMix}
						isEmpty={!hasData}
						variant="donut"
					/>
				),
			},
			{
				id: 'action-top-locations',
				icon: <MapPin aria-hidden="true" size={22} strokeWidth={1.8} />,
				title: __('Top locations by actions', 'minimal-map'),
				value: createCountValue(topLocation?.value ?? null),
				description: topLocation
					? sprintf(__('Most actioned: %s', 'minimal-map'), topLocation.label)
					: __('No tracked actions in the selected period.', 'minimal-map'),
				chart: (
					<AnalyticsSparkline
						ariaLabel={__('Top locations by actions', 'minimal-map')}
						data={safeSummary.breakdowns.topLocations}
						isEmpty={!hasData}
						variant="bar"
					/>
				),
			},
		];

		return (
			<div className="minimal-map-admin__analytics-cards">
				{cards.map((card) => (
					<Card key={card.id} className="minimal-map-admin__feature-card minimal-map-admin__analytics-card">
						<CardBody>
							<div className="minimal-map-admin__analytics-card-chart" aria-busy={isLoading}>
								{card.chart}
								{isLoading ? (
									<div className="minimal-map-admin__analytics-card-chart-spinner">
										<Spinner />
									</div>
								) : null}
							</div>
							<div className="minimal-map-admin__feature-meta">
								<span className="minimal-map-admin__feature-icon">{card.icon}</span>
								<AnimatedNumber
									{...card.value}
									className="minimal-map-admin__analytics-card-value"
								/>
							</div>
							<h3 className="minimal-map-admin__feature-title">{card.title}</h3>
							<p className="minimal-map-admin__analytics-card-description">{card.description}</p>
						</CardBody>
					</Card>
				))}
			</div>
		);
	}

	const hasData = safeSummary.totalSearches > 0;
	const topQuery = getTopBreakdownItem(safeSummary.breakdowns.topQueries);
	const topZeroResultQuery = getTopBreakdownItem(safeSummary.breakdowns.topZeroResultQueries);
	const dominantQueryType = getDominantBreakdownItem(safeSummary.breakdowns.queryTypeMix);
	const dominantResultBucket = getDominantBreakdownItem(safeSummary.breakdowns.resultDistribution);
	const dominantQueryTypeShare = dominantQueryType && hasData
		? (dominantQueryType.value / safeSummary.totalSearches) * 100
		: null;
	const dominantResultBucketShare = dominantResultBucket && hasData
		? (dominantResultBucket.value / safeSummary.totalSearches) * 100
		: null;

	const cards = [
		{
			id: 'total',
			icon: <ChartColumn aria-hidden="true" size={22} strokeWidth={1.8} />,
			title: __('Total searches', 'minimal-map'),
			value: createCountValue(hasData ? safeSummary.totalSearches : null),
			description: __('Demand across the selected period.', 'minimal-map'),
			chart: (
				<AnalyticsSparkline
					ariaLabel={__('Total searches trend', 'minimal-map')}
					formatTooltipValue={formatMetricValue}
					isEmpty={!hasData}
					series={safeSummary.series.totalSearches}
					variant="line"
				/>
			),
		},
		{
			id: 'success-rate',
			icon: <Target aria-hidden="true" size={22} strokeWidth={1.8} />,
			title: __('Success rate', 'minimal-map'),
			value: createPercentageValue(hasData ? safeSummary.successRate : null),
			description: __('Searches returning at least one result.', 'minimal-map'),
			chart: (
				<AnalyticsSparkline
					ariaLabel={__('Success rate trend', 'minimal-map')}
					formatTooltipValue={formatPercentage}
					isEmpty={!hasData}
					series={safeSummary.series.successRate}
					variant="line"
				/>
			),
		},
		{
			id: 'zero',
			icon: <SearchX aria-hidden="true" size={22} strokeWidth={1.8} />,
			title: __('Zero-result searches', 'minimal-map'),
			value: createCountValue(hasData ? safeSummary.zeroResultSearches : null),
			description: __('Searches with no matching location.', 'minimal-map'),
			chart: (
				<AnalyticsSparkline
					ariaLabel={__('Zero-result searches trend', 'minimal-map')}
					formatTooltipValue={formatMetricValue}
					isEmpty={!hasData}
					series={safeSummary.series.zeroResultSearches}
					variant="line"
				/>
			),
		},
		{
			id: 'distance',
			icon: <Route aria-hidden="true" size={22} strokeWidth={1.8} />,
			title: __('Average distance to nearest store', 'minimal-map'),
			value: createDistanceValue(safeSummary.averageNearestDistanceMeters, hasData),
			description: __('Average distance for searches with a nearby match.', 'minimal-map'),
			chart: (
				<AnalyticsSparkline
					ariaLabel={__('Average distance trend', 'minimal-map')}
					formatTooltipValue={formatSparklineDistance}
					isEmpty={!hasData && safeSummary.averageNearestDistanceMeters === null}
					series={safeSummary.series.averageNearestDistanceMeters}
					variant="line"
				/>
			),
		},
		{
			id: 'top-queries',
			icon: <Search aria-hidden="true" size={22} strokeWidth={1.8} />,
			title: __('Top search terms', 'minimal-map'),
			value: createCountValue(topQuery?.value ?? null),
			description: topQuery
				? sprintf(__('Most searched: %s', 'minimal-map'), topQuery.label)
				: __('No repeated search terms yet.', 'minimal-map'),
			chart: (
				<AnalyticsSparkline
					ariaLabel={__('Top search terms', 'minimal-map')}
					data={safeSummary.breakdowns.topQueries}
					isEmpty={!hasData}
					variant="bar"
				/>
			),
		},
		{
			id: 'top-zero-queries',
			icon: <SearchX aria-hidden="true" size={22} strokeWidth={1.8} />,
			title: __('Top zero-result searches', 'minimal-map'),
			value: createCountValue(topZeroResultQuery?.value ?? null),
			description: topZeroResultQuery
				? sprintf(__('Most requested without a result: %s', 'minimal-map'), topZeroResultQuery.label)
				: __('No failed searches in the selected period.', 'minimal-map'),
			chart: (
				<AnalyticsSparkline
					ariaLabel={__('Top zero-result searches', 'minimal-map')}
					data={safeSummary.breakdowns.topZeroResultQueries}
					isEmpty={!hasData}
					variant="bar"
				/>
			),
		},
		{
			id: 'query-type-mix',
			icon: <PieChart aria-hidden="true" size={22} strokeWidth={1.8} />,
			title: __('Query type mix', 'minimal-map'),
			value: createPercentageValue(dominantQueryTypeShare),
			description: dominantQueryType && dominantQueryTypeShare !== null
				? sprintf(
					__('%1$s leads with %2$s.', 'minimal-map'),
					dominantQueryType.label,
					formatPercentage(dominantQueryTypeShare),
				)
				: __('How visitors are searching your map.', 'minimal-map'),
			chart: (
				<AnalyticsSparkline
					ariaLabel={__('Query type mix', 'minimal-map')}
					data={safeSummary.breakdowns.queryTypeMix}
					isEmpty={!hasData}
					variant="donut"
				/>
			),
		},
		{
			id: 'result-distribution',
			icon: <BarChart3 aria-hidden="true" size={22} strokeWidth={1.8} />,
			title: __('Result distribution', 'minimal-map'),
			value: createPercentageValue(dominantResultBucketShare),
			description: dominantResultBucket && dominantResultBucketShare !== null
				? sprintf(
					__('%1$s is the largest bucket at %2$s.', 'minimal-map'),
					dominantResultBucket.label,
					formatPercentage(dominantResultBucketShare),
				)
				: __('How many results each search returned.', 'minimal-map'),
			chart: (
				<AnalyticsSparkline
					ariaLabel={__('Result distribution', 'minimal-map')}
					data={safeSummary.breakdowns.resultDistribution}
					isEmpty={!hasData}
					variant="donut"
				/>
			),
		},
	];

	return (
		<div className="minimal-map-admin__analytics-cards">
			{cards.map((card) => (
				<Card key={card.id} className="minimal-map-admin__feature-card minimal-map-admin__analytics-card">
					<CardBody>
						<div className="minimal-map-admin__analytics-card-chart" aria-busy={isLoading}>
							{card.chart}
							{isLoading ? (
								<div className="minimal-map-admin__analytics-card-chart-spinner">
									<Spinner />
								</div>
							) : null}
						</div>
						<div className="minimal-map-admin__feature-meta">
							<span className="minimal-map-admin__feature-icon">{card.icon}</span>
							<AnimatedNumber
								{...card.value}
								className="minimal-map-admin__analytics-card-value"
							/>
						</div>
						<h3 className="minimal-map-admin__feature-title">{card.title}</h3>
						<p className="minimal-map-admin__analytics-card-description">{card.description}</p>
					</CardBody>
				</Card>
			))}
		</div>
	);
}

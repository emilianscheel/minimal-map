import { Button, Card, CardBody } from '@wordpress/components';
import { useEffect, useMemo, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import ContentHeader from '../ContentHeader';
import { CARD_VIEWS } from '../app-config';
import AdminSectionIcon from '../AdminSectionIcon';
import AnimatedNumber from '../AnimatedNumber';
import { createMinimalMap } from '../../map/bootstrap';
import type { DashboardCardView, MinimalMapInstance, RawMapConfig } from '../../types';
import type { AdminSectionComponentProps } from './types';

const CARD_COPY: Record<DashboardCardView, string> = {
	analytics: __('Inspect search demand, result quality, and nearest-distance patterns without leaving the admin panel.', 'minimal-map'),
	locations: __('Manage every place you want to render on your maps and prepare it for future block integrations.', 'minimal-map'),
	collections: __('Build reusable groups of locations and curate map-ready sets without changing the location editor flow.', 'minimal-map'),
	logos: __('Upload reusable SVG logos and assign them across multiple locations without duplicating assets.', 'minimal-map'),
	markers: __('Create marker variants and keep your map pin system consistent across locations and styles.', 'minimal-map'),
	tags: __('Add lightweight labels that make large map datasets easier to sort, search, and evolve.', 'minimal-map'),
	styles: __('Shape the visual language of your maps with reusable themes and live preview adjustments.', 'minimal-map'),
};

const CTA_COPY: Record<DashboardCardView, string> = {
	analytics: __('Open analytics', 'minimal-map'),
	locations: __('Open locations', 'minimal-map'),
	collections: __('Open collections', 'minimal-map'),
	logos: __('Open logos', 'minimal-map'),
	markers: __('Open markers', 'minimal-map'),
	tags: __('Open tags', 'minimal-map'),
	styles: __('Open styles', 'minimal-map'),
};

type DashboardCardCountDisplay =
	| { type: 'animated'; value: number }
	| { label: string; type: 'static' };

const COUNT_DISPLAYS: Record<DashboardCardView, (
	appConfig: AdminSectionComponentProps['appConfig']
) => DashboardCardCountDisplay> = {
	analytics: (appConfig) => ({
		label: appConfig.analyticsConfig.enabled
			? __('On', 'minimal-map')
			: __('Off', 'minimal-map'),
		type: 'static',
	}),
	locations: (appConfig) => ({
		type: 'animated',
		value: typeof appConfig.stats.locations === 'number' ? appConfig.stats.locations : 0,
	}),
	collections: (appConfig) => ({
		type: 'animated',
		value: typeof appConfig.stats.collections === 'number' ? appConfig.stats.collections : 0,
	}),
	logos: (appConfig) => ({
		type: 'animated',
		value: typeof appConfig.stats.logos === 'number' ? appConfig.stats.logos : 0,
	}),
	markers: (appConfig) => ({
		type: 'animated',
		value: typeof appConfig.stats.markers === 'number' ? appConfig.stats.markers : 0,
	}),
	tags: (appConfig) => ({
		type: 'animated',
		value: typeof appConfig.stats.tags === 'number' ? appConfig.stats.tags : 0,
	}),
	styles: (appConfig) => ({
		type: 'animated',
		value: appConfig.mapConfig.styleThemes?.length ?? 0,
	}),
};

function DashboardCard({ appConfig, view, title, url }: {
	appConfig: AdminSectionComponentProps['appConfig'];
	view: DashboardCardView;
	title: string;
	url: string;
}) {
	const countDisplay = COUNT_DISPLAYS[view](appConfig);

	return (
		<Card className="minimal-map-admin__feature-card">
			<CardBody>
				<div className="minimal-map-admin__feature-meta">
					<span className="minimal-map-admin__feature-icon">
						<AdminSectionIcon view={view} />
					</span>
					{countDisplay.type === 'animated' ? (
						<AnimatedNumber
							className="minimal-map-admin__feature-count"
							locale={appConfig.mapConfig.siteLocale}
							value={countDisplay.value}
						/>
					) : (
						<span className="minimal-map-admin__feature-count">{countDisplay.label}</span>
					)}
				</div>
				<h3 className="minimal-map-admin__feature-title">{title}</h3>
				<p className="minimal-map-admin__feature-description">{CARD_COPY[view]}</p>
				<Button href={url} variant="link" className="minimal-map-admin__feature-link">
					{CTA_COPY[view]}
				</Button>
			</CardBody>
		</Card>
	);
}

export default function DashboardSection({
	activeSection,
	appConfig,
	sectionMap,
}: AdminSectionComponentProps) {
	const mapHostRef = useRef<HTMLDivElement | null>(null);
	const mapInstanceRef = useRef<MinimalMapInstance | null>(null);
	const mapConfig = useMemo<RawMapConfig>(() => ({
		centerLat: 52.517,
		centerLng: 13.388,
		zoom: 9.5,
		height: 100,
		heightUnit: '%',
		stylePreset: 'positron',
		showZoomControls: true,
		scrollZoom: true,
	}), []);

	useEffect(() => {
		if (!mapHostRef.current) {
			return undefined;
		}

		mapInstanceRef.current = createMinimalMap(
			mapHostRef.current,
			mapConfig,
			{
				...(appConfig.mapConfig ?? {}),
				autoFetchLocations: false,
			}
		);

		return () => {
			mapInstanceRef.current?.destroy();
			mapInstanceRef.current = null;
		};
	}, [appConfig.mapConfig, mapConfig]);

	return (
		<>
			<ContentHeader title={activeSection.title} description={activeSection.description} />
			<div className="minimal-map-admin__content minimal-map-admin__content--dashboard">
				<div className="minimal-map-admin__dashboard">
					<div className="minimal-map-admin__dashboard-grid">
						{CARD_VIEWS.map((view) => {
							const section = sectionMap[view];

							return section ? (
								<DashboardCard
									key={view}
									appConfig={appConfig}
									view={view}
									title={section.title}
									url={section.url}
								/>
							) : null;
						})}
					</div>
					<div className="minimal-map-admin__dashboard-map">
						<div
							ref={mapHostRef}
							className="minimal-map-admin__dashboard-map-surface"
						/>
					</div>
				</div>
			</div>
		</>
	);
}

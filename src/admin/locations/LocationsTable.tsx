import { DataViews } from '@wordpress/dataviews/wp';
import type { Action, Field, View, ViewTable } from '@wordpress/dataviews';
import { Tooltip } from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import {
	AtSign,
	Clock,
	Copy,
	Eye,
	EyeOff,
	Facebook,
	Image,
	Instagram,
	Layers3,
	LocateFixed,
	MapPin,
	Palette,
	Pencil,
	Send,
	Tags,
	Trash2,
	Twitter,
	Youtube,
} from 'lucide-react';
import LocationMiniMap from '../../components/LocationMiniMap';
import LogoPreview from '../../components/LogoPreview';
import TagBadge from '../../components/TagBadge';
import CollectionBadge from '../../components/CollectionBadge';
import type { LocationRecord, SocialMediaPlatform } from '../../types';
import { formatLocationAddressLines } from '../../lib/locations/formatLocationAddressLines';
import { formatOpeningHoursSummary } from '../../lib/locations/formatOpeningHoursSummary';
import DeleteLocationActionModal from './DeleteLocationActionModal';
import LocationTitleCell from './LocationTitleCell';
import {
	getQuickAssignableLogo,
	getQuickAssignableMarker,
	getQuickAssignableTag,
} from './assignmentHelpers';
import { LOCATIONS_TABLE_PER_PAGE_OPTIONS } from './constants';
import type { LocationsController } from './types';

function useLocationFields(controller: LocationsController): Field<LocationRecord>[] {
	const socialPlatforms: Record<
		SocialMediaPlatform,
		{ label: string; icon: any; color: string }
	> = useMemo(
		() => ({
			instagram: { label: __('Instagram', 'minimal-map'), icon: Instagram, color: '#E4405F' },
			x: { label: __('X', 'minimal-map'), icon: Twitter, color: '#000000' },
			facebook: { label: __('Facebook', 'minimal-map'), icon: Facebook, color: '#1877F2' },
			threads: { label: __('Threads', 'minimal-map'), icon: AtSign, color: '#000000' },
			youtube: { label: __('YouTube', 'minimal-map'), icon: Youtube, color: '#FF0000' },
			telegram: { label: __('Telegram', 'minimal-map'), icon: Send, color: '#26A5E4' },
		}),
		[]
	);

	return useMemo<Field<LocationRecord>[]>(
		() => [
			{
				id: 'map_preview',
				label: __('Map preview', 'minimal-map'),
				header: (
					<span
						className="minimal-map-admin__location-mini-map-header"
						aria-hidden="true"
					/>
				),
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
				render: ({ item }) => {
					const marker = controller.getMarkerForLocation(item.id);
					const hasCustomMarker = !!marker;

					return (
						<LocationMiniMap
							location={item}
							theme={controller.activeTheme}
							markerContent={marker?.content ?? null}
							onClick={
								!hasCustomMarker ? () => controller.onOpenMarkerColorModal(item) : undefined
							}
						/>
					);
				},
			},
			{
				id: 'logo',
				label: __('Logo', 'minimal-map'),
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
				render: ({ item }) => {
					const logo = controller.getLogoForLocation(item.id);

					if (!logo) {
						return <span className="minimal-map-admin__location-logo-empty">—</span>;
					}

					return (
						<div className="minimal-map-admin__location-logo-cell">
							<button
								type="button"
								className="minimal-map-admin__location-logo-button"
								onClick={() => controller.onOpenDeleteLogoConfirmationModal(item)}
							>
								<LogoPreview logo={logo} className="minimal-map-admin__location-logo-preview" />
							</button>
						</div>
					);
				},
			},
			{
				id: 'title',
				label: __('Title', 'minimal-map'),
				enableHiding: false,
				enableSorting: true,
				filterBy: false,
				enableGlobalSearch: true,
				render: ({ item }) => (
					<LocationTitleCell
						location={item}
						onShowLocation={controller.onOpenShowLocationConfirmationModal}
					/>
				),
			},
			{
				id: 'contact',
				label: __('Contact', 'minimal-map'),
				enableHiding: true,
				enableSorting: false,
				filterBy: false,
				render: ({ item }) => {
					return (
						<div className="minimal-map-admin__location-contact">
							{item.telephone && (
								<span className="minimal-map-admin__location-contact-item">
									<a href={`tel:${item.telephone}`}>{item.telephone}</a>
								</span>
							)}
							{item.email && (
								<span className="minimal-map-admin__location-contact-item">
									<a href={`mailto:${item.email}`}>{item.email}</a>
								</span>
							)}
							{item.website && (
								<span className="minimal-map-admin__location-contact-item">
									<a href={item.website} rel="noreferrer" target="_blank">
										{item.website.replace(/^https?:\/\/(www\.)?/, '')}
									</a>
								</span>
							)}
						</div>
					);
				},
			},
			{
				id: 'social_media',
				label: __('Social Media', 'minimal-map'),
				enableHiding: true,
				enableSorting: false,
				filterBy: false,
				render: ({ item }) => {
					const socialMedia = (item.social_media || []).filter((link) => link.url.trim());

					if (socialMedia.length === 0) {
						return <span className="minimal-map-admin__location-social-media-empty">—</span>;
					}

					return (
						<div className="minimal-map-admin__location-social-media">
							{socialMedia.map((link, index) => {
								const platform = socialPlatforms[link.platform];
								const Icon = platform.icon;
								const shortenedUrl = link.url.replace(/^https?:\/\/(www\.)?/, '');

								return (
									<Tooltip key={index} text={shortenedUrl}>
										<a
											href={link.url}
											target="_blank"
											rel="noreferrer"
											className="minimal-map-admin__location-social-media-link"
										>
											<Icon size={16} />
											<span className="minimal-map-admin__location-social-media-name">
												{platform.label}
											</span>
										</a>
									</Tooltip>
								);
							})}
						</div>
					);
				},
			},
			{
				id: 'opening_hours',
				label: __('Opening hours', 'minimal-map'),
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
				render: ({ item }) => {
					const summary = formatOpeningHoursSummary(item.opening_hours);

					if (summary.lines.length === 0 && !item.opening_hours_notes.trim()) {
						return <span className="minimal-map-admin__location-opening-hours-empty">—</span>;
					}

					return (
						<div className="minimal-map-admin__location-opening-hours">
							{summary.lines.length > 0 ? (
								summary.lines.map((line) => (
									<span key={line} className="minimal-map-admin__location-opening-hours-line">
										{line}
									</span>
								))
							) : (
								<span className="minimal-map-admin__location-opening-hours-line">—</span>
							)}
							{summary.hiddenLineCount > 0 ? (
								<span className="minimal-map-admin__location-opening-hours-more">
									{sprintf(__('+%d more', 'minimal-map'), summary.hiddenLineCount)}
								</span>
							) : null}
							{item.opening_hours_notes.trim() ? (
								<span
									className="minimal-map-admin__location-opening-hours-note"
									title={item.opening_hours_notes}
								>
									{__('Note', 'minimal-map')}
								</span>
							) : null}
						</div>
					);
				},
			},
			{
				id: 'address',
				label: __('Address', 'minimal-map'),
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
				render: ({ item }) => {
					const lines = formatLocationAddressLines(item);

					if (lines.length === 0) {
						return null;
					}

					return (
						<div className="minimal-map-admin__location-address">
							{lines.map((line) => (
								<span key={line} className="minimal-map-admin__location-address-line">
									{line}
								</span>
							))}
						</div>
					);
				},
			},
			{
				id: 'collections',
				label: __('Collections', 'minimal-map'),
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
				render: ({ item }) => {
					const collections = controller.getCollectionsForLocation(item.id);

					if (collections.length === 0) {
						return null;
					}

					return (
						<div className="minimal-map-admin__location-collections">
							{collections.map((collection) => (
								<button
									key={collection.id}
									type="button"
									className="minimal-map-admin__location-collection-trigger"
									onClick={() =>
										controller.onOpenRemoveCollectionAssignmentModal(item, collection)
									}
								>
									<CollectionBadge label={collection.title} />
								</button>
							))}
						</div>
					);
				},
			},
			{
				id: 'tags',
				label: __('Tags', 'minimal-map'),
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
				render: ({ item }) => {
					const tags = controller.getTagsForLocation(item.id);

					if (tags.length === 0) {
						return null;
					}

					return (
						<div className="minimal-map-admin__location-collections">
							{tags.map((tag) => (
								<button
									key={tag.id}
									type="button"
									className="minimal-map-admin__location-collection-trigger"
									onClick={() => controller.onOpenAssignTagsModal(item)}
								>
									<TagBadge tag={tag} />
								</button>
							))}
						</div>
					);
				},
			},
		],
		[controller]
	);
}

export function createLocationActions(controller: LocationsController): Action<LocationRecord>[] {
	const getQuickLogo = (location: LocationRecord) =>
		getQuickAssignableLogo(location, controller.logos);
	const getQuickMarker = (location: LocationRecord) =>
		getQuickAssignableMarker(location, controller.markers);
	const getQuickTag = (location: LocationRecord) =>
		getQuickAssignableTag(location, controller.tags);

	return [
		{
			id: 'duplicate-location',
			label: __('Duplicate', 'minimal-map'),
			icon: <Copy size={16} strokeWidth={2} />,
			context: 'single',
			disabled: controller.isRowActionPending,
			supportsBulk: false,
			callback: (items) => {
				if (!items[0]) {
					return;
				}

				void controller.onDuplicateLocation(items[0]).catch(() => {});
			},
		},
		{
			id: 'edit-location',
			label: __('Edit', 'minimal-map'),
			icon: <Pencil size={16} strokeWidth={2} />,
			context: 'single',
			disabled: controller.isRowActionPending,
			supportsBulk: false,
			callback: (items) => {
				if (!items[0]) {
					return;
				}

				controller.onEditLocation(items[0]);
			},
		},
		{
			id: 'toggle-location-visibility',
			label: (items) =>
				items[0]?.is_hidden ? __('Show', 'minimal-map') : __('Hide', 'minimal-map'),
			icon: <Eye size={16} strokeWidth={2} />,
			context: 'single',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			supportsBulk: false,
			callback: (items) => {
				const location = items[0];

				if (!location) {
					return;
				}

				void controller
					.onSetLocationVisibility([location], !location.is_hidden)
					.catch(() => {});
			},
		},
		{
			id: 'retrieve-location',
			label: __('Retrieve location', 'minimal-map'),
			icon: <LocateFixed size={16} strokeWidth={2} />,
			context: 'single',
			disabled: controller.isRowActionPending,
			supportsBulk: false,
			callback: (items) => {
				if (!items[0]) {
					return;
				}

				void controller.onRetrieveLocation(items[0]).catch(() => {});
			},
		},
		{
			id: 'assign-location-to-collection',
			label: __('Assign to Collection', 'minimal-map'),
			icon: <Layers3 size={16} strokeWidth={2} />,
			context: 'single',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			supportsBulk: false,
			callback: (items) => {
				if (!items[0]) {
					return;
				}

				controller.onOpenAssignToCollectionModal(items[0]);
			},
		},
		{
			id: 'quick-assign-logo',
			label: (items) => {
				const quickLogo = items[0] ? getQuickLogo(items[0]) : null;
				const logoLabel = quickLogo?.title || __('Untitled logo', 'minimal-map');

				return sprintf(__('Assign %s as logo', 'minimal-map'), logoLabel);
			},
			icon: <Image size={16} strokeWidth={2} />,
			context: 'single',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			isEligible: (item) => getQuickLogo(item) !== null,
			supportsBulk: false,
			callback: (items) => {
				const location = items[0];
				const quickLogo = location ? getQuickLogo(location) : null;

				if (!location || !quickLogo) {
					return;
				}

				void controller.onQuickAssignLogo(location, quickLogo.id).catch(() => {});
			},
		},
		{
			id: 'assign-logo',
			label: (items) =>
				items.length === 1
					? __('Assign Logo', 'minimal-map')
					: __('Assign Logos', 'minimal-map'),
			icon: <Image size={16} strokeWidth={2} />,
			context: 'single',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			supportsBulk: true,
			callback: (items) => {
				if (items.length === 0) {
					return;
				}

				controller.onOpenAssignLogoModal(items.length === 1 ? items[0] : items);
			},
		},
		{
			id: 'quick-assign-marker',
			label: (items) => {
				const quickMarker = items[0] ? getQuickMarker(items[0]) : null;
				const markerLabel = quickMarker?.title || __('Untitled marker', 'minimal-map');

				return sprintf(__('Assign %s as marker', 'minimal-map'), markerLabel);
			},
			icon: <MapPin size={16} strokeWidth={2} />,
			context: 'single',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			isEligible: (item) => getQuickMarker(item) !== null,
			supportsBulk: false,
			callback: (items) => {
				const location = items[0];
				const quickMarker = location ? getQuickMarker(location) : null;

				if (!location || !quickMarker) {
					return;
				}

				void controller.onQuickAssignMarker(location, quickMarker.id).catch(() => {});
			},
		},
		{
			id: 'assign-marker',
			label: (items) =>
				items.length === 1
					? __('Assign Marker', 'minimal-map')
					: __('Assign Markers', 'minimal-map'),
			icon: <MapPin size={16} strokeWidth={2} />,
			context: 'single',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			supportsBulk: true,
			callback: (items) => {
				if (items.length === 0) {
					return;
				}

				controller.onOpenAssignMarkerModal(items.length === 1 ? items[0] : items);
			},
		},
		{
			id: 'assign-opening-hours',
			label: () => __('Assign Opening Hours', 'minimal-map'),
			icon: <Clock size={16} strokeWidth={2} />,
			context: 'single',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			supportsBulk: true,
			callback: (items) => {
				if (items.length === 0) {
					return;
				}

				controller.onOpenAssignOpeningHoursModal(items.length === 1 ? items[0] : items);
			},
		},
		{
			id: 'quick-assign-tags',
			label: (items) => {
				const quickTag = items[0] ? getQuickTag(items[0]) : null;
				const tagLabel = quickTag?.name || __('Untitled tag', 'minimal-map');

				return sprintf(__('Assign %s as tag', 'minimal-map'), tagLabel);
			},
			icon: <Tags size={16} strokeWidth={2} />,
			context: 'single',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			isEligible: (item) => getQuickTag(item) !== null,
			supportsBulk: false,
			callback: (items) => {
				const location = items[0];
				const quickTag = location ? getQuickTag(location) : null;

				if (!location || !quickTag) {
					return;
				}

				void controller.onQuickAssignTag(location, quickTag.id).catch(() => {});
			},
		},
		{
			id: 'assign-tags',
			label: (items) =>
				items.length === 1
					? __('Assign Tag', 'minimal-map')
					: __('Assign Tags', 'minimal-map'),
			icon: <Tags size={16} strokeWidth={2} />,
			context: 'single',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			supportsBulk: true,
			callback: (items) => {
				if (items.length === 0) {
					return;
				}

				controller.onOpenAssignTagsModal(items.length === 1 ? items[0] : items);
			},
		},
		{
			id: 'hide-all-locations',
			label: __('Hide all', 'minimal-map'),
			icon: <EyeOff size={16} strokeWidth={2} />,
			context: 'list',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			isEligible: () => controller.selection.length > 1,
			supportsBulk: true,
			callback: (items) => {
				if (items.length === 0) {
					return;
				}

				void controller.onSetLocationVisibility(items, true).catch(() => {});
			},
		},
		{
			id: 'show-all-locations',
			label: __('Show all', 'minimal-map'),
			icon: <Eye size={16} strokeWidth={2} />,
			context: 'list',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			isEligible: () => controller.selection.length > 1,
			supportsBulk: true,
			callback: (items) => {
				if (items.length === 0) {
					return;
				}

				void controller.onSetLocationVisibility(items, false).catch(() => {});
			},
		},
		{
			id: 'bulk-remove-logo',
			label: __('Remove Logos', 'minimal-map'),
			icon: <Image size={16} strokeWidth={2} />,
			context: 'list',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			isEligible: () => controller.selection.length > 1,
			supportsBulk: true,
			callback: (items) => {
				if (items.length === 0) {
					return;
				}

				controller.onOpenDeleteLogoConfirmationModal(items);
			},
		},
		{
			id: 'bulk-remove-marker',
			label: __('Remove Markers', 'minimal-map'),
			icon: <MapPin size={16} strokeWidth={2} />,
			context: 'list',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			isEligible: () => controller.selection.length > 1,
			supportsBulk: true,
			callback: (items) => {
				if (items.length === 0) {
					return;
				}

				controller.onOpenRemoveMarkerConfirmationModal(items);
			},
		},
		{
			id: 'set-marker-color',
			label: (items) =>
				items.length === 1
					? __('Set Marker Color', 'minimal-map')
					: __('Set Marker Colors', 'minimal-map'),
			icon: <Palette size={16} strokeWidth={2} />,
			context: 'list',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			isEligible: () => controller.selection.length > 1,
			supportsBulk: true,
			callback: (items) => {
				if (items.length === 0) {
					return;
				}

				controller.onOpenMarkerColorModal(items.length === 1 ? items[0] : items);
			},
		},
		{
			id: 'bulk-remove-tags',
			label: __('Remove Tags', 'minimal-map'),
			icon: <Tags size={16} strokeWidth={2} />,
			context: 'list',
			disabled: controller.isRowActionPending || controller.isAssignmentSaving,
			isEligible: () => controller.selection.length > 1,
			supportsBulk: true,
			callback: (items) => {
				if (items.length === 0) {
					return;
				}

				controller.onOpenRemoveTagsConfirmationModal(items);
			},
		},
		({
			id: 'delete-location',
			label: __('Delete', 'minimal-map'),
			icon: <Trash2 size={16} strokeWidth={2} />,
			isDestructive: true,
			disabled: controller.isRowActionPending,
			supportsBulk: true,
			modalHeader: (items: LocationRecord[]) =>
				items.length === 1
					? __('Delete location', 'minimal-map')
					: sprintf(
						_n( 'Delete %d location', 'Delete %d locations', items.length, 'minimal-map' ),
						items.length
					),
			RenderModal: ({
				items,
				closeModal,
				onActionPerformed,
			}: {
				items: LocationRecord[];
				closeModal: () => void;
				onActionPerformed: (items: LocationRecord[]) => void;
			}) => {
				return (
					<DeleteLocationActionModal
						items={items}
						onDelete={controller.onDeleteLocation}
						onDeleteBulk={controller.onDeleteLocations}
						closeModal={closeModal}
						onActionPerformed={onActionPerformed}
					/>
				);
			},
		} as any),
	];
}

function useLocationActions(controller: LocationsController): Action<LocationRecord>[] {
	return useMemo<Action<LocationRecord>[]>(
		() => createLocationActions(controller),
		[controller]
	);
}

export default function LocationsTable({ controller }: { controller: LocationsController }) {
	const fields = useLocationFields(controller);
	const actions = useLocationActions(controller);

	return (
		<div className="minimal-map-admin__locations-table-wrap">
			<DataViews
				actions={actions}
				config={{ perPageSizes: [...LOCATIONS_TABLE_PER_PAGE_OPTIONS] }}
				data={controller.paginatedLocations}
				defaultLayouts={{ table: {} }}
				fields={fields}
				getItemId={(item: LocationRecord) => `${item.id}`}
				paginationInfo={{
					totalItems: controller.totalItems,
					totalPages: controller.totalPages,
				}}
				selection={controller.selection}
				view={controller.view}
				onChangeSelection={controller.onChangeSelection}
				onChangeView={(nextView: View) => controller.onChangeView(nextView as ViewTable)}
			>
				<div className="minimal-map-admin__locations-dataviews-header">
					<DataViews.Search />
					<div className="minimal-map-admin__locations-dataviews-header-actions">
						<DataViews.ViewConfig />
					</div>
				</div>
				<DataViews.Layout className="minimal-map-admin__locations-dataviews-layout" />
				<DataViews.Footer />
			</DataViews>
		</div>
	);
}

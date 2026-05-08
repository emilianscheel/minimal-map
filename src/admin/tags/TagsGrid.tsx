import { DataViews } from '@wordpress/dataviews/wp';
import type { Action, Field, View, ViewGrid } from '@wordpress/dataviews';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Pencil, Trash2 } from 'lucide-react';
import type { TagRecord } from '../../types';
import TagBadge from '../../components/TagBadge';
import type { TagsController } from './types';

export default function TagsGrid({ controller }: { controller: TagsController }) {
	const fields = useMemo<Field<TagRecord>[]>(
		() => [
			{
				id: 'name',
				label: __('Name', 'minimal-map'),
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
				enableGlobalSearch: true,
			},
			{
				id: 'map_preview',
				label: __('Preview', 'minimal-map'),
				type: 'media',
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
				render: ({ item }) => (
					<div className="minimal-map-admin__tag-grid-preview-surface">
						<div className="minimal-map-admin__tag-grid-preview">
							<TagBadge tag={item} />
						</div>
					</div>
				),
			},
		],
		[]
	);

	const actions = useMemo<Action<TagRecord>[]>(
		() => [
			{
				id: 'edit',
				label: __('Edit', 'minimal-map'),
				isPrimary: true,
				icon: <Pencil size={18} />,
				callback: (items) => {
					if (items.length === 1) {
						controller.onEditTag(items[0]);
					}
				},
			},
			{
				id: 'delete',
				label: __('Delete', 'minimal-map'),
				isPrimary: false,
				icon: <Trash2 size={18} />,
				isDestructive: true,
				callback: (items) => {
					if (items.length === 1) {
						controller.onOpenDeleteModal(items[0]);
					}
				},
				isEligible: () => !controller.isRowActionPending,
			},
		],
		[controller]
	);

	return (
		<div className="minimal-map-admin__collections-grid-wrap minimal-map-admin__tags-grid-wrap">
			<DataViews
				actions={actions}
				data={controller.paginatedTags}
				fields={fields}
				getItemId={(item: TagRecord) => `${item.id}`}
				paginationInfo={{
					totalItems: controller.totalItems,
					totalPages: controller.totalPages,
				}}
				defaultLayouts={{
					grid: {},
				}}
				view={controller.view}
				onChangeView={(nextView: View) => controller.onChangeView(nextView as ViewGrid)}
			>
				<div className="minimal-map-admin__collections-dataviews-header">
					<DataViews.Search />
				</div>
				<DataViews.Layout className="minimal-map-admin__collections-grid-layout" />
				<DataViews.Footer />
			</DataViews>
		</div>
	);
}

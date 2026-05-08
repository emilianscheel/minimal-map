import { DataViews } from '@wordpress/dataviews/wp';
import type { Action, Field, View, ViewGrid } from '@wordpress/dataviews';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Download, Pencil, Trash2 } from 'lucide-react';
import LogoPreview from '../../components/LogoPreview';
import type { LogoRecord } from '../../types';
import type { LogosController } from './types';

export default function LogosGrid({ controller }: { controller: LogosController }) {
	const fields = useMemo<Field<LogoRecord>[]>(
		() => [
			{
				id: 'title',
				label: __('Filename', 'minimal-map'),
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
				enableGlobalSearch: true,
			},
			{
				id: 'logo_preview',
				label: __('Preview', 'minimal-map'),
				type: 'media',
				enableHiding: false,
				enableSorting: false,
				filterBy: false,
				render: ({ item }) => (
					<div className="minimal-map-admin__logo-preview-surface">
						<LogoPreview logo={item} />
					</div>
				),
			},
		],
		[]
	);

	const actions = useMemo<Action<LogoRecord>[]>(
		() => [
			{
				id: 'download',
				label: __('Download', 'minimal-map'),
				icon: <Download size={18} />,
				context: 'single',
				supportsBulk: false,
				disabled: controller.isRowActionPending || controller.isSubmitting,
				callback: (items) => {
					if (items.length === 1) {
						controller.onDownloadLogo(items[0]);
					}
				},
			},
			{
				id: 'edit',
				label: __('Edit', 'minimal-map'),
				icon: <Pencil size={18} />,
				context: 'single',
				supportsBulk: false,
				disabled: controller.isRowActionPending || controller.isSubmitting,
				callback: (items) => {
					if (items.length === 1) {
						controller.onEditLogo(items[0]);
					}
				},
			},
			{
				id: 'delete',
				label: __('Delete', 'minimal-map'),
				icon: <Trash2 size={18} />,
				context: 'single',
				supportsBulk: false,
				disabled: controller.isRowActionPending || controller.isSubmitting,
				isDestructive: true,
				callback: (items) => {
					if (items.length === 1) {
						controller.onOpenDeleteModal(items[0]);
					}
				},
			},
		],
		[controller]
	);

	return (
		<div className="minimal-map-admin__collections-grid-wrap minimal-map-admin__logos-grid-wrap">
			<DataViews
				actions={actions}
				data={controller.paginatedLogos}
				fields={fields}
				getItemId={(item: LogoRecord) => `${item.id}`}
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

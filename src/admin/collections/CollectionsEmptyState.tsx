import { __ } from '@wordpress/i18n';
import { Layers3, Plus } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import type { CollectionsController } from './types';

export default function CollectionsEmptyState({ controller }: { controller: CollectionsController }) {
	return (
		<EmptyState
			icon={<Layers3 />}
			title={__('No collections found', 'minimal-map')}
			description={__('Create collections to organize your locations into groups. This makes it easier to manage and display sets of locations on your maps.', 'minimal-map')}
			action={{
				label: __('Add collection', 'minimal-map'),
				onClick: controller.onAddCollection,
				icon: <Plus />,
			}}
		/>
	);
}

import { __ } from '@wordpress/i18n';
import { Plus, Tags } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import type { TagsController } from './types';

export default function TagsEmptyState({ controller }: { controller: TagsController }) {
	return (
		<EmptyState
			icon={<Tags />}
			title={__('No tags found', 'minimal-map')}
			description={__('Create tags to apply lightweight labels to your locations. This helps you keep your map content organized and easy to search.', 'minimal-map')}
			action={{
				label: __('Add tag', 'minimal-map'),
				onClick: controller.onAddTag,
				icon: <Plus />,
			}}
		/>
	);
}

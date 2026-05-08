import { __ } from '@wordpress/i18n';
import { MapPin, Plus } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import type { LocationsController } from './types';

export default function LocationsEmptyState({ controller }: { controller: LocationsController }) {
	return (
		<EmptyState
			icon={<MapPin />}
			title={__('No locations found', 'minimal-map')}
			description={__('Start adding locations to your maps. You can add them manually or import them from a file.', 'minimal-map')}
			action={{
				label: __('Add location', 'minimal-map'),
				onClick: controller.onAddLocation,
				icon: <Plus />,
			}}
		/>
	);
}

import { __ } from '@wordpress/i18n';
import { EyeOff } from 'lucide-react';
import type { LocationRecord } from '../../types';

export default function LocationTitleCell({
	location,
	onShowLocation,
}: {
	location: LocationRecord;
	onShowLocation?: (location: LocationRecord) => void;
}) {
	if (!location.is_hidden) {
		return <span className="minimal-map-admin__location-title">{location.title}</span>;
	}

	const hiddenLabel = __('Hidden location. Click to show it again.', 'minimal-map');

	return (
		<span className="minimal-map-admin__location-title minimal-map-admin__location-title--hidden">
			<span className="minimal-map-admin__location-title-text">{location.title}</span>
			<button
				type="button"
				className="minimal-map-admin__location-title-icon-button"
				onClick={() => onShowLocation?.(location)}
				aria-label={hiddenLabel}
				title={hiddenLabel}
			>
				<EyeOff
					className="minimal-map-admin__location-title-icon"
					size={14}
					strokeWidth={2}
					aria-hidden="true"
				/>
			</button>
		</span>
	);
}

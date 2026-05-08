import { __ } from '@wordpress/i18n';
import type { AnalyticsRangeKey } from '../../types';
import OptionDropdown from '../components/OptionDropdown';
import { ANALYTICS_RANGE_OPTIONS } from './constants';

interface AnalyticsRangeSelectorProps {
	activeRange: AnalyticsRangeKey;
	onSelect: (value: AnalyticsRangeKey) => void;
}

export default function AnalyticsRangeSelector({
	activeRange,
	onSelect,
}: AnalyticsRangeSelectorProps) {
	return (
		<OptionDropdown
			activeValue={activeRange}
			emptyLabel={__('Select period', 'minimal-map')}
			groupLabel={__('Select time period', 'minimal-map')}
			labelClassName="minimal-map-admin__option-dropdown-label"
			onSelect={(value) => onSelect(value as AnalyticsRangeKey)}
			options={ANALYTICS_RANGE_OPTIONS}
			toggleClassName="minimal-map-admin__option-dropdown-toggle"
		/>
	);
}

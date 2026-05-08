import { __ } from '@wordpress/i18n';
import type { FieldErrors, LocationFormState, OpeningHoursDayKey } from '../../types';
import {
	hasLunchBreakForDay,
	hasOpeningHoursForDay,
	isValidOpeningHoursTime,
	OPENING_HOURS_DAY_ORDER,
} from './openingHours';

export function validateOpeningHoursStep(form: LocationFormState): FieldErrors {
	const dayErrors: Partial<Record<OpeningHoursDayKey, string>> = {};

	for (const dayKey of OPENING_HOURS_DAY_ORDER) {
		const day = form.opening_hours[dayKey];
		const hasOpen = day.open.trim() !== '';
		const hasClose = day.close.trim() !== '';
		const hasLunchStart = day.lunch_start.trim() !== '';
		const hasLunchDuration = day.lunch_duration_minutes > 0;

		if ((hasOpen && !hasClose) || (!hasOpen && hasClose)) {
			dayErrors[dayKey] = __('Enter both opening and closing times.', 'minimal-map');
			continue;
		}

		if ((hasOpen && !isValidOpeningHoursTime(day.open)) || (hasClose && !isValidOpeningHoursTime(day.close))) {
			dayErrors[dayKey] = __('Enter valid opening hours in HH:MM format.', 'minimal-map');
			continue;
		}

		if (!hasOpeningHoursForDay(day) && hasLunchBreakForDay(day)) {
			dayErrors[dayKey] = __('Lunch breaks require opening hours for that day.', 'minimal-map');
			continue;
		}

		if ((hasLunchStart && !hasLunchDuration) || (!hasLunchStart && hasLunchDuration)) {
			dayErrors[dayKey] = __('Enter both lunch break start time and duration.', 'minimal-map');
			continue;
		}

		if (hasLunchStart && !isValidOpeningHoursTime(day.lunch_start)) {
			dayErrors[dayKey] = __('Enter a valid lunch break start time in HH:MM format.', 'minimal-map');
		}
	}

	return Object.keys(dayErrors).length > 0
		? { opening_hours: dayErrors }
		: {};
}

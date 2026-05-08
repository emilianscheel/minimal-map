import { __, sprintf } from '@wordpress/i18n';
import {
	hasLunchBreakForDay,
	hasOpeningHoursForDay,
	OPENING_HOURS_DAY_ORDER,
} from '../lib/locations/openingHours';
import type {
	LocationOpeningHours,
	LocationOpeningHoursDay,
	OpeningHoursDayKey,
} from '../types';

const DAY_KEY_BY_ENGLISH_WEEKDAY: Record<string, OpeningHoursDayKey> = {
	Monday: 'monday',
	Tuesday: 'tuesday',
	Wednesday: 'wednesday',
	Thursday: 'thursday',
	Friday: 'friday',
	Saturday: 'saturday',
	Sunday: 'sunday',
};

const DAY_LABELS: Record<OpeningHoursDayKey, string> = {
	monday: __('Monday', 'minimal-map'),
	tuesday: __('Tuesday', 'minimal-map'),
	wednesday: __('Wednesday', 'minimal-map'),
	thursday: __('Thursday', 'minimal-map'),
	friday: __('Friday', 'minimal-map'),
	saturday: __('Saturday', 'minimal-map'),
	sunday: __('Sunday', 'minimal-map'),
};

const SHORT_DAY_LABELS: Record<OpeningHoursDayKey, string> = {
	monday: __('Mon', 'minimal-map'),
	tuesday: __('Tue', 'minimal-map'),
	wednesday: __('Wed', 'minimal-map'),
	thursday: __('Thu', 'minimal-map'),
	friday: __('Fri', 'minimal-map'),
	saturday: __('Sat', 'minimal-map'),
	sunday: __('Sun', 'minimal-map'),
};

export interface OpeningHoursStatus {
	label: string;
	state: 'open' | 'closed' | 'soon';
}

export interface OpeningHoursDisplayLine {
	dayLabel: string;
	value: string;
}

interface CurrentOpeningHoursContext {
	currentDayKey: OpeningHoursDayKey;
	currentMinutes: number;
}

interface CurrentDayTransition {
	isOpen: boolean;
	nextTransitionMinutes: number | null;
}

const SOON_THRESHOLD_MINUTES = 30;

function normalizeLocale(locale: string | null | undefined): string {
	return (typeof locale === 'string' ? locale.trim().replace(/_/g, '-') : '') || 'en-US';
}

function normalizeTimeZone(timeZone: string | null | undefined): string {
	return (typeof timeZone === 'string' ? timeZone.trim() : '') || 'UTC';
}

function isUtcTimeZone(timeZone: string): boolean {
	const normalized = normalizeTimeZone(timeZone);

	return [
		'UTC',
		'GMT',
		'Etc/UTC',
		'Etc/GMT',
		'+00:00',
		'-00:00',
	].includes(normalized);
}

function getBrowserTimeZone(): string | null {
	try {
		const browserTimeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

		return typeof browserTimeZone === 'string' && browserTimeZone.trim()
			? browserTimeZone.trim()
			: null;
	} catch {
		return null;
	}
}

function getEffectiveCurrentTimeZone(timeZone: string): string {
	const normalized = normalizeTimeZone(timeZone);

	if (!isUtcTimeZone(normalized)) {
		return normalized;
	}

	const browserTimeZone = getBrowserTimeZone();

	if (browserTimeZone && !isUtcTimeZone(browserTimeZone)) {
		return browserTimeZone;
	}

	return normalized;
}

function parseTimezoneOffsetMinutes(timeZone: string): number | null {
	const match = normalizeTimeZone(timeZone).match(/^([+-])(\d{2}):(\d{2})$/);

	if (!match) {
		return null;
	}

	const sign = match[1] === '-' ? -1 : 1;
	const hours = Number(match[2]);
	const minutes = Number(match[3]);

	return sign * (hours * 60 + minutes);
}

const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();

function getCachedDateTimeFormat(
	locale: string,
	options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
	const cacheKey = JSON.stringify({ locale, options });
	let formatter = dateTimeFormatCache.get(cacheKey);

	if (!formatter) {
		formatter = new Intl.DateTimeFormat(locale, options);
		dateTimeFormatCache.set(cacheKey, formatter);
	}

	return formatter;
}

function getCurrentOpeningHoursContext(
	now: Date,
	timeZone: string
): CurrentOpeningHoursContext {
	const effectiveTimeZone = getEffectiveCurrentTimeZone(timeZone);

	try {
		const formatter = getCachedDateTimeFormat('en-US', {
			timeZone: effectiveTimeZone,
			weekday: 'long',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
		});
		const parts = formatter.formatToParts(now);
		const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Monday';
		const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
		const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');

		return {
			currentDayKey: (typeof weekday === 'string' ? DAY_KEY_BY_ENGLISH_WEEKDAY[weekday] : undefined) ?? 'monday',
			currentMinutes: hour * 60 + minute,
		};
	} catch {
		const offsetMinutes = parseTimezoneOffsetMinutes(effectiveTimeZone);
		const adjusted = new Date(now.getTime() + (offsetMinutes ?? 0) * 60 * 1000);
		const weekdayIndex = (adjusted.getUTCDay() + 6) % 7;

		return {
			currentDayKey: OPENING_HOURS_DAY_ORDER[weekdayIndex] ?? 'monday',
			currentMinutes: adjusted.getUTCHours() * 60 + adjusted.getUTCMinutes(),
		};
	}
}

function parseTimeToMinutes(value: string): number {
	const [hours, minutes] = value.split(':').map(Number);

	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
		return -1;
	}

	return hours * 60 + minutes;
}

function formatMinutesToTimeString(totalMinutes: number): string {
	const clamped = Math.max(0, Math.min(totalMinutes, 24 * 60 - 1));
	const hours = Math.floor(clamped / 60);
	const minutes = clamped % 60;

	return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`;
}

function formatDisplayTime(value: string, locale: string): string {
	const [hours, minutes] = value.split(':').map(Number);

	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
		return value;
	}

	const formatter = getCachedDateTimeFormat(normalizeLocale(locale), {
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'UTC',
	});
	const parts = formatter.formatToParts(new Date(Date.UTC(2024, 0, 1, hours, minutes)));

	return parts
		.map((part) =>
			part.type === 'dayPeriod' ? part.value.toLowerCase() : part.value
		)
		.join('');
}

function getLunchBreakEnd(day: LocationOpeningHoursDay): number | null {
	if (!hasLunchBreakForDay(day)) {
		return null;
	}

	const lunchStart = parseTimeToMinutes(day.lunch_start);
	const close = parseTimeToMinutes(day.close);

	if (lunchStart < 0 || close < 0 || day.lunch_duration_minutes <= 0) {
		return null;
	}

	const lunchEnd = lunchStart + day.lunch_duration_minutes;

	return lunchStart < close && lunchEnd <= close ? lunchEnd : null;
}

function getNextOpeningForDay(
	day: LocationOpeningHoursDay,
	currentMinutes: number,
	allowLunchReopen: boolean
): number | null {
	if (!hasOpeningHoursForDay(day)) {
		return null;
	}

	const open = parseTimeToMinutes(day.open);
	const close = parseTimeToMinutes(day.close);

	if (open < 0 || close < 0 || open >= close) {
		return null;
	}

	if (currentMinutes < open) {
		return open;
	}

	if (allowLunchReopen) {
		const lunchStart = parseTimeToMinutes(day.lunch_start);
		const lunchEnd = getLunchBreakEnd(day);

		if (lunchStart >= 0 && lunchEnd !== null && currentMinutes >= lunchStart && currentMinutes < lunchEnd) {
			return lunchEnd;
		}
	}

	return null;
}

function getCurrentDayTransition(
	day: LocationOpeningHoursDay,
	currentMinutes: number
): CurrentDayTransition {
	if (!hasOpeningHoursForDay(day)) {
		return {
			isOpen: false,
			nextTransitionMinutes: null,
		};
	}

	const open = parseTimeToMinutes(day.open);
	const close = parseTimeToMinutes(day.close);

	if (open < 0 || close < 0 || open >= close) {
		return {
			isOpen: false,
			nextTransitionMinutes: null,
		};
	}

	if (currentMinutes < open) {
		return {
			isOpen: false,
			nextTransitionMinutes: open,
		};
	}

	if (currentMinutes >= close) {
		return {
			isOpen: false,
			nextTransitionMinutes: null,
		};
	}

	const lunchStart = parseTimeToMinutes(day.lunch_start);
	const lunchEnd = getLunchBreakEnd(day);

	if (
		hasLunchBreakForDay(day) &&
		lunchStart >= 0 &&
		lunchEnd !== null
	) {
		if (currentMinutes < lunchStart) {
			return {
				isOpen: true,
				nextTransitionMinutes: lunchStart,
			};
		}

		if (currentMinutes < lunchEnd) {
			return {
				isOpen: false,
				nextTransitionMinutes: lunchEnd,
			};
		}
	}

	return {
		isOpen: true,
		nextTransitionMinutes: close,
	};
}

function isSoonTransition(
	currentMinutes: number,
	nextTransitionMinutes: number | null
): boolean {
	if (nextTransitionMinutes === null) {
		return false;
	}

	return nextTransitionMinutes >= currentMinutes &&
		nextTransitionMinutes - currentMinutes <= SOON_THRESHOLD_MINUTES;
}

export function getOpeningHoursStatus(
	openingHours: LocationOpeningHours,
	siteLocale: string,
	siteTimezone: string,
	now: Date = new Date()
): OpeningHoursStatus | null {
	const hasAnyOpeningInterval = OPENING_HOURS_DAY_ORDER.some((dayKey) =>
		hasOpeningHoursForDay(openingHours[dayKey])
	);

	if (!hasAnyOpeningInterval) {
		return null;
	}

	const { currentDayKey, currentMinutes } = getCurrentOpeningHoursContext(now, siteTimezone);
	const today = openingHours[currentDayKey];
	const todayTransition = getCurrentDayTransition(today, currentMinutes);

	if (todayTransition.nextTransitionMinutes !== null) {
		const formattedTime = formatDisplayTime(
			formatMinutesToTimeString(todayTransition.nextTransitionMinutes),
			siteLocale
		);
		const isSoon = isSoonTransition(
			currentMinutes,
			todayTransition.nextTransitionMinutes
		);

		if (todayTransition.isOpen) {
			return {
				label: isSoon
					? sprintf(
						__('Open - closes soon %s', 'minimal-map'),
						formattedTime
					)
					: sprintf(
						__('Open - closes %s', 'minimal-map'),
						formattedTime
					),
				state: isSoon ? 'soon' : 'open',
			};
		}

		return {
			label: isSoon
				? sprintf(
					__('Opens soon - %s', 'minimal-map'),
					formattedTime
				)
				: sprintf(
					__('Closed - opens %s', 'minimal-map'),
					formattedTime
				),
			state: isSoon ? 'soon' : 'closed',
		};
	}

	const currentDayIndex = OPENING_HOURS_DAY_ORDER.indexOf(currentDayKey);

	for (let offset = 1; offset < OPENING_HOURS_DAY_ORDER.length; offset += 1) {
		const dayKey =
			OPENING_HOURS_DAY_ORDER[(currentDayIndex + offset) % OPENING_HOURS_DAY_ORDER.length];
		const day = openingHours[dayKey];
		const nextOpening = getNextOpeningForDay(day, -1, false);

		if (nextOpening === null) {
			continue;
		}

		const formattedTime = formatDisplayTime(
			formatMinutesToTimeString(nextOpening),
			siteLocale
		);

		return {
			label: sprintf(
				__('Closed - opens %1$s %2$s', 'minimal-map'),
				SHORT_DAY_LABELS[dayKey],
				formattedTime
			),
			state: 'closed',
		};
	}

	return {
		label: __('Closed', 'minimal-map'),
		state: 'closed',
	};
}

export function isLocationOpenNow(
	openingHours: LocationOpeningHours,
	siteTimezone: string,
	now: Date = new Date()
): boolean {
	const hasAnyOpeningInterval = OPENING_HOURS_DAY_ORDER.some((dayKey) =>
		hasOpeningHoursForDay(openingHours[dayKey])
	);

	if (!hasAnyOpeningInterval) {
		return false;
	}

	const { currentDayKey, currentMinutes } = getCurrentOpeningHoursContext(now, siteTimezone);
	const today = openingHours[currentDayKey];
	const todayTransition = getCurrentDayTransition(today, currentMinutes);

	return todayTransition.isOpen;
}

export function formatOpeningHoursDisplayLine(
	day: LocationOpeningHoursDay,
	siteLocale: string
): string {
	if (!hasOpeningHoursForDay(day)) {
		return __('Closed', 'minimal-map');
	}

	const timeRange = sprintf(
		__('%1$s-%2$s', 'minimal-map'),
		formatDisplayTime(day.open, siteLocale),
		formatDisplayTime(day.close, siteLocale)
	);

	if (!hasLunchBreakForDay(day)) {
		return timeRange;
	}

	const lunchEnd = getLunchBreakEnd(day);

	if (lunchEnd === null) {
		return timeRange;
	}

	return sprintf(
		__('%1$s, Lunch %2$s-%3$s', 'minimal-map'),
		timeRange,
		formatDisplayTime(day.lunch_start, siteLocale),
		formatDisplayTime(formatMinutesToTimeString(lunchEnd), siteLocale)
	);
}

export function getOpeningHoursDisplayLines(
	openingHours: LocationOpeningHours,
	siteLocale: string
): OpeningHoursDisplayLine[] {
	return OPENING_HOURS_DAY_ORDER.map((dayKey) => ({
		dayLabel: DAY_LABELS[dayKey],
		value: formatOpeningHoursDisplayLine(openingHours[dayKey], siteLocale),
	}));
}

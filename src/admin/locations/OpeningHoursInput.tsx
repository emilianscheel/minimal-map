import { TextControl, TextareaControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { FieldErrors, LocationFormState, OpeningHoursDayKey } from '../../types';
import { OPENING_HOURS_DAY_ORDER } from '../../lib/locations/openingHours';

interface OpeningHoursInputProps {
	fieldErrors: FieldErrors;
	form: Pick<LocationFormState, 'opening_hours' | 'opening_hours_notes'>;
	onChangeDayValue: (
		dayKey: OpeningHoursDayKey,
		field: 'open' | 'close' | 'lunch_start' | 'lunch_duration_minutes',
		value: string
	) => void;
	onChangeNotes: (value: string) => void;
}

const DAY_LABELS: Record<OpeningHoursDayKey, string> = {
	monday: __('Monday', 'emilian-scheel-minimal-map'),
	tuesday: __('Tuesday', 'emilian-scheel-minimal-map'),
	wednesday: __('Wednesday', 'emilian-scheel-minimal-map'),
	thursday: __('Thursday', 'emilian-scheel-minimal-map'),
	friday: __('Friday', 'emilian-scheel-minimal-map'),
	saturday: __('Saturday', 'emilian-scheel-minimal-map'),
	sunday: __('Sunday', 'emilian-scheel-minimal-map'),
};

function OptionalLabel({ label }: { label: string }) {
	return (
		<span className="minimal-map-admin__field-label-with-hint">
			<span>{label}</span>
			<span className="minimal-map-admin__field-optional-hint">
				{__('Optional', 'emilian-scheel-minimal-map')}
			</span>
		</span>
	);
}

export default function OpeningHoursInput({
	fieldErrors,
	form,
	onChangeDayValue,
	onChangeNotes,
}: OpeningHoursInputProps) {
	return (
		<div className="minimal-map-admin__location-dialog-fields minimal-map-admin__opening-hours-step">
			<div className="minimal-map-admin__opening-hours-table" role="table" aria-label={__('Opening hours', 'emilian-scheel-minimal-map')}>
				<div className="minimal-map-admin__opening-hours-table-header" role="row">
					<span role="columnheader">{__('Day', 'emilian-scheel-minimal-map')}</span>
					<span role="columnheader">{__('Open', 'emilian-scheel-minimal-map')}</span>
					<span role="columnheader">{__('Close', 'emilian-scheel-minimal-map')}</span>
					<span role="columnheader">
						<OptionalLabel label={__('Lunch break start', 'emilian-scheel-minimal-map')} />
					</span>
					<span role="columnheader">
						<OptionalLabel label={__('Lunch break duration (minutes)', 'emilian-scheel-minimal-map')} />
					</span>
				</div>
				{OPENING_HOURS_DAY_ORDER.map((dayKey, index) => {
					const day = form.opening_hours[dayKey];
					const error = fieldErrors.opening_hours?.[dayKey];

					return (
						<div key={dayKey} className="minimal-map-admin__opening-hours-row-wrapper">
							<div className="minimal-map-admin__opening-hours-row" role="row">
								<div className="minimal-map-admin__opening-hours-day-label" role="cell">
									{DAY_LABELS[dayKey]}
								</div>
								<div role="cell">
									<TextControl
										autoFocus={index === 0}
										label={index === 0 ? __('Open', 'emilian-scheel-minimal-map') : undefined}
										hideLabelFromVision
										type="time"
										value={day.open}
										onChange={(value) => onChangeDayValue(dayKey, 'open', value)}
										__next40pxDefaultSize
									/>
								</div>
								<div role="cell">
									<TextControl
										label={index === 0 ? __('Close', 'emilian-scheel-minimal-map') : undefined}
										hideLabelFromVision
										type="time"
										value={day.close}
										onChange={(value) => onChangeDayValue(dayKey, 'close', value)}
										__next40pxDefaultSize
									/>
								</div>
								<div role="cell">
									<TextControl
										label={index === 0 ? __('Lunch break start', 'emilian-scheel-minimal-map') : undefined}
										hideLabelFromVision
										type="time"
										value={day.lunch_start}
										onChange={(value) => onChangeDayValue(dayKey, 'lunch_start', value)}
										__next40pxDefaultSize
									/>
								</div>
								<div role="cell">
									<TextControl
										label={index === 0 ? __('Lunch break duration (minutes)', 'emilian-scheel-minimal-map') : undefined}
										hideLabelFromVision
										type="number"
										min={0}
										step={1}
										value={day.lunch_duration_minutes > 0 ? `${day.lunch_duration_minutes}` : ''}
										onChange={(value) =>
											onChangeDayValue(dayKey, 'lunch_duration_minutes', value)
										}
										__next40pxDefaultSize
									/>
								</div>
							</div>
							{error ? (
								<p className="minimal-map-admin__opening-hours-row-error">{error}</p>
							) : null}
						</div>
					);
				})}
			</div>
			<TextareaControl
				label={<OptionalLabel label={__('Opening hours notes', 'emilian-scheel-minimal-map')} />}
				value={form.opening_hours_notes}
				onChange={onChangeNotes}
				help={__(
					'Add details such as seasonal opening hours or temporary exceptions.',
					'emilian-scheel-minimal-map'
				)}
				rows={4}
			/>
		</div>
	);
}

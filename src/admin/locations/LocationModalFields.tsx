import { FormTokenField, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import type { FieldErrors, LocationModalStep, LocationFormState, TagRecord } from '../../types';

interface LocationModalFieldsProps {
	fieldErrors: FieldErrors;
	form: LocationFormState;
	onChange: (key: keyof LocationFormState, value: any) => void;
	step: LocationModalStep;
	tags: TagRecord[];
}

function OptionalLabel({ label }: { label: string }) {
	return (
		<span className="minimal-map-admin__field-label-with-hint">
			<span>{label}</span>
			<span className="minimal-map-admin__field-optional-hint">
				{__('Optional', 'minimal-map')}
			</span>
		</span>
	);
}

export default function LocationModalFields({
	fieldErrors,
	form,
	onChange,
	step,
	tags,
}: LocationModalFieldsProps) {
	if (step === 'details') {
		return (
			<div className="minimal-map-admin__location-dialog-fields">
				<TextControl
					autoFocus
					label={__('Title', 'minimal-map')}
					value={form.title}
					onChange={(value) => onChange('title', value)}
					help={fieldErrors.title}
				/>
				<TextControl
					label={<OptionalLabel label={__('Telephone', 'minimal-map')} />}
					type="tel"
					value={form.telephone}
					onChange={(value) => onChange('telephone', value)}
				/>
				<TextControl
					label={<OptionalLabel label={__('Email address', 'minimal-map')} />}
					type="email"
					value={form.email}
					onChange={(value) => onChange('email', value)}
					help={fieldErrors.email}
				/>
				<TextControl
					label={<OptionalLabel label={__('Website', 'minimal-map')} />}
					type="url"
					value={form.website}
					onChange={(value) => onChange('website', value)}
					help={fieldErrors.website}
				/>
				<FormTokenField
					label={__('Tags (optional)', 'minimal-map')}
					value={form.tag_ids
						.map((id) => tags.find((t) => t.id === id)?.name)
						.filter((name): name is string => !!name)}
					suggestions={tags.map((t) => t.name)}
					onChange={(tokenNames) => {
						const nextTagIds = tokenNames
							.map((name) => tags.find((t) => t.name === name)?.id)
							.filter((id): id is number => id !== undefined);
						onChange('tag_ids', nextTagIds);
					}}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</div>
		);
	}

	return (
		<div className="minimal-map-admin__location-dialog-fields minimal-map-admin__location-dialog-fields--address">
			<div className="minimal-map-admin__location-dialog-grid minimal-map-admin__location-dialog-grid--row-one">
				<TextControl
					autoFocus
					label={__('Street', 'minimal-map')}
					value={form.street}
					onChange={(value) => onChange('street', value)}
					help={fieldErrors.street}
				/>
				<TextControl
					label={__('House number', 'minimal-map')}
					value={form.house_number}
					onChange={(value) => onChange('house_number', value)}
					help={fieldErrors.house_number}
				/>
			</div>
			<div className="minimal-map-admin__location-dialog-grid minimal-map-admin__location-dialog-grid--row-two">
				<TextControl
					label={__('Postal code', 'minimal-map')}
					value={form.postal_code}
					onChange={(value) => onChange('postal_code', value)}
					help={fieldErrors.postal_code}
				/>
				<TextControl
					label={__('City', 'minimal-map')}
					value={form.city}
					onChange={(value) => onChange('city', value)}
					help={fieldErrors.city}
				/>
			</div>
			<div className="minimal-map-admin__location-dialog-grid minimal-map-admin__location-dialog-grid--row-three">
				<TextControl
					label={__('State', 'minimal-map')}
					value={form.state}
					onChange={(value) => onChange('state', value)}
				/>
				<TextControl
					label={__('Country', 'minimal-map')}
					value={form.country}
					onChange={(value) => onChange('country', value)}
					help={fieldErrors.country}
				/>
			</div>
		</div>
	);
}

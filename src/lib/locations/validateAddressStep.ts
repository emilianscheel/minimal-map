import { __ } from '@wordpress/i18n';
import type { FieldErrors, LocationFormState } from '../../types';
import { createEmptyFieldErrors } from './createEmptyFieldErrors';

export function validateAddressStep(form: LocationFormState): FieldErrors {
	const errors = createEmptyFieldErrors();

	if (!form.street.trim()) {
		errors.street = __('Street is required to geocode the address.', 'minimal-map');
	}

	if (!form.house_number.trim()) {
		errors.house_number = __('House number is required to geocode the address.', 'minimal-map');
	}

	if (!form.postal_code.trim()) {
		errors.postal_code = __('Postal code is required to geocode the address.', 'minimal-map');
	}

	if (!form.city.trim()) {
		errors.city = __('City is required to geocode the address.', 'minimal-map');
	}

	if (!form.country.trim()) {
		errors.country = __('Country is required to geocode the address.', 'minimal-map');
	}

	return errors;
}

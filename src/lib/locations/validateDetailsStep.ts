import { __ } from '@wordpress/i18n';
import type { FieldErrors, LocationFormState } from '../../types';
import { createEmptyFieldErrors } from './createEmptyFieldErrors';
import { isValidEmail } from './isValidEmail';
import { isValidWebsite } from './isValidWebsite';

export function validateDetailsStep(form: LocationFormState): FieldErrors {
	const errors = createEmptyFieldErrors();

	if (!form.title.trim()) {
		errors.title = __('A title is required.', 'minimal-map');
	}

	if (form.email.trim() && !isValidEmail(form.email.trim())) {
		errors.email = __('Enter a valid email address.', 'minimal-map');
	}

	if (form.website.trim() && !isValidWebsite(form.website.trim())) {
		errors.website = __('Enter a valid website URL.', 'minimal-map');
	}

	return errors;
}

import { CheckboxControl, ColorIndicator, ColorPicker, Dropdown } from '@wordpress/components';
import { useEffect, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

interface ColorControlProps {
	label: string;
	color: string;
	onChange: (color: string) => void;
	disabled?: boolean;
	showCheckbox?: boolean;
	checkboxLabel?: string;
	checked?: boolean;
	indeterminate?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	mixed?: boolean;
	mixedGradient?: string;
}

export function ColorControl({
	label,
	color,
	onChange,
	disabled = false,
	showCheckbox = false,
	checkboxLabel,
	checked = false,
	indeterminate = false,
	onCheckedChange,
	mixed = false,
	mixedGradient,
}: ColorControlProps) {
	const checkboxRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const input = checkboxRef.current?.querySelector(
			'input[type="checkbox"]'
		) as HTMLInputElement | null;

		if (input) {
			input.indeterminate = indeterminate;
		}
	}, [ indeterminate ]);

	return (
		<div className="minimal-map-styles__color-control">
			<div className="minimal-map-styles__color-label-group">
				{showCheckbox ? (
					<div
						ref={checkboxRef}
						className="minimal-map-styles__color-checkbox"
					>
						<CheckboxControl
							label={checkboxLabel ?? label}
							checked={checked}
							onChange={(nextChecked) => onCheckedChange?.(nextChecked)}
							__nextHasNoMarginBottom
						/>
					</div>
				) : (
					<span className="minimal-map-styles__color-label">{label}</span>
				)}
			</div>
			<Dropdown
				renderToggle={({ isOpen, onToggle }) => (
					<button
						type="button"
						className={`minimal-map-styles__color-toggle${mixed ? ' is-mixed' : ''}`}
						onClick={onToggle}
						aria-expanded={isOpen}
						aria-label={sprintf(
							__('Select %s color', 'minimal-map'),
							label
						)}
						disabled={disabled}
					>
						{mixed ? (
							<span
								className="components-color-indicator minimal-map-styles__color-indicator minimal-map-styles__color-indicator--mixed"
								data-mixed-gradient={mixedGradient}
								style={
									mixedGradient
										? { background: mixedGradient }
										: undefined
								}
							/>
						) : (
							<ColorIndicator colorValue={color} />
						)}
						<span
							className={`minimal-map-styles__color-value${mixed ? ' is-mixed' : ''}`}
						>
							{mixed ? __('Mixed', 'minimal-map') : color}
						</span>
					</button>
				)}
				renderContent={() => (
					<div className="minimal-map-styles__color-picker-popover">
						<ColorPicker
							color={color}
							onChange={onChange}
							enableAlpha={false}
							copyFormat="hex"
						/>
					</div>
				)}
			/>
		</div>
	);
}

import { Button, Dropdown, MenuGroup, MenuItem } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { ChevronDown, Download, FileSpreadsheet } from 'lucide-react';

interface ExportAnalyticsDropdownProps {
	disabled?: boolean;
	onExportAction: () => void;
	onExportSearch: () => void;
	onExportSelection: () => void;
}

export default function ExportAnalyticsDropdown({
	disabled = false,
	onExportAction,
	onExportSearch,
	onExportSelection,
}: ExportAnalyticsDropdownProps) {
	return (
		<Dropdown
			popoverProps={{ placement: 'bottom-end' }}
			renderToggle={({ isOpen, onToggle }) => (
				<Button
					onClick={onToggle}
					aria-expanded={isOpen}
					variant="tertiary"
					icon={<Download size={18} />}
					label={__('Export analytics', 'minimal-map')}
					disabled={disabled}
					__next40pxDefaultSize
				>
					<ChevronDown size={16} />
				</Button>
			)}
			renderContent={({ onClose }) => (
				<MenuGroup label={__('Export Options', 'minimal-map')}>
					<MenuItem
						onClick={() => {
							onExportSearch();
							onClose();
						}}
						icon={<FileSpreadsheet size={16} />}
					>
						{__('Search Data as CSV', 'minimal-map')}
					</MenuItem>
					<MenuItem
						onClick={() => {
							onExportSelection();
							onClose();
						}}
						icon={<FileSpreadsheet size={16} />}
					>
						{__('Selection Data as CSV', 'minimal-map')}
					</MenuItem>
					<MenuItem
						onClick={() => {
							onExportAction();
							onClose();
						}}
						icon={<FileSpreadsheet size={16} />}
					>
						{__('Action Data as CSV', 'minimal-map')}
					</MenuItem>
				</MenuGroup>
			)}
		/>
	);
}

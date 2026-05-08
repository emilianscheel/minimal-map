import { Button, Dropdown, MenuGroup, MenuItem, __experimentalHStack as HStack } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { ChevronDown, Download, FileSpreadsheet } from 'lucide-react';

interface ExportLocationsDropdownProps {
	onExport: () => void;
	onExportExcel: () => void;
	onExportJson: () => void;
	onExportExample: () => void;
	onExportExampleExcel: () => void;
	onExportExampleJson: () => void;
}

export function ExportLocationsDropdown({
	onExport,
	onExportExcel,
	onExportJson,
	onExportExample,
	onExportExampleExcel,
	onExportExampleJson,
}: ExportLocationsDropdownProps) {
	return (
		<Dropdown
			popoverProps={{ placement: 'bottom-end' }}
			renderToggle={({ isOpen, onToggle }) => (
				<Button
					onClick={onToggle}
					aria-expanded={isOpen}
					variant="tertiary"
					icon={<Download size={18} />}
					label={__('Export locations', 'emilian-scheel-minimal-map')}
					__next40pxDefaultSize
				>
					<ChevronDown size={16} />
				</Button>
			)}
			renderContent={({ onClose }) => (
				<MenuGroup label={__('Export Options', 'emilian-scheel-minimal-map')}>
					<MenuItem
						onClick={() => {
							onExport();
							onClose();
						}}
						icon={<FileSpreadsheet size={16} />}
					>
						{__('Download as CSV', 'emilian-scheel-minimal-map')}
					</MenuItem>
					<MenuItem
						onClick={() => {
							onExportExcel();
							onClose();
						}}
						icon={<FileSpreadsheet size={16} />}
					>
						{__('Download as Excel', 'emilian-scheel-minimal-map')}
					</MenuItem>
					<MenuItem
						onClick={() => {
							onExportJson();
							onClose();
						}}
						icon={<FileSpreadsheet size={16} />}
					>
						{__('Download as JSON', 'emilian-scheel-minimal-map')}
					</MenuItem>
					<MenuItem
						onClick={() => {
							onExportExample();
							onClose();
						}}
						icon={<FileSpreadsheet size={16} />}
					>
						{__('Download Example CSV', 'emilian-scheel-minimal-map')}
					</MenuItem>
					<MenuItem
						onClick={() => {
							onExportExampleExcel();
							onClose();
						}}
						icon={<FileSpreadsheet size={16} />}
					>
						{__('Download Example Excel', 'emilian-scheel-minimal-map')}
					</MenuItem>
					<MenuItem
						onClick={() => {
							onExportExampleJson();
							onClose();
						}}
						icon={<FileSpreadsheet size={16} />}
					>
						{__('Download Example JSON', 'emilian-scheel-minimal-map')}
					</MenuItem>
				</MenuGroup>
			)}
		/>
	);
}

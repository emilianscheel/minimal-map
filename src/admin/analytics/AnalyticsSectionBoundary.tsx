import { Notice } from '@wordpress/components';
import { Component, type ReactNode } from 'react';
import { __, sprintf } from '@wordpress/i18n';

interface AnalyticsSectionBoundaryProps {
	children: ReactNode;
	resetKey: string;
	title: string;
}

interface AnalyticsSectionBoundaryState {
	hasError: boolean;
}

export default class AnalyticsSectionBoundary extends Component<
	AnalyticsSectionBoundaryProps,
	AnalyticsSectionBoundaryState
> {
	state: AnalyticsSectionBoundaryState = {
		hasError: false,
	};

	static getDerivedStateFromError(): AnalyticsSectionBoundaryState {
		return {
			hasError: true,
		};
	}

	componentDidCatch(error: unknown): void {
		console.error('Minimal Map analytics section failed to render.', error);
	}

	componentDidUpdate(previousProps: AnalyticsSectionBoundaryProps): void {
		if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
			this.setState({ hasError: false });
		}
	}

	render(): ReactNode {
		if (this.state.hasError) {
			return (
				<Notice status="error" isDismissible={false}>
					{sprintf(
						__(
							'%s analytics could not be rendered because one or more records contain unexpected data.',
							'minimal-map'
						),
						this.props.title
					)}
				</Notice>
			);
		}

		return this.props.children;
	}
}

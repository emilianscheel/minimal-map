<?php
/**
 * Public iframe endpoint renderer.
 *
 * @package Minimal_Map
 */

namespace MinimalMap;

defined( 'ABSPATH' ) || exit;

/**
 * Renders one standalone map document for iframe embeds.
 */
class Iframe_Endpoint {
	/**
	 * Public request flag.
	 */
	const QUERY_VAR = 'minimal-map-iframe';

	/**
	 * Encoded config query arg.
	 */
	const CONFIG_QUERY_VAR = 'minimal-map-config';

	/**
	 * Shared config service.
	 *
	 * @var Config
	 */
	private $config;

	/**
	 * Shared map renderer.
	 *
	 * @var Map_View
	 */
	private $map_view;

	/**
	 * Constructor.
	 *
	 * @param Config   $config Shared config service.
	 * @param Map_View $map_view Shared map renderer.
	 */
	public function __construct( Config $config, Map_View $map_view ) {
		$this->config   = $config;
		$this->map_view = $map_view;
	}

	/**
	 * Render the standalone iframe response if requested.
	 *
	 * @return void
	 */
	public function maybe_render() {
		if ( ! $this->is_iframe_request() ) {
			return;
		}

		add_filter( 'show_admin_bar', '__return_false' );
		remove_action( 'wp_head', '_admin_bar_bump_cb' );
		remove_action( 'admin_head', '_admin_bar_bump_cb' );

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Public iframe embed payload; it does not mutate site data.
		$encoded_config = isset( $_GET[ self::CONFIG_QUERY_VAR ] ) ? $this->sanitize_encoded_config( sanitize_text_field( wp_unslash( (string) $_GET[ self::CONFIG_QUERY_VAR ] ) ) ) : '';
		$response       = $this->build_response( $encoded_config );

		status_header( $response['status'] );
		nocache_headers();

		echo $response['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		exit;
	}

	/**
	 * Determine whether the current request targets the iframe document.
	 *
	 * @return bool
	 */
	public function is_iframe_request() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Public iframe flag; it does not mutate site data.
		return isset( $_GET[ self::QUERY_VAR ] );
	}

	/**
	 * Sanitize one base64url-encoded iframe config payload.
	 *
	 * @param string $encoded_config Raw encoded config.
	 * @return string
	 */
	private function sanitize_encoded_config( $encoded_config ) {
		return (string) preg_replace( '/[^A-Za-z0-9_-]/', '', $encoded_config );
	}

	/**
	 * Build one iframe response without sending it.
	 *
	 * @param string $encoded_config Base64url-encoded JSON config.
	 * @return array{status:int,html:string}
	 */
	public function build_response( $encoded_config ) {
		$normalized_config = $this->config->normalize_embed_payload( $encoded_config );

		if ( is_wp_error( $normalized_config ) ) {
			return array(
				'status' => 400,
				'html'   => $this->render_document(
					array(
						'document_title'    => __( 'Invalid Minimal Map Embed', 'emilian-scheel-minimal-map' ),
						'document_font_family' => $this->config->get_default_block_attributes()['fontFamily'],
						'error_message'     => $normalized_config->get_error_message(),
						'map_surface_markup' => '',
					)
				),
			);
		}

		return array(
			'status' => 200,
			'html'   => $this->render_document(
				array(
					'document_title'    => __( 'Minimal Map', 'emilian-scheel-minimal-map' ),
					'document_font_family' => $normalized_config['fontFamily'],
					'error_message'     => '',
					'map_surface_markup' => $this->map_view->render_surface( $normalized_config ),
				)
			),
		);
	}

	/**
	 * Render one standalone HTML document.
	 *
	 * @param array<string, string> $context Document context.
	 * @return string
	 */
	private function render_document( $context ) {
		if ( '' !== $context['map_surface_markup'] ) {
			wp_enqueue_style( 'minimal-map-style' );
			wp_enqueue_script( 'minimal-map-frontend' );
		}

		$document_title    = $context['document_title'];
		$document_font_family = $context['document_font_family'];
		$document_styles   = $this->get_document_styles();
		$error_message     = $context['error_message'];
		$map_surface_markup = $context['map_surface_markup'];
		$language_attributes = get_language_attributes();
		$charset             = get_bloginfo( 'charset' );

		ob_start();
		require MINIMAL_MAP_PATH . 'templates/map-iframe.php';
		return (string) ob_get_clean();
	}

	/**
	 * Get iframe document reset styles.
	 *
	 * @return string
	 */
	private function get_document_styles() {
		return implode(
			' ',
			array(
				'html, body { margin: 0; padding: 0; background: transparent; }',
				'html { margin-top: 0 !important; }',
				'body.minimal-map-iframe-page { font-family: var(--minimal-map-font-family, var(--wp--style--global--font-family, inherit)); }',
				'.minimal-map-iframe-page .minimal-map-surface { width: 100%; }',
				'.minimal-map-iframe-page .cmplz-cookiebanner-container { display: none; }',
				'.minimal-map-iframe-page__error { padding: 16px; color: #1e1e1e; font-size: 14px; line-height: 1.5; }',
			)
		);
	}
}

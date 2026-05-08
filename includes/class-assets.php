<?php
/**
 * Asset registration.
 *
 * @package Minimal_Map
 */

namespace MinimalMap;

defined( 'ABSPATH' ) || exit;

/**
 * Registers scripts and styles.
 */
class Assets {
	/**
	 * Config service.
	 *
	 * @var Config
	 */
	private $config;

	/**
	 * Constructor.
	 *
	 * @param Config $config Shared config service.
	 */
	public function __construct( Config $config ) {
		$this->config = $config;
	}

	/**
	 * Register all plugin assets.
	 *
	 * @return void
	 */
	public function register() {
		$this->register_script( 'minimal-map-block-editor', 'index.js' );
		$this->register_script( 'minimal-map-frontend', 'frontend.js' );
		$this->register_script( 'minimal-map-admin', 'admin.js' );
		$this->register_script( 'minimal-map-admin-commands', 'admin-commands.js' );

		if ( wp_script_is( 'minimal-map-admin-commands', 'registered' ) ) {
			$script = wp_scripts();
			if ( isset( $script->registered['minimal-map-admin-commands'] ) ) {
				$dependencies = $script->registered['minimal-map-admin-commands']->deps;

				if ( ! in_array( 'wp-core-commands', $dependencies, true ) ) {
					$dependencies[] = 'wp-core-commands';
				}

				$script->registered['minimal-map-admin-commands']->deps = $dependencies;
			}
		}

		$this->register_style( 'minimal-map-editor-style', 'index.css', array( 'wp-edit-blocks', 'wp-components' ) );
		$this->register_style( 'minimal-map-style', 'style-frontend.css', array( 'wp-components' ) );
		$this->register_style( 'minimal-map-admin-style', 'style-admin.css', array( 'wp-components', 'minimal-map-style' ) );

		add_filter( 'wp_get_inline_script_tag', array( $this, 'maybe_block_complianz_inline_script' ), 10, 2 );
	}

	/**
	 * Maybe block the Complianz inline script.
	 *
	 * @param string               $tag        Inline script tag markup.
	 * @param array<string, mixed> $attributes Script attributes.
	 * @return string
	 */
	public function maybe_block_complianz_inline_script( $tag, $attributes ) {
		if ( strpos( $tag, 'MinimalMapComplianzConsent' ) !== false ) {
			$tag = str_replace( '<' . 'script ', '<' . 'script type="text/plain" data-category="statistics" ', $tag );
		}

		return $tag;
	}

	/**
	 * Enqueue admin assets for plugin pages.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 * @return void
	 */
	public function enqueue_admin_assets( $hook_suffix ) {
		if ( 0 !== strpos( (string) $hook_suffix, 'minimal-map' ) && false === strpos( (string) $hook_suffix, 'minimal-map' ) ) {
			return;
		}

		$this->attach_inline_data();
		wp_enqueue_script( 'minimal-map-admin' );
		wp_enqueue_style( 'minimal-map-admin-style' );
	}

	/**
	 * Enqueue admin-wide command palette integration.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 * @return void
	 */
	public function enqueue_admin_command_palette_assets( $hook_suffix ) {
		unset( $hook_suffix );

		if ( is_network_admin() || ! current_user_can( Admin\Admin_Menu::CAPABILITY ) ) {
			return;
		}

		if ( ! wp_script_is( 'wp-core-commands', 'registered' ) ) {
			return;
		}

		$this->attach_admin_commands_inline_data();
		wp_enqueue_script( 'minimal-map-admin-commands' );
	}

	/**
	 * Enqueue frontend assets.
	 *
	 * @return void
	 */
	public function enqueue_frontend_assets() {
		$this->attach_inline_data();
	}

	/**
	 * Register a JS entry.
	 *
	 * @param string $handle Script handle.
	 * @param string $filename Output filename.
	 * @return void
	 */
	private function register_script( $handle, $filename ) {
		$file_path = MINIMAL_MAP_PATH . 'build/' . $filename;
		$file_url  = MINIMAL_MAP_URL . 'build/' . $filename;

		if ( ! file_exists( $file_path ) ) {
			return;
		}

		$asset = $this->get_asset_metadata( $filename );

		wp_register_script(
			$handle,
			$file_url,
			$this->sanitize_script_dependencies( $asset['dependencies'] ),
			$asset['version'],
			true
		);

		wp_set_script_translations( $handle, 'minimal-map', MINIMAL_MAP_PATH . 'languages' );
	}

	/**
	 * Register a CSS entry.
	 *
	 * @param string $handle Style handle.
	 * @param string $filename Output filename.
	 * @param array  $dependencies Style dependencies.
	 * @return void
	 */
	private function register_style( $handle, $filename, $dependencies = array() ) {
		$file_path = MINIMAL_MAP_PATH . 'build/' . $filename;
		$file_url  = MINIMAL_MAP_URL . 'build/' . $filename;

		if ( ! is_readable( $file_path ) ) {
			return;
		}

		$version = filemtime( $file_path );

		if ( false === $version ) {
			$version = MINIMAL_MAP_VERSION;
		}

		wp_register_style(
			$handle,
			$file_url,
			$dependencies,
			(string) $version
		);
	}

	/**
	 * Remove extracted CSS handles from generated script dependencies.
	 *
	 * Webpack can include CSS pseudo-handles in the asset metadata when styles are
	 * imported from lazy JS chunks. WordPress script registration only accepts
	 * script handles here.
	 *
	 * @param array<int, mixed> $dependencies Raw generated dependencies.
	 * @return array<int, string>
	 */
	private function sanitize_script_dependencies( $dependencies ) {
		if ( ! is_array( $dependencies ) ) {
			return array();
		}

		return array_values(
			array_filter(
				$dependencies,
				static function ( $dependency ) {
					return is_string( $dependency ) && '.css' !== substr( $dependency, -4 );
				}
			)
		);
	}

	/**
	 * Attach inline config objects.
	 *
	 * @return void
	 */
	private function attach_inline_data() {
		if ( is_admin() && wp_script_is( 'minimal-map-block-editor', 'registered' ) ) {
			wp_add_inline_script(
				'minimal-map-block-editor',
				'window.MinimalMapBlockConfig = ' . wp_json_encode( $this->config->get_client_config( true ) ) . ';',
				'before'
			);
		}

		if ( ! is_admin() && wp_script_is( 'minimal-map-frontend', 'registered' ) ) {
			wp_add_inline_script(
				'minimal-map-frontend',
				'window.MinimalMapFrontConfig = ' . wp_json_encode( $this->config->get_client_config( false ) ) . ';',
				'before'
			);

			$config = $this->config->get_client_config( false );
			if ( ! empty( $config['analyticsEnabled'] ) && ! empty( $config['analyticsComplianzEnabled'] ) ) {
				wp_add_inline_script(
					'minimal-map-frontend',
					'window.MinimalMapComplianzConsent = true;',
					'after'
				);
			}
		}

		if ( wp_script_is( 'minimal-map-admin', 'registered' ) ) {
			wp_add_inline_script(
				'minimal-map-admin',
				'window.MinimalMapAdminConfig = ' . wp_json_encode( $this->config->get_admin_app_config() ) . ';',
				'before'
			);
		}
	}

	/**
	 * Attach command palette config for admin-wide navigation commands.
	 *
	 * @return void
	 */
	private function attach_admin_commands_inline_data() {
		if ( ! wp_script_is( 'minimal-map-admin-commands', 'registered' ) ) {
			return;
		}

		wp_add_inline_script(
			'minimal-map-admin-commands',
			'window.MinimalMapAdminCommandsConfig = ' . wp_json_encode( $this->config->get_admin_commands_config() ) . ';',
			'before'
		);
	}

	/**
	 * Read the generated asset metadata.
	 *
	 * @param string $filename Build filename.
	 * @return array<string, mixed>
	 */
	private function get_asset_metadata( $filename ) {
		$asset_path = MINIMAL_MAP_PATH . 'build/' . str_replace( '.js', '.asset.php', $filename );

		if ( file_exists( $asset_path ) ) {
			$asset = require $asset_path;

			if ( is_array( $asset ) ) {
				return array(
					'dependencies' => isset( $asset['dependencies'] ) ? $asset['dependencies'] : array(),
					'version'      => isset( $asset['version'] ) ? $asset['version'] : MINIMAL_MAP_VERSION,
				);
			}
		}

		return array(
			'dependencies' => array(),
			'version'      => MINIMAL_MAP_VERSION,
		);
	}
}

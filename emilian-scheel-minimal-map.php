<?php
/**
 * Plugin Name:       Emilian Scheel's Minimal Map & Store Locator
 * Description:       Gutenberg-first native map block and admin shell for WordPress.
 * Version:           0.8.3
 * Requires at least: 6.9
 * Requires PHP:      8.3
 * Author:            Emilian Scheel
 * License:           MIT
 * License URI:       https://opensource.org/license/mit/
 * Text Domain:       minimal-map
 * Domain Path:       /languages
 *
 * @package Minimal_Map
 */

defined( 'ABSPATH' ) || exit;

define( 'MINIMAL_MAP_VERSION', '0.8.3' );
define( 'MINIMAL_MAP_FILE', __FILE__ );
define( 'MINIMAL_MAP_PATH', plugin_dir_path( __FILE__ ) );
define( 'MINIMAL_MAP_URL', plugin_dir_url( __FILE__ ) );

require_once MINIMAL_MAP_PATH . 'includes/bootstrap.php';

register_activation_hook( MINIMAL_MAP_FILE, array( '\MinimalMap\Plugin', 'activate' ) );

\MinimalMap\Plugin::boot();

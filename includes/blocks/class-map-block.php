<?php
/**
 * Block registration.
 *
 * @package Minimal_Map
 */

namespace MinimalMap\Blocks;

defined( 'ABSPATH' ) || exit;

use MinimalMap\Map_View;

/**
 * Registers the map block.
 */
class Map_Block {
	/**
	 * Frontend view service.
	 *
	 * @var Map_View
	 */
	private $map_view;

	/**
	 * Constructor.
	 *
	 * @param Map_View $map_view Frontend renderer.
	 */
	public function __construct( Map_View $map_view ) {
		$this->map_view = $map_view;
	}

	/**
	 * Register the block.
	 *
	 * @return void
	 */
	public function register() {
		$this->get_metadata_translations();

		register_block_type(
			MINIMAL_MAP_PATH . 'block.json',
			array(
				'render_callback' => array( $this->map_view, 'render' ),
			)
		);
	}

	/**
	 * Mirror block metadata strings for offline POT extraction.
	 *
	 * @return array<string, string>
	 */
	private function get_metadata_translations() {
		return array(
			'title'       => __( 'Minimal Map', 'minimal-map' ),
			'description' => __( 'Render a minimalist MapLibre-powered map.', 'minimal-map' ),
		);
	}
}

<?php
/**
 * Tag taxonomy registration.
 *
 * @package Minimal_Map
 */

namespace MinimalMap\Tags;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the tag taxonomy content model.
 */
class Tag_Taxonomy {
	/**
	 * Capability required to manage tags.
	 */
	const CAPABILITY = 'manage_options';

	/**
	 * Tag taxonomy slug.
	 */
	const TAXONOMY = 'minimal_map_tag';

	/**
	 * REST base.
	 */
	const REST_BASE = 'minimal_map_tag';

	/**
	 * Registered term meta fields.
	 *
	 * @var array<string, string>
	 */
	const META_FIELDS = array(
		'background_color' => 'sanitize_hex_color',
		'foreground_color' => 'sanitize_hex_color',
	);

	/**
	 * Register the taxonomy and meta.
	 *
	 * @return void
	 */
	public function register() {
		register_taxonomy(
			self::TAXONOMY,
			array( 'minimal_map_location' ),
			array(
				'labels'            => array(
					'name'          => __( 'Tags', 'minimal-map' ),
					'singular_name' => __( 'Tag', 'minimal-map' ),
				),
				'public'            => false,
				'show_ui'           => false,
				'show_in_menu'      => false,
				'show_in_rest'      => true,
				'rest_base'         => self::REST_BASE,
				'hierarchical'      => false,
				'show_admin_column' => true,
				'query_var'         => true,
				'rewrite'           => array( 'slug' => 'minimal-map-tag' ),
			)
		);

		foreach ( self::META_FIELDS as $meta_key => $sanitize_callback ) {
			register_term_meta(
				self::TAXONOMY,
				$meta_key,
				array(
					'auth_callback'     => array( $this, 'can_manage_tags' ),
					'sanitize_callback' => $sanitize_callback,
					'show_in_rest'      => true,
					'single'            => true,
					'type'              => 'string',
				)
			);
		}
	}

	/**
	 * Whether the current user can manage tags.
	 *
	 * @return bool
	 */
	public function can_manage_tags() {
		return current_user_can( self::CAPABILITY );
	}

	/**
	 * Get the REST path for tags.
	 *
	 * @return string
	 */
	public static function get_rest_path() {
		return '/wp/v2/' . self::REST_BASE;
	}

	/**
	 * Get the current tag count.
	 *
	 * @return int
	 */
	public static function get_tag_count() {
		if ( ! taxonomy_exists( self::TAXONOMY ) ) {
			return 0;
		}

		return (int) wp_count_terms( self::TAXONOMY );
	}
}

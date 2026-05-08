<?php
/**
 * Logo post type registration.
 *
 * @package Minimal_Map
 */

namespace MinimalMap\Logos;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the logo content model.
 */
class Logo_Post_Type {
	/**
	 * Capability required to manage logos.
	 */
	const CAPABILITY = 'manage_options';

	/**
	 * Logo post type slug.
	 */
	const POST_TYPE = 'minimal_map_logo';

	/**
	 * REST base.
	 */
	const REST_BASE = 'minimal_map_logo';

	/**
	 * Register the post type.
	 *
	 * @return void
	 */
	public function register() {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'          => __( 'Logos', 'minimal-map' ),
					'singular_name' => __( 'Logo', 'minimal-map' ),
				),
				'public'              => false,
				'show_ui'             => false,
				'show_in_menu'        => false,
				'show_in_rest'        => true,
				'rest_base'           => self::REST_BASE,
				'supports'            => array( 'title', 'editor' ),
				'map_meta_cap'        => true,
				'capability_type'     => array( 'minimal_map_logo', 'minimal_map_logos' ),
				'capabilities'        => $this->get_capabilities(),
				'delete_with_user'    => false,
				'exclude_from_search' => true,
			)
		);
	}

	/**
	 * Get mapped primitive capabilities for the logo post type.
	 *
	 * @return array<string, string>
	 */
	private function get_capabilities() {
		return array(
			'create_posts'           => self::CAPABILITY,
			'delete_others_posts'    => self::CAPABILITY,
			'delete_posts'           => self::CAPABILITY,
			'delete_private_posts'   => self::CAPABILITY,
			'delete_published_posts' => self::CAPABILITY,
			'edit_others_posts'      => self::CAPABILITY,
			'edit_posts'             => self::CAPABILITY,
			'edit_private_posts'     => self::CAPABILITY,
			'edit_published_posts'   => self::CAPABILITY,
			'publish_posts'          => self::CAPABILITY,
			'read'                   => self::CAPABILITY,
			'read_private_posts'     => self::CAPABILITY,
		);
	}

	/**
	 * Get the REST path for logos.
	 *
	 * @return string
	 */
	public static function get_rest_path() {
		return '/wp/v2/' . self::REST_BASE;
	}

	/**
	 * Get the current published logo count.
	 *
	 * @return int
	 */
	public static function get_logo_count() {
		if ( ! post_type_exists( self::POST_TYPE ) ) {
			return 0;
		}

		$counts = wp_count_posts( self::POST_TYPE );

		if ( ! $counts ) {
			return 0;
		}

		return property_exists( $counts, 'publish' ) ? (int) $counts->publish : 0;
	}
}

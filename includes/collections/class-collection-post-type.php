<?php
/**
 * Collection post type registration.
 *
 * @package Minimal_Map
 */

namespace MinimalMap\Collections;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the collection content model.
 */
class Collection_Post_Type {
	/**
	 * Capability required to manage collections.
	 */
	const CAPABILITY = 'manage_options';

	/**
	 * Collection post type slug.
	 */
	const POST_TYPE = 'minimal_collection';

	/**
	 * REST base.
	 */
	const REST_BASE = 'minimal_map_collection';

	/**
	 * Assignment meta key.
	 */
	const LOCATION_IDS_META_KEY = 'location_ids';

	/**
	 * Register the post type and meta.
	 *
	 * @return void
	 */
	public function register() {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'              => array(
					'name'          => __( 'Collections', 'minimal-map' ),
					'singular_name' => __( 'Collection', 'minimal-map' ),
				),
				'public'              => false,
				'show_ui'             => false,
				'show_in_menu'        => false,
				'show_in_rest'        => true,
				'rest_base'           => self::REST_BASE,
				'supports'            => array( 'title', 'custom-fields' ),
				'map_meta_cap'        => true,
				'capability_type'     => array( 'minimal_map_collection', 'minimal_map_collections' ),
				'capabilities'        => $this->get_capabilities(),
				'delete_with_user'    => false,
				'exclude_from_search' => true,
			)
		);

		register_post_meta(
			self::POST_TYPE,
			self::LOCATION_IDS_META_KEY,
			array(
				'auth_callback'     => array( $this, 'can_manage_collections' ),
				'sanitize_callback' => array( $this, 'sanitize_location_ids' ),
				'show_in_rest'      => array(
					'schema' => array(
						'type'    => 'array',
						'items'   => array(
							'type' => 'integer',
						),
						'default' => array(),
					),
				),
				'single'            => true,
				'type'              => 'array',
				'default'           => array(),
			)
		);
	}

	/**
	 * Get mapped primitive capabilities for the collection post type.
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
	 * Whether the current user can manage collections.
	 *
	 * @return bool
	 */
	public function can_manage_collections() {
		return current_user_can( self::CAPABILITY );
	}

	/**
	 * Sanitize assigned location identifiers.
	 *
	 * @param mixed $value Raw meta value.
	 * @return int[]
	 */
	public function sanitize_location_ids( $value ) {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$location_ids = array_map( 'absint', $value );
		$location_ids = array_filter(
			$location_ids,
			static function ( $location_id ) {
				return $location_id > 0;
			}
		);

		return array_values( array_unique( $location_ids ) );
	}

	/**
	 * Get the REST path for collections.
	 *
	 * @return string
	 */
	public static function get_rest_path() {
		return '/wp/v2/' . self::REST_BASE;
	}

	/**
	 * Get the current published collection count.
	 *
	 * @return int
	 */
	public static function get_collection_count() {
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

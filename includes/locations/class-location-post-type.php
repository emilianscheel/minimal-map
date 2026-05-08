<?php
/**
 * Location post type registration.
 *
 * @package Minimal_Map
 */

namespace MinimalMap\Locations;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the location content model.
 */
class Location_Post_Type {
	/**
	 * Capability required to manage locations.
	 */
	const CAPABILITY = 'manage_options';

	/**
	 * Location post type slug.
	 */
	const POST_TYPE = 'minimal_map_location';

	/**
	 * REST base.
	 */
	const REST_BASE = 'minimal_map_location';

	/**
	 * Registered meta fields.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	const META_FIELDS = array(
		'telephone'           => array(
			'sanitize_callback' => 'sanitize_text_field',
			'type'              => 'string',
		),
		'email'               => array(
			'sanitize_callback' => 'sanitize_email',
			'type'              => 'string',
		),
		'website'             => array(
			'sanitize_callback' => 'esc_url_raw',
			'type'              => 'string',
		),
		'street'              => array(
			'sanitize_callback' => 'sanitize_text_field',
			'type'              => 'string',
		),
		'house_number'        => array(
			'sanitize_callback' => 'sanitize_text_field',
			'type'              => 'string',
		),
		'postal_code'         => array(
			'sanitize_callback' => 'sanitize_text_field',
			'type'              => 'string',
		),
		'city'                => array(
			'sanitize_callback' => 'sanitize_text_field',
			'type'              => 'string',
		),
		'state'               => array(
			'sanitize_callback' => 'sanitize_text_field',
			'type'              => 'string',
		),
		'country'             => array(
			'sanitize_callback' => 'sanitize_text_field',
			'type'              => 'string',
		),
		'latitude'            => array(
			'sanitize_callback' => 'sanitize_text_field',
			'type'              => 'string',
		),
		'longitude'           => array(
			'sanitize_callback' => 'sanitize_text_field',
			'type'              => 'string',
		),
		'logo_id'             => array(
			'sanitize_callback' => 'absint',
			'type'              => 'integer',
		),
		'marker_id'           => array(
			'sanitize_callback' => 'absint',
			'type'              => 'integer',
		),
		'marker_color'        => array(
			'sanitize_callback' => 'sanitize_hex_color',
			'type'              => 'string',
			'default'           => '#3FB1CE',
		),
		'is_hidden'           => array(
			'sanitize_callback' => 'rest_sanitize_boolean',
			'type'              => 'boolean',
			'default'           => false,
		),
		'opening_hours_notes' => array(
			'sanitize_callback' => 'sanitize_textarea_field',
			'type'              => 'string',
		),
	);

	/**
	 * Supported opening-hours day keys.
	 *
	 * @var string[]
	 */
	const OPENING_HOURS_DAY_KEYS = array(
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
		'sunday',
	);

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
					'name'          => __( 'Locations', 'minimal-map' ),
					'singular_name' => __( 'Location', 'minimal-map' ),
				),
				'public'              => false,
				'show_ui'             => false,
				'show_in_menu'        => false,
				'show_in_rest'        => true,
				'rest_base'           => self::REST_BASE,
				'supports'            => array( 'title', 'custom-fields' ),
				'taxonomies'          => array( 'minimal_map_tag' ),
				'map_meta_cap'        => true,
				'capability_type'     => array( 'minimal_map_location', 'minimal_map_locations' ),
				'capabilities'        => $this->get_capabilities(),
				'delete_with_user'    => false,
				'exclude_from_search' => true,
			)
		);

		foreach ( self::META_FIELDS as $meta_key => $meta_config ) {
			$register_args = array(
				'auth_callback'     => array( $this, 'can_manage_locations' ),
				'sanitize_callback' => $meta_config['sanitize_callback'],
				'show_in_rest'      => true,
				'single'            => true,
				'type'              => $meta_config['type'],
			);

			if ( array_key_exists( 'default', $meta_config ) ) {
				$register_args['default'] = $meta_config['default'];
			}

			register_post_meta(
				self::POST_TYPE,
				$meta_key,
				$register_args
			);
		}

		register_post_meta(
			self::POST_TYPE,
			'opening_hours',
			array(
				'auth_callback'     => array( $this, 'can_manage_locations' ),
				'sanitize_callback' => array( $this, 'sanitize_opening_hours' ),
				'show_in_rest'      => array(
					'schema' => $this->get_opening_hours_schema(),
				),
				'single'            => true,
				'type'              => 'object',
				'default'           => $this->get_default_opening_hours(),
			)
		);

		register_post_meta(
			self::POST_TYPE,
			'social_media',
			array(
				'auth_callback'     => array( $this, 'can_manage_locations' ),
				'sanitize_callback' => array( $this, 'sanitize_social_media' ),
				'show_in_rest'      => array(
					'schema' => array(
						'type'  => 'array',
						'items' => array(
							'type'       => 'object',
							'properties' => array(
								'platform' => array(
									'type' => 'string',
									'enum' => array( 'instagram', 'x', 'facebook', 'threads', 'youtube', 'telegram' ),
								),
								'url'      => array(
									'type'   => 'string',
								),
							),
						),
					),
				),
				'single'            => true,
				'type'              => 'array',
				'default'           => array(
					array( 'platform' => 'instagram', 'url' => '' ),
					array( 'platform' => 'x', 'url' => '' ),
				),
			)
		);
	}

	/**
	 * Get mapped primitive capabilities for the location post type.
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
	 * Whether the current user can manage locations.
	 *
	 * @return bool
	 */
	public function can_manage_locations() {
		return current_user_can( self::CAPABILITY );
	}

	/**
	 * Sanitize one opening-hours object.
	 *
	 * @param mixed $value Raw meta value.
	 * @return array<string, array<string, mixed>>
	 */
	public function sanitize_opening_hours( $value ) {
		if ( ! is_array( $value ) ) {
			return $this->get_default_opening_hours();
		}

		$sanitized = array();

		foreach ( self::OPENING_HOURS_DAY_KEYS as $day_key ) {
			$day_value = isset( $value[ $day_key ] ) && is_array( $value[ $day_key ] )
				? $value[ $day_key ]
				: array();

			$sanitized[ $day_key ] = array(
				'open'                   => $this->sanitize_opening_hours_time(
					isset( $day_value['open'] ) ? $day_value['open'] : ''
				),
				'close'                  => $this->sanitize_opening_hours_time(
					isset( $day_value['close'] ) ? $day_value['close'] : ''
				),
				'lunch_start'            => $this->sanitize_opening_hours_time(
					isset( $day_value['lunch_start'] ) ? $day_value['lunch_start'] : ''
				),
				'lunch_duration_minutes' => isset( $day_value['lunch_duration_minutes'] )
					? absint( $day_value['lunch_duration_minutes'] )
					: 0,
			);
		}

		return $sanitized;
	}

	/**
	 * Sanitize social media links.
	 *
	 * @param mixed $value Raw meta value.
	 * @return array<int, array<string, string>>
	 */
	public function sanitize_social_media( $value ) {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$sanitized = array();
		$allowed_platforms = array( 'instagram', 'x', 'facebook', 'threads', 'youtube', 'telegram' );

		foreach ( $value as $link ) {
			if ( ! is_array( $link ) ) {
				continue;
			}

			$platform = isset( $link['platform'] ) ? sanitize_text_field( $link['platform'] ) : '';
			$url = isset( $link['url'] ) ? esc_url_raw( $link['url'] ) : '';

			if ( in_array( $platform, $allowed_platforms, true ) ) {
				$sanitized[] = array(
					'platform' => $platform,
					'url'      => $url,
				);
			}
		}

		return $sanitized;
	}

	/**
	 * Get the REST path for locations.
	 *
	 * @return string
	 */
	public static function get_rest_path() {
		return '/wp/v2/' . self::REST_BASE;
	}

	/**
	 * Get the current published location count.
	 *
	 * @return int
	 */
	public static function get_location_count() {
		if ( ! post_type_exists( self::POST_TYPE ) ) {
			return 0;
		}

		$counts = wp_count_posts( self::POST_TYPE );

		if ( ! $counts ) {
			return 0;
		}

		return property_exists( $counts, 'publish' ) ? (int) $counts->publish : 0;
	}

	/**
	 * Get the default opening-hours day shape.
	 *
	 * @return array<string, mixed>
	 */
	private function get_default_opening_hours_day() {
		return array(
			'open'                   => '',
			'close'                  => '',
			'lunch_start'            => '',
			'lunch_duration_minutes' => 0,
		);
	}

	/**
	 * Get the default opening-hours object.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	private function get_default_opening_hours() {
		$defaults = array();

		foreach ( self::OPENING_HOURS_DAY_KEYS as $day_key ) {
			$defaults[ $day_key ] = $this->get_default_opening_hours_day();
		}

		return $defaults;
	}

	/**
	 * Get the REST schema for one opening-hours day.
	 *
	 * @return array<string, mixed>
	 */
	private function get_opening_hours_day_schema() {
		return array(
			'type'                 => 'object',
			'additionalProperties' => false,
			'properties'           => array(
				'open'                   => array(
					'type'    => 'string',
					'default' => '',
				),
				'close'                  => array(
					'type'    => 'string',
					'default' => '',
				),
				'lunch_start'            => array(
					'type'    => 'string',
					'default' => '',
				),
				'lunch_duration_minutes' => array(
					'type'    => 'integer',
					'default' => 0,
				),
			),
			'default'              => $this->get_default_opening_hours_day(),
		);
	}

	/**
	 * Get the REST schema for the opening-hours object.
	 *
	 * @return array<string, mixed>
	 */
	private function get_opening_hours_schema() {
		$properties = array();

		foreach ( self::OPENING_HOURS_DAY_KEYS as $day_key ) {
			$properties[ $day_key ] = $this->get_opening_hours_day_schema();
		}

		return array(
			'type'                 => 'object',
			'additionalProperties' => false,
			'properties'           => $properties,
			'default'              => $this->get_default_opening_hours(),
		);
	}

	/**
	 * Sanitize one HH:MM time value.
	 *
	 * @param mixed $value Raw time value.
	 * @return string
	 */
	private function sanitize_opening_hours_time( $value ) {
		if ( ! is_scalar( $value ) ) {
			return '';
		}

		$time = trim( sanitize_text_field( (string) $value ) );

		if ( '' === $time ) {
			return '';
		}

		return preg_match( '/^(?:[01]\d|2[0-3]):[0-5]\d$/', $time ) ? $time : '';
	}
}

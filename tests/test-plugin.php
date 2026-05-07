<?php
/**
 * Plugin integration tests.
 *
 * @package Minimal_Map
 */

/**
 * Verifies core plugin registration.
 */
class Minimal_Map_Plugin_Test extends WP_UnitTestCase {

	/**
	 * Location content model service.
	 *
	 * @var \MinimalMap\Locations\Location_Post_Type
	 */
	private $location_post_type;

	/**
	 * Collection content model service.
	 *
	 * @var \MinimalMap\Collections\Collection_Post_Type
	 */
	private $collection_post_type;

	/**
	 * Bootstrap test services.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->location_post_type   = new \MinimalMap\Locations\Location_Post_Type();
		$this->collection_post_type = new \MinimalMap\Collections\Collection_Post_Type();
	}

	/**
	 * Create one published location post with optional coordinates.
	 *
	 * @param mixed $latitude Latitude meta value.
	 * @param mixed $longitude Longitude meta value.
	 * @return int
	 */
	private function create_location( $latitude, $longitude, $title = null, $is_hidden = false ) {
		$post_id = self::factory()->post->create(
			array(
				'post_status' => 'publish',
				'post_title'  => is_string( $title ) ? $title : 'Location ' . wp_generate_uuid4(),
				'post_type'   => \MinimalMap\Locations\Location_Post_Type::POST_TYPE,
			)
		);

		if ( null !== $latitude ) {
			update_post_meta( $post_id, 'latitude', $latitude );
		}

		if ( null !== $longitude ) {
			update_post_meta( $post_id, 'longitude', $longitude );
		}

		update_post_meta( $post_id, 'is_hidden', $is_hidden );

		return $post_id;
	}

	/**
	 * Create one published collection post with optional assigned location ids.
	 *
	 * @param int[] $location_ids Assigned location ids.
	 * @return int
	 */
	private function create_collection( $location_ids = array() ) {
		$post_id = self::factory()->post->create(
			array(
				'post_status' => 'publish',
				'post_title'  => 'Collection ' . wp_generate_uuid4(),
				'post_type'   => \MinimalMap\Collections\Collection_Post_Type::POST_TYPE,
			)
		);

		update_post_meta(
			$post_id,
			\MinimalMap\Collections\Collection_Post_Type::LOCATION_IDS_META_KEY,
			$location_ids
		);

		return $post_id;
	}

	/**
	 * Create one published logo post.
	 *
	 * @return int
	 */
	private function create_logo() {
		return self::factory()->post->create(
			array(
				'post_status'  => 'publish',
				'post_title'   => 'Logo ' . wp_generate_uuid4(),
				'post_content' => '<svg viewBox="0 0 32 32"></svg>',
				'post_type'    => \MinimalMap\Logos\Logo_Post_Type::POST_TYPE,
			)
		);
	}

	/**
	 * Create one location tag term.
	 *
	 * @param string $name Tag name.
	 * @return int
	 */
	private function create_tag( $name ) {
		$result = wp_insert_term(
			$name,
			\MinimalMap\Tags\Tag_Taxonomy::TAXONOMY
		);

		$this->assertIsArray( $result );

		$term_id = (int) $result['term_id'];

		update_term_meta( $term_id, 'background_color', '#111111' );
		update_term_meta( $term_id, 'foreground_color', '#ffffff' );

		return $term_id;
	}

	/**
	 * Create one administrator user and authenticate as that user.
	 *
	 * @return int
	 */
	private function create_admin_user() {
		$user_id = self::factory()->user->create(
			array(
				'role' => 'administrator',
			)
		);

		wp_set_current_user( $user_id );

		return $user_id;
	}

	/**
	 * Encode one embed payload using the public base64url format.
	 *
	 * @param array<string, mixed> $payload Embed payload.
	 * @return string
	 */
	private function encode_embed_payload( $payload ) {
		return rtrim(
			strtr( base64_encode( wp_json_encode( $payload ) ), '+/', '-_' ),
			'='
		);
	}

	/**
	 * The block should be registered on init.
	 *
	 * @return void
	 */
	public function test_map_block_is_registered() {
		$this->assertTrue( WP_Block_Type_Registry::get_instance()->is_registered( 'minimal-map/map' ) );
	}

	/**
	 * The OpenFreeMap default should be available.
	 *
	 * @return void
	 */
	public function test_default_style_preset_exists() {
		$config  = new \MinimalMap\Config();
		$presets = $config->get_style_presets();

		$this->assertArrayHasKey( 'liberty', $presets );
		$this->assertSame( 'https://tiles.openfreemap.org/styles/liberty', $presets['liberty']['style_url'] );
	}

	/**
	 * Height units should normalize into a CSS-ready value.
	 *
	 * @return void
	 */
	public function test_height_unit_defaults_to_pixels() {
		$config      = new \MinimalMap\Config();
		$attributes  = $config->normalize_block_attributes(
			array(
				'height' => 36,
			)
		);

		$this->assertSame( 'px', $attributes['heightUnit'] );
		$this->assertSame( '36px', $attributes['heightCssValue'] );
		$this->assertSame( '36px', $attributes['heightMobileCssValue'] );
	}

	/**
	 * Mobile height should be normalized independently when provided.
	 *
	 * @return void
	 */
	public function test_height_mobile_override_normalizes_to_css_value() {
		$config     = new \MinimalMap\Config();
		$attributes = $config->normalize_block_attributes(
			array(
				'height'           => 36,
				'heightUnit'       => 'px',
				'heightMobile'     => 55,
				'heightMobileUnit' => 'vh',
			)
		);

		$this->assertSame( 55.0, $attributes['heightMobile'] );
		$this->assertSame( 'vh', $attributes['heightMobileUnit'] );
		$this->assertSame( '55vh', $attributes['heightMobileCssValue'] );
	}

	/**
	 * Block-support border radius values should be folded into the shared map config.
	 *
	 * @return void
	 */
	public function test_border_radius_support_is_normalized_into_map_config() {
		$config     = new \MinimalMap\Config();
		$attributes = $config->normalize_block_attributes(
			array(
				'style' => array(
					'border' => array(
						'radius' => array(
							'topLeft' => '10px',
							'topRight' => '12px',
							'bottomRight' => '14px',
							'bottomLeft' => '16px',
						),
					),
				),
			)
		);

		$this->assertSame( '10px 12px 14px 16px', $attributes['borderRadius'] );
	}

	/**
	 * Global styles should feed the default iframe font family.
	 *
	 * @return void
	 */
	public function test_default_block_attributes_use_global_font_family_when_available() {
		$filter = static function ( $theme_json ) {
			return $theme_json->update_with(
				array(
					'version' => 3,
					'styles'  => array(
						'typography' => array(
							'fontFamily' => '"Fraunces", serif',
						),
					),
				)
			);
		};

		add_filter( 'wp_theme_json_data_user', $filter );
		wp_clean_theme_json_cache();

		try {
			$config   = new \MinimalMap\Config();
			$defaults = $config->get_default_block_attributes();

			$this->assertSame( '"Fraunces", serif', $defaults['fontFamily'] );
		} finally {
			remove_filter( 'wp_theme_json_data_user', $filter );
			wp_clean_theme_json_cache();
		}
	}

	/**
	 * Mobile two-finger zoom should default off for blocks and accept explicit enablement.
	 *
	 * @return void
	 */
	public function test_mobile_two_finger_zoom_defaults_off_for_blocks() {
		$config = new \MinimalMap\Config();

		$default_attributes = $config->normalize_block_attributes( array() );
		$enabled_attributes = $config->normalize_block_attributes(
			array(
				'mobileTwoFingerZoom' => true,
			)
		);

		$this->assertFalse( $default_attributes['mobileTwoFingerZoom'] );
		$this->assertTrue( $enabled_attributes['mobileTwoFingerZoom'] );
	}

	/**
	 * Cooperative gestures should default on for blocks and accept explicit disablement.
	 *
	 * @return void
	 */
	public function test_cooperative_gestures_defaults_on_for_blocks() {
		$config = new \MinimalMap\Config();

		$default_attributes = $config->normalize_block_attributes( array() );
		$disabled_attributes = $config->normalize_block_attributes(
			array(
				'cooperativeGestures' => false,
			)
		);

		$this->assertTrue( $default_attributes['cooperativeGestures'] );
		$this->assertFalse( $disabled_attributes['cooperativeGestures'] );
	}

	/**
	 * Live location feature toggles should default off for blocks and accept explicit enablement.
	 *
	 * @return void
	 */
	public function test_live_location_features_default_off_for_blocks() {
		$config = new \MinimalMap\Config();

		$default_attributes = $config->normalize_block_attributes( array() );
		$enabled_attributes = $config->normalize_block_attributes(
			array(
				'enableLiveLocationSearch' => true,
				'enableLiveLocationMap'    => true,
			)
		);

		$this->assertFalse( $default_attributes['enableLiveLocationSearch'] );
		$this->assertFalse( $default_attributes['enableLiveLocationMap'] );
		$this->assertTrue( $enabled_attributes['enableLiveLocationSearch'] );
		$this->assertTrue( $enabled_attributes['enableLiveLocationMap'] );
	}

	/**
	 * Marker clustering should default off for blocks and accept explicit enablement.
	 *
	 * @return void
	 */
	public function test_marker_clustering_defaults_off_for_blocks() {
		$config = new \MinimalMap\Config();

		$default_attributes = $config->normalize_block_attributes( array() );
		$enabled_attributes = $config->normalize_block_attributes(
			array(
				'enableMarkerClustering' => true,
			)
		);

		$this->assertFalse( $default_attributes['enableMarkerClustering'] );
		$this->assertTrue( $enabled_attributes['enableMarkerClustering'] );
	}

	/**
	 * Published locations with valid coordinates should be exposed to the client.
	 *
	 * @return void
	 */
	public function test_get_map_locations_includes_only_valid_published_locations() {
		$config = new \MinimalMap\Config();

		$this->create_location( '52.517', '13.388' );
		$this->create_location( '', '13.400' );
		$this->create_location( '52.520', '' );
		$this->create_location( 'not-a-number', '13.410' );
		$this->create_location( '91', '13.420' );

		wp_insert_post(
			array(
				'post_status' => 'draft',
				'post_title'  => 'Draft location',
				'post_type'   => \MinimalMap\Locations\Location_Post_Type::POST_TYPE,
				'meta_input'  => array(
					'latitude'  => '40.7128',
					'longitude' => '-74.0060',
				),
			)
		);

		$this->assertSame(
			array(
				array(
					'lat' => 52.517,
					'lng' => 13.388,
				),
			),
			$config->get_map_locations()
		);
	}

	/**
	 * Streamed frontend location payloads should expose raw titles instead of HTML entities.
	 *
	 * @return void
	 */
	public function test_get_optimized_map_data_preserves_raw_location_titles() {
		$config      = new \MinimalMap\Config();
		$location_id = $this->create_location( '52.517', '13.388', "denn's" );
		$data        = $config->get_optimized_map_data();

		$this->assertArrayHasKey( 'locations', $data );
		$this->assertCount( 1, $data['locations'] );
		$this->assertSame( $location_id, $data['locations'][0]['id'] );
		$this->assertSame( "denn's", $data['locations'][0]['title'] );
	}

	/**
	 * Client config should contain the normalized location payload.
	 *
	 * @return void
	 */
	public function test_client_config_includes_locations_payload() {
		$config = new \MinimalMap\Config();

		$location_id = $this->create_location( '48.137154', '11.576124' );
		update_post_meta(
			$location_id,
			'opening_hours',
			array(
				'monday' => array(
					'open'                   => '09:00',
					'close'                  => '18:00',
					'lunch_start'            => '12:30',
					'lunch_duration_minutes' => 30,
				),
			)
		);
		update_post_meta( $location_id, 'opening_hours_notes', 'Seasonal hours apply.' );

		$client_config = $config->get_client_config();

		$this->assertArrayHasKey( 'locations', $client_config );
		$this->assertCount( 1, $client_config['locations'] );
		$this->assertSame( 48.137154, $client_config['locations'][0]['lat'] );
		$this->assertSame( 11.576124, $client_config['locations'][0]['lng'] );
		$this->assertSame( '09:00', $client_config['locations'][0]['opening_hours']['monday']['open'] );
		$this->assertSame( 30, $client_config['locations'][0]['opening_hours']['monday']['lunch_duration_minutes'] );
		$this->assertSame( 'Seasonal hours apply.', $client_config['locations'][0]['opening_hours_notes'] );
	}

	/**
	 * Client config should expose site locale and timezone for opening-hours formatting.
	 *
	 * @return void
	 */
	public function test_client_config_includes_site_time_metadata() {
		$config = new \MinimalMap\Config();

		$client_config = $config->get_client_config();

		$this->assertSame( str_replace( '_', '-', get_locale() ), $client_config['siteLocale'] );
		$this->assertArrayHasKey( 'siteTimezone', $client_config );
		$this->assertNotSame( '', $client_config['siteTimezone'] );
	}

	/**
	 * Client config should expose collection options with their assigned points.
	 *
	 * @return void
	 */
	public function test_client_config_includes_collection_payload() {
		$config        = new \MinimalMap\Config();
		$location_id   = $this->create_location( '48.137154', '11.576124' );
		$collection_id = $this->create_collection( array( $location_id ) );

		$client_config = $config->get_client_config();

		$this->assertArrayHasKey( 'collections', $client_config );
		$this->assertCount( 1, $client_config['collections'] );
		$this->assertSame( $collection_id, $client_config['collections'][0]['id'] );
		$this->assertSame(
			array(
				array(
					'lat' => 48.137154,
					'lng' => 11.576124,
				),
			),
			$client_config['collections'][0]['locations']
		);
	}

	/**
	 * Admin config should keep map bootstrap data lightweight and expose admin query paths.
	 *
	 * @return void
	 */
	public function test_admin_app_config_omits_inline_location_payloads() {
		$user_id = $this->create_admin_user();
		$location_id = $this->create_location( '48.137154', '11.576124' );
		$this->create_collection( array( $location_id ) );
		update_user_meta( $user_id, \MinimalMap\Rest\Locations_Settings_Route::USER_META_KEY, 24 );

		$config       = new \MinimalMap\Config();
		$admin_config = $config->get_admin_app_config();

		$this->assertSame( array(), $admin_config['mapConfig']['locations'] );
		$this->assertSame( array(), $admin_config['mapConfig']['collections'] );
		$this->assertSame(
			\MinimalMap\Rest\Admin_Query_Route::get_locations_rest_path(),
			$admin_config['locationsConfig']['queryPath']
		);
		$this->assertSame(
			\MinimalMap\Rest\Admin_Query_Route::get_location_lookups_rest_path(),
			$admin_config['locationsConfig']['lookupPath']
		);
		$this->assertSame(
			\MinimalMap\Rest\Locations_Settings_Route::get_rest_path(),
			$admin_config['locationsConfig']['settingsPath']
		);
		$this->assertSame( 24, $admin_config['locationsConfig']['preferredPerPage'] );
		$this->assertSame(
			\MinimalMap\Rest\Admin_Query_Route::get_collections_rest_path(),
			$admin_config['collectionsConfig']['queryPath']
		);
		$this->assertSame(
			\MinimalMap\Rest\Admin_Query_Route::get_tags_rest_path(),
			$admin_config['tagsConfig']['queryPath']
		);
	}

	/**
	 * Admin config should expose the current normalized Gutenberg palette template.
	 *
	 * @return void
	 */
	public function test_admin_app_config_includes_wordpress_palette_template() {
		$filter = static function ( $theme_json ) {
			return $theme_json->update_with(
				array(
					'version'  => 3,
					'settings' => array(
						'color' => array(
							'palette' => array(
								array(
									'name'  => 'Canvas',
									'slug'  => 'canvas',
									'color' => '#ABC',
								),
								array(
									'name'  => 'Ink',
									'slug'  => 'ink',
									'color' => '#112233',
								),
								array(
									'name'  => 'Accent',
									'slug'  => 'accent',
									'color' => '#45a7ef',
								),
								array(
									'name'  => 'Duplicate',
									'slug'  => 'duplicate',
									'color' => '#112233',
								),
								array(
									'name'  => 'Invalid',
									'slug'  => 'invalid',
									'color' => 'rgb(0, 0, 0)',
								),
							),
						),
					),
				)
			);
		};

		add_filter( 'wp_theme_json_data_user', $filter );
		wp_clean_theme_json_cache();

		try {
			$config       = new \MinimalMap\Config();
			$admin_config = $config->get_admin_app_config();
			$templates    = $admin_config['stylesConfig']['paletteTemplates'];

			$this->assertCount( 6, $templates );
			$this->assertSame( 'builtin-palette-terracotta-coast', $templates[0]['id'] );
			$this->assertSame( 'Terracotta Coast', $templates[0]['label'] );
			$this->assertSame( 'builtin-palette-night-transit', $templates[1]['id'] );
			$this->assertSame( 'Night Transit', $templates[1]['label'] );
			$this->assertSame( 'builtin-palette-alpine-print', $templates[2]['id'] );
			$this->assertSame( 'Alpine Print', $templates[2]['label'] );
			$this->assertSame( 'wordpress-theme-palette-1', $templates[3]['id'] );
			$this->assertSame( 'WordPress Theme Palette #1', $templates[3]['label'] );
			$this->assertSame( 'default', $templates[3]['deriveVariant'] );
			$this->assertSame( 'wordpress-theme-palette-2', $templates[4]['id'] );
			$this->assertSame( 'WordPress Theme Palette #2', $templates[4]['label'] );
			$this->assertSame( 'swap-1', $templates[4]['deriveVariant'] );
			$this->assertSame( 'wordpress-theme-palette-3', $templates[5]['id'] );
			$this->assertSame( 'WordPress Theme Palette #3', $templates[5]['label'] );
			$this->assertSame( 'swap-2', $templates[5]['deriveVariant'] );
			$this->assertSame(
				array(
					array(
						'name'  => 'Canvas',
						'slug'  => 'canvas',
						'color' => '#aabbcc',
					),
					array(
						'name'  => 'Ink',
						'slug'  => 'ink',
						'color' => '#112233',
					),
					array(
						'name'  => 'Accent',
						'slug'  => 'accent',
						'color' => '#45a7ef',
					),
				),
				$templates[3]['colors']
			);
		} finally {
			remove_filter( 'wp_theme_json_data_user', $filter );
			wp_clean_theme_json_cache();
		}
	}

	/**
	 * Admin config should omit the WordPress palette template when too few colors remain.
	 *
	 * @return void
	 */
	public function test_admin_app_config_omits_wordpress_palette_template_when_too_small() {
		$filter = static function ( $theme_json ) {
			return $theme_json->update_with(
				array(
					'version'  => 3,
					'settings' => array(
						'color' => array(
							'palette' => array(
								array(
									'name'  => 'Canvas',
									'slug'  => 'canvas',
									'color' => '#ffffff',
								),
								array(
									'name'  => 'Duplicate Canvas',
									'slug'  => 'duplicate-canvas',
									'color' => '#fff',
								),
								array(
									'name'  => 'Broken',
									'slug'  => 'broken',
									'color' => 'not-a-color',
								),
								array(
									'name'  => 'Ink',
									'slug'  => 'ink',
									'color' => '#000000',
								),
							),
						),
					),
				)
			);
		};

		add_filter( 'wp_theme_json_data_user', $filter );
		wp_clean_theme_json_cache();

		try {
			$config       = new \MinimalMap\Config();
			$admin_config = $config->get_admin_app_config();

			$this->assertCount( 3, $admin_config['stylesConfig']['paletteTemplates'] );
			$this->assertSame(
				array(
					'builtin-palette-terracotta-coast',
					'builtin-palette-night-transit',
					'builtin-palette-alpine-print',
				),
				array_column( $admin_config['stylesConfig']['paletteTemplates'], 'id' )
			);
		} finally {
			remove_filter( 'wp_theme_json_data_user', $filter );
			wp_clean_theme_json_cache();
		}
	}

	/**
	 * Admin locations queries should paginate and search across address fields.
	 *
	 * @return void
	 */
	public function test_admin_locations_route_paginates_and_searches_address_fields() {
		$this->create_admin_user();

		$matching_location_id = $this->create_location( '52.517', '13.388', 'Alpha Store' );
		update_post_meta( $matching_location_id, 'city', 'Cologne' );
		update_post_meta( $matching_location_id, 'street', 'Domkloster' );

		$other_location_id = $this->create_location( '48.137', '11.576', 'Beta Store' );
		update_post_meta( $other_location_id, 'city', 'Munich' );

		$collection_id = $this->create_collection( array( $matching_location_id ) );

		$request = new WP_REST_Request( 'GET', \MinimalMap\Rest\Admin_Query_Route::get_locations_rest_path() );
		$request->set_param( 'page', 1 );
		$request->set_param( 'per_page', 1 );
		$request->set_param( 'search', 'Cologne' );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( 1, $data['totalItems'] );
		$this->assertSame( 1, $data['totalPages'] );
		$this->assertCount( 1, $data['items'] );
		$this->assertSame( $matching_location_id, $data['items'][0]['id'] );
		$this->assertSame( 'Cologne', $data['items'][0]['city'] );
		$this->assertSame( $collection_id, $data['items'][0]['collections'][0]['id'] );
	}

	/**
	 * Locations settings should round-trip the current user's preferred page size.
	 *
	 * @return void
	 */
	public function test_locations_settings_route_persists_per_user_page_size() {
		$user_id = $this->create_admin_user();

		$get_request = new WP_REST_Request( 'GET', \MinimalMap\Rest\Locations_Settings_Route::get_rest_path() );
		$get_response = rest_do_request( $get_request );

		$this->assertSame( 200, $get_response->get_status() );
		$this->assertSame( 8, $get_response->get_data()['perPage'] );

		$update_request = new WP_REST_Request( 'POST', \MinimalMap\Rest\Locations_Settings_Route::get_rest_path() );
		$update_request->set_body_params(
			array(
				'perPage' => 48,
			)
		);
		$update_response = rest_do_request( $update_request );

		$this->assertSame( 200, $update_response->get_status() );
		$this->assertSame( 48, $update_response->get_data()['perPage'] );
		$this->assertSame( 48, (int) get_user_meta( $user_id, \MinimalMap\Rest\Locations_Settings_Route::USER_META_KEY, true ) );

		$invalid_request = new WP_REST_Request( 'POST', \MinimalMap\Rest\Locations_Settings_Route::get_rest_path() );
		$invalid_request->set_body_params(
			array(
				'perPage' => 12,
			)
		);
		$invalid_response = rest_do_request( $invalid_request );

		$this->assertSame( 400, $invalid_response->get_status() );
		$this->assertSame( 48, \MinimalMap\Rest\Locations_Settings_Route::get_user_preferred_per_page( $user_id ) );
	}

	/**
	 * Admin locations queries should respect title sort direction.
	 *
	 * @return void
	 */
	public function test_admin_locations_route_sorts_by_title_direction() {
		$this->create_admin_user();

		$this->create_location( '52.517', '13.388', 'Beta Store' );
		$this->create_location( '48.137', '11.576', 'Alpha Store' );

		$ascending_request = new WP_REST_Request( 'GET', \MinimalMap\Rest\Admin_Query_Route::get_locations_rest_path() );
		$ascending_request->set_param( 'page', 1 );
		$ascending_request->set_param( 'per_page', 2 );
		$ascending_request->set_param( 'orderby', 'title' );
		$ascending_request->set_param( 'order', 'asc' );

		$ascending_response = rest_do_request( $ascending_request );
		$ascending_items    = $ascending_response->get_data()['items'];

		$this->assertSame( 'Alpha Store', $ascending_items[0]['title'] );
		$this->assertSame( 'Beta Store', $ascending_items[1]['title'] );

		$descending_request = new WP_REST_Request( 'GET', \MinimalMap\Rest\Admin_Query_Route::get_locations_rest_path() );
		$descending_request->set_param( 'page', 1 );
		$descending_request->set_param( 'per_page', 2 );
		$descending_request->set_param( 'orderby', 'title' );
		$descending_request->set_param( 'order', 'desc' );

		$descending_response = rest_do_request( $descending_request );
		$descending_items    = $descending_response->get_data()['items'];

		$this->assertSame( 'Beta Store', $descending_items[0]['title'] );
		$this->assertSame( 'Alpha Store', $descending_items[1]['title'] );
	}

	/**
	 * Admin tags queries should paginate and search tag names.
	 *
	 * @return void
	 */
	public function test_admin_tags_route_paginates_and_searches_names() {
		$this->create_admin_user();

		$this->create_tag( 'Coffee' );
		$this->create_tag( 'Bakery' );

		$request = new WP_REST_Request( 'GET', \MinimalMap\Rest\Admin_Query_Route::get_tags_rest_path() );
		$request->set_param( 'page', 1 );
		$request->set_param( 'per_page', 1 );
		$request->set_param( 'search', 'Bake' );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( 1, $data['totalItems'] );
		$this->assertSame( 1, $data['totalPages'] );
		$this->assertCount( 1, $data['items'] );
		$this->assertSame( 'Bakery', $data['items'][0]['name'] );
		$this->assertSame( '#111111', $data['items'][0]['background_color'] );
	}

	/**
	 * Selected collection ids should restrict the rendered block payload to assigned locations.
	 *
	 * @return void
	 */
	public function test_normalize_block_attributes_filters_locations_by_selected_collection() {
		$config            = new \MinimalMap\Config();
		$included_location = $this->create_location( '52.517', '13.388' );
		$this->create_location( '48.137154', '11.576124' );
		$collection_id = $this->create_collection( array( $included_location ) );

		$attributes = $config->normalize_block_attributes(
			array(
				'collectionId' => $collection_id,
			)
		);

		$this->assertSame( $collection_id, $attributes['collectionId'] );
		$this->assertSame(
			array(
				array(
					'lat' => 52.517,
					'lng' => 13.388,
				),
			),
			$attributes['locations']
		);
	}

	/**
	 * Selected tag ids should default to an empty array for backward compatibility.
	 *
	 * @return void
	 */
	public function test_normalize_block_attributes_defaults_selected_tag_ids_to_empty_array() {
		$config     = new \MinimalMap\Config();
		$attributes = $config->normalize_block_attributes( array() );

		$this->assertSame( array(), $attributes['selectedTagIds'] );
	}

	/**
	 * Selected tag ids should restrict the rendered block payload to matching locations.
	 *
	 * @return void
	 */
	public function test_normalize_block_attributes_filters_locations_by_selected_tags() {
		$config              = new \MinimalMap\Config();
		$coffee_tag_id       = $this->create_tag( 'Coffee' );
		$matching_location   = $this->create_location( '52.517', '13.388' );
		$this->create_location( '48.137154', '11.576124' );

		wp_set_object_terms( $matching_location, array( $coffee_tag_id ), \MinimalMap\Tags\Tag_Taxonomy::TAXONOMY );

		$attributes = $config->normalize_block_attributes(
			array(
				'selectedTagIds' => array( $coffee_tag_id ),
			)
		);

		$this->assertSame( array( $coffee_tag_id ), $attributes['selectedTagIds'] );
		$this->assertCount( 1, $attributes['locations'] );
		$this->assertSame( $matching_location, $attributes['locations'][0]['id'] );
		$this->assertSame( $coffee_tag_id, $attributes['locations'][0]['tags'][0]['id'] );
	}

	/**
	 * Selected tag ids should combine with collection filters.
	 *
	 * @return void
	 */
	public function test_normalize_block_attributes_filters_locations_by_collection_and_selected_tags() {
		$config               = new \MinimalMap\Config();
		$coffee_tag_id        = $this->create_tag( 'Coffee' );
		$matching_location    = $this->create_location( '52.517', '13.388' );
		$other_collection_loc = $this->create_location( '48.137154', '11.576124' );
		$collection_id        = $this->create_collection( array( $matching_location, $other_collection_loc ) );

		wp_set_object_terms( $matching_location, array( $coffee_tag_id ), \MinimalMap\Tags\Tag_Taxonomy::TAXONOMY );

		$attributes = $config->normalize_block_attributes(
			array(
				'collectionId' => $collection_id,
				'selectedTagIds' => array( $coffee_tag_id ),
			)
		);

		$this->assertSame( $collection_id, $attributes['collectionId'] );
		$this->assertCount( 1, $attributes['locations'] );
		$this->assertSame( $matching_location, $attributes['locations'][0]['id'] );
	}

	/**
	 * The public locations route should treat an empty selected-tag list like the legacy behavior.
	 *
	 * @return void
	 */
	public function test_public_locations_route_treats_empty_selected_tag_ids_as_no_filter() {
		$this->create_location( '52.517', '13.388' );
		$this->create_location( '48.137154', '11.576124' );

		$request = new WP_REST_Request( 'GET', \MinimalMap\Rest\Locations_Route::get_rest_path() );
		$request->set_param( 'selected_tag_ids', '' );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertCount( 2, $data['locations'] );
	}

	/**
	 * The public locations route should filter optimized locations by selected tag ids.
	 *
	 * @return void
	 */
	public function test_public_locations_route_filters_by_selected_tag_ids() {
		$coffee_tag_id        = $this->create_tag( 'Coffee' );
		$matching_location    = $this->create_location( '52.517', '13.388' );
		$this->create_location( '48.137154', '11.576124' );

		wp_set_object_terms( $matching_location, array( $coffee_tag_id ), \MinimalMap\Tags\Tag_Taxonomy::TAXONOMY );

		$request = new WP_REST_Request( 'GET', \MinimalMap\Rest\Locations_Route::get_rest_path() );
		$request->set_param( 'selected_tag_ids', (string) $coffee_tag_id );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertCount( 1, $data['locations'] );
		$this->assertSame( $matching_location, $data['locations'][0]['id'] );
	}

	/**
	 * Embed payloads should decode and sanitize through the shared block config pipeline.
	 *
	 * @return void
	 */
	public function test_normalize_embed_payload_accepts_v1_payloads() {
		$config         = new \MinimalMap\Config();
		$payload        = array(
			'v'          => \MinimalMap\Config::EMBED_PAYLOAD_VERSION,
			'attributes' => array(
				'height'                   => 320,
				'heightUnit'               => 'vh',
				'heightMobile'             => 44,
				'heightMobileUnit'         => 'rem',
				'zoom'                     => 11,
				'collectionId'             => 999999,
				'fontFamily'               => '"Inter", sans-serif; color:red;',
				'borderRadius'             => '18px',
				'enableCategoryFilter'     => true,
				'zoomControlsBorderColor' => 'invalid',
			),
		);
		$encoded_payload = $this->encode_embed_payload( $payload );
		$normalized      = $config->normalize_embed_payload( $encoded_payload );

		$this->assertIsArray( $normalized );
		$this->assertSame( '320vh', $normalized['heightCssValue'] );
		$this->assertSame( '44rem', $normalized['heightMobileCssValue'] );
		$this->assertSame( '"Inter", sans-serif', $normalized['fontFamily'] );
		$this->assertSame( '18px', $normalized['borderRadius'] );
		$this->assertTrue( $normalized['enableCategoryFilter'] );
		$this->assertSame( '#dcdcde', $normalized['zoomControlsBorderColor'] );
		$this->assertSame( array(), $normalized['locations'] );
	}

	/**
	 * Invalid embed payloads should be rejected.
	 *
	 * @return void
	 */
	public function test_normalize_embed_payload_rejects_invalid_payloads() {
		$config = new \MinimalMap\Config();

		$this->assertWPError( $config->normalize_embed_payload( '%%%not-valid%%%' ) );
		$this->assertWPError(
			$config->normalize_embed_payload(
				$this->encode_embed_payload(
					array(
						'v' => \MinimalMap\Config::EMBED_PAYLOAD_VERSION,
					)
				)
			)
		);
	}

	/**
	 * The iframe endpoint should render a standalone map document for valid payloads.
	 *
	 * @return void
	 */
	public function test_iframe_endpoint_renders_map_surface_for_valid_payload() {
		$config  = new \MinimalMap\Config();
		$view    = new \MinimalMap\Map_View( $config );
		$endpoint = new \MinimalMap\Iframe_Endpoint( $config, $view );
		$encoded_payload = $this->encode_embed_payload(
			array(
				'v'          => \MinimalMap\Config::EMBED_PAYLOAD_VERSION,
				'attributes' => array(
					'height'     => 360,
					'zoom'       => 8,
					'fontFamily' => '"Figtree", sans-serif',
					'borderRadius' => '24px',
				),
			)
		);

		$response = $endpoint->build_response( $encoded_payload );

		$this->assertSame( 200, $response['status'] );
		$this->assertStringContainsString( 'minimal-map-surface', $response['html'] );
		$this->assertStringContainsString( 'data-minimal-map-config=', $response['html'] );
		$this->assertStringContainsString( '360px', $response['html'] );
		$this->assertStringContainsString( '--minimal-map-font-family', $response['html'] );
		$this->assertStringContainsString( 'border-radius: 24px;', $response['html'] );
		$this->assertStringContainsString( 'margin-top: 0 !important;', $response['html'] );
		$this->assertStringContainsString( 'minimal-map-iframe-document-css', $response['html'] );
		$this->assertStringContainsString( '.minimal-map-iframe-page .cmplz-cookiebanner-container', $response['html'] );
		$this->assertStringContainsString( 'display: none;', $response['html'] );
	}

	/**
	 * The iframe endpoint should return a bad request document for malformed payloads.
	 *
	 * @return void
	 */
	public function test_iframe_endpoint_returns_400_for_invalid_payload() {
		$config   = new \MinimalMap\Config();
		$view     = new \MinimalMap\Map_View( $config );
		$endpoint = new \MinimalMap\Iframe_Endpoint( $config, $view );
		$response = $endpoint->build_response( 'not-a-payload' );

		$this->assertSame( 400, $response['status'] );
		$this->assertStringContainsString( 'Invalid Minimal Map Embed', $response['html'] );
		$this->assertStringNotContainsString( 'minimal-map-surface', $response['html'] );
	}

	/**
	 * The collection post type should be registered on init.
	 *
	 * @return void
	 */
	public function test_collection_post_type_is_registered() {
		$this->assertTrue( post_type_exists( \MinimalMap\Collections\Collection_Post_Type::POST_TYPE ) );
	}

	/**
	 * Collection assignment meta should be registered.
	 *
	 * @return void
	 */
	public function test_collection_assignment_meta_is_registered() {
		$registered = get_registered_meta_keys( 'post', \MinimalMap\Collections\Collection_Post_Type::POST_TYPE );

		$this->assertArrayHasKey( \MinimalMap\Collections\Collection_Post_Type::LOCATION_IDS_META_KEY, $registered );
		$this->assertSame( 'array', $registered[ \MinimalMap\Collections\Collection_Post_Type::LOCATION_IDS_META_KEY ]['type'] );
		$this->assertTrue( $registered[ \MinimalMap\Collections\Collection_Post_Type::LOCATION_IDS_META_KEY ]['single'] );
	}

	/**
	 * Collection assignment ids should sanitize to unique positive integers.
	 *
	 * @return void
	 */
	public function test_collection_assignment_ids_are_sanitized() {
		$this->assertSame(
			array( 12, 8 ),
			$this->collection_post_type->sanitize_location_ids( array( '12', 12, -3, 0, 'foo', 8 ) )
		);
	}

	/**
	 * The logo post type should be registered on init.
	 *
	 * @return void
	 */
	public function test_logo_post_type_is_registered() {
		$this->assertTrue( post_type_exists( \MinimalMap\Logos\Logo_Post_Type::POST_TYPE ) );
	}

	/**
	 * Location logo meta should be registered as integer.
	 *
	 * @return void
	 */
	public function test_location_logo_meta_is_registered() {
		$registered = get_registered_meta_keys( 'post', \MinimalMap\Locations\Location_Post_Type::POST_TYPE );

		$this->assertArrayHasKey( 'logo_id', $registered );
		$this->assertSame( 'integer', $registered['logo_id']['type'] );
		$this->assertTrue( $registered['logo_id']['single'] );
	}

	/**
	 * Location opening-hours meta should be registered as object.
	 *
	 * @return void
	 */
	public function test_location_opening_hours_meta_is_registered() {
		$registered = get_registered_meta_keys( 'post', \MinimalMap\Locations\Location_Post_Type::POST_TYPE );

		$this->assertArrayHasKey( 'opening_hours', $registered );
		$this->assertSame( 'object', $registered['opening_hours']['type'] );
		$this->assertTrue( $registered['opening_hours']['single'] );
		$this->assertArrayHasKey( 'schema', $registered['opening_hours']['show_in_rest'] );
	}

	/**
	 * Location opening-hours notes meta should be registered as string.
	 *
	 * @return void
	 */
	public function test_location_opening_hours_notes_meta_is_registered() {
		$registered = get_registered_meta_keys( 'post', \MinimalMap\Locations\Location_Post_Type::POST_TYPE );

		$this->assertArrayHasKey( 'opening_hours_notes', $registered );
		$this->assertSame( 'string', $registered['opening_hours_notes']['type'] );
		$this->assertTrue( $registered['opening_hours_notes']['single'] );
	}

	/**
	 * Opening-hours sanitizer should normalize malformed or partial values.
	 *
	 * @return void
	 */
	public function test_location_opening_hours_sanitizer_normalizes_values() {
		$sanitized = $this->location_post_type->sanitize_opening_hours(
			array(
				'monday'  => array(
					'open'                   => '09:00',
					'close'                  => '18:00',
					'lunch_start'            => '12:30',
					'lunch_duration_minutes' => '45',
				),
				'tuesday' => array(
					'open'                   => '25:00',
					'close'                  => '19:00',
					'lunch_start'            => 'bad',
					'lunch_duration_minutes' => '-10',
				),
			)
		);

		$this->assertSame(
			array(
				'open'                   => '09:00',
				'close'                  => '18:00',
				'lunch_start'            => '12:30',
				'lunch_duration_minutes' => 45,
			),
			$sanitized['monday']
		);
		$this->assertSame(
			array(
				'open'                   => '',
				'close'                  => '19:00',
				'lunch_start'            => '',
				'lunch_duration_minutes' => 0,
			),
			$sanitized['tuesday']
		);
		$this->assertArrayHasKey( 'wednesday', $sanitized );
		$this->assertSame(
			array(
				'open'                   => '',
				'close'                  => '',
				'lunch_start'            => '',
				'lunch_duration_minutes' => 0,
			),
			$sanitized['wednesday']
		);
	}

	/**
	 * Admin app config should expose collections metadata.
	 *
	 * @return void
	 */
	public function test_admin_app_config_includes_collections() {
		$config = new \MinimalMap\Config();

		$this->create_collection();

		$admin_config = $config->get_admin_app_config();
		$views        = wp_list_pluck( $admin_config['sections'], 'view' );

		$this->assertContains( 'collections', $views, true );
		$this->assertSame( 1, $admin_config['stats']['collections'] );
		$this->assertSame(
			\MinimalMap\Collections\Collection_Post_Type::REST_BASE,
			$admin_config['collectionsConfig']['restBase']
		);
		$this->assertSame(
			\MinimalMap\Collections\Collection_Post_Type::get_rest_path(),
			$admin_config['collectionsConfig']['restPath']
		);
	}

	/**
	 * Admin app config should expose logos metadata.
	 *
	 * @return void
	 */
	public function test_admin_app_config_includes_logos() {
		$config = new \MinimalMap\Config();

		$this->create_logo();

		$admin_config = $config->get_admin_app_config();
		$views        = wp_list_pluck( $admin_config['sections'], 'view' );

		$this->assertContains( 'logos', $views, true );
		$this->assertSame( 1, $admin_config['stats']['logos'] );
		$this->assertSame(
			\MinimalMap\Logos\Logo_Post_Type::REST_BASE,
			$admin_config['logosConfig']['restBase']
		);
		$this->assertSame(
			\MinimalMap\Logos\Logo_Post_Type::get_rest_path(),
			$admin_config['logosConfig']['restPath']
		);
	}

	/**
	 * Client config should expose the public iframe base URL.
	 *
	 * @return void
	 */
	public function test_client_config_includes_embed_base_url() {
		$config        = new \MinimalMap\Config();
		$client_config = $config->get_client_config();

		$this->assertSame(
			add_query_arg( 'minimal-map-iframe', '1', home_url( '/' ) ),
			$client_config['embedBaseUrl']
		);
	}

	/**
	 * Hidden locations should be excluded from all map payloads.
	 *
	 * @return void
	 */
	public function test_hidden_locations_are_excluded_from_map_payloads() {
		$visible_location_id = $this->create_location( '52.517', '13.388', 'Visible location', false );
		$this->create_location( '48.137', '11.576', 'Hidden location', true );

		$config    = new \MinimalMap\Config();
		$locations = $config->get_map_locations();

		$this->assertCount( 1, $locations );
		$this->assertSame( $visible_location_id, $locations[0]['id'] );
		$this->assertSame( 'Visible location', $locations[0]['title'] );
	}

	/**
	 * Hidden locations should stay assigned but be removed from collection map payloads.
	 *
	 * @return void
	 */
	public function test_hidden_locations_are_excluded_from_collection_payloads() {
		$visible_location_id = $this->create_location( '52.517', '13.388', 'Visible location', false );
		$hidden_location_id  = $this->create_location( '48.137', '11.576', 'Hidden location', true );
		$collection_id       = $this->create_collection( array( $hidden_location_id, $visible_location_id ) );

		$config      = new \MinimalMap\Config();
		$collections = $config->get_map_collections();
		$collection  = wp_list_filter(
			$collections,
			array(
				'id' => $collection_id,
			)
		);

		$this->assertCount( 1, $collection );
		$collection = array_values( $collection );
		$this->assertCount( 1, $collection[0]['locations'] );
		$this->assertSame( $visible_location_id, $collection[0]['locations'][0]['id'] );
	}
}

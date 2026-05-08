<?php
/**
 * Geocoding REST route.
 *
 * @package Minimal_Map
 */

namespace MinimalMap\Rest;

defined( 'ABSPATH' ) || exit;

/**
 * Proxies address geocoding through a plugin-owned REST endpoint.
 */
class Geocode_Route {
	/**
	 * Namespace for plugin REST routes.
	 */
	const REST_NAMESPACE = 'minimal-map/v1';

	/**
	 * REST route path.
	 */
	const REST_ROUTE = '/geocode';

	/**
	 * Capability required for geocoding requests.
	 */
	const CAPABILITY = 'manage_options';

	/**
	 * Register the route.
	 *
	 * @return void
	 */
	public function register() {
		register_rest_route(
			self::REST_NAMESPACE,
			self::REST_ROUTE,
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'handle_request' ),
				'permission_callback' => array( $this, 'can_geocode' ),
				'args'                => $this->get_route_args(),
			)
		);
	}

	/**
	 * Check route permissions.
	 *
	 * @return bool
	 */
	public function can_geocode() {
		return current_user_can( self::CAPABILITY );
	}

	/**
	 * Handle geocoding requests.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle_request( $request ) {
		$address = $this->normalize_address( $request->get_json_params() ?: $request->get_params() );
		$cache_key = $this->get_cache_key( $address );
		$cached    = get_transient( $cache_key );

		if ( false !== $cached ) {
			return rest_ensure_response( $cached );
		}

		$remote = wp_remote_get(
			add_query_arg(
				$this->build_query_args( $address ),
				'https://nominatim.openstreetmap.org/search'
			),
			array(
				'headers' => array(
					'Accept'     => 'application/json',
					'Referer'    => home_url( '/' ),
					'User-Agent' => $this->get_user_agent(),
				),
				'timeout' => 12,
			)
		);

		if ( is_wp_error( $remote ) ) {
			$result = $this->build_failure_response(
				__( 'The address could not be geocoded right now. Select the location manually on the map.', 'minimal-map' )
			);

			set_transient( $cache_key, $result, HOUR_IN_SECONDS );
			return rest_ensure_response( $result );
		}

		$status_code = wp_remote_retrieve_response_code( $remote );
		$body        = json_decode( wp_remote_retrieve_body( $remote ), true );

		if ( 200 !== $status_code || ! is_array( $body ) || empty( $body[0]['lat'] ) || empty( $body[0]['lon'] ) ) {
			$result = $this->build_failure_response(
				__( 'No matching coordinates were found. Select the location manually on the map.', 'minimal-map' )
			);

			set_transient( $cache_key, $result, HOUR_IN_SECONDS );
			return rest_ensure_response( $result );
		}

		$result = array(
			'success' => true,
			'label'   => isset( $body[0]['display_name'] ) ? sanitize_text_field( $body[0]['display_name'] ) : '',
			'lat'     => (float) $body[0]['lat'],
			'lng'     => (float) $body[0]['lon'],
		);

		set_transient( $cache_key, $result, DAY_IN_SECONDS );

		return rest_ensure_response( $result );
	}

	/**
	 * Get route args schema.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	private function get_route_args() {
		$schema = array(
			'street'       => array( 'required' => true, 'type' => 'string' ),
			'house_number' => array( 'required' => true, 'type' => 'string' ),
			'postal_code'  => array( 'required' => true, 'type' => 'string' ),
			'city'         => array( 'required' => true, 'type' => 'string' ),
			'country'      => array( 'required' => true, 'type' => 'string' ),
			'state'        => array( 'required' => false, 'type' => 'string' ),
		);

		foreach ( $schema as $key => $args ) {
			$schema[ $key ]['sanitize_callback'] = 'sanitize_text_field';
		}

		return $schema;
	}

	/**
	 * Normalize address request data.
	 *
	 * @param array<string, mixed> $params Request params.
	 * @return array<string, string>
	 */
	private function normalize_address( $params ) {
		return array(
			'street'       => isset( $params['street'] ) ? sanitize_text_field( (string) $params['street'] ) : '',
			'house_number' => isset( $params['house_number'] ) ? sanitize_text_field( (string) $params['house_number'] ) : '',
			'postal_code'  => isset( $params['postal_code'] ) ? sanitize_text_field( (string) $params['postal_code'] ) : '',
			'city'         => isset( $params['city'] ) ? sanitize_text_field( (string) $params['city'] ) : '',
			'state'        => isset( $params['state'] ) ? sanitize_text_field( (string) $params['state'] ) : '',
			'country'      => isset( $params['country'] ) ? sanitize_text_field( (string) $params['country'] ) : '',
		);
	}

	/**
	 * Build query arguments for Nominatim.
	 *
	 * @param array<string, string> $address Address fields.
	 * @return array<string, string|int>
	 */
	private function build_query_args( $address ) {
		$street = trim( $address['street'] . ' ' . $address['house_number'] );
		$args   = array(
			'format'     => 'jsonv2',
			'limit'      => 1,
			'addressdetails' => 0,
			'street'     => $street,
			'city'       => $address['city'],
			'postalcode' => $address['postal_code'],
			'country'    => $address['country'],
		);

		if ( '' !== $address['state'] ) {
			$args['state'] = $address['state'];
		}

		return $args;
	}

	/**
	 * Build a cache key.
	 *
	 * @param array<string, string> $address Address fields.
	 * @return string
	 */
	private function get_cache_key( $address ) {
		return 'minimal_map_geocode_' . md5( wp_json_encode( $address ) );
	}

	/**
	 * Get user agent header value.
	 *
	 * @return string
	 */
	private function get_user_agent() {
		return sprintf(
			'Minimal Map/%s (%s)',
			defined( 'MINIMAL_MAP_VERSION' ) ? MINIMAL_MAP_VERSION : '0.0.0',
			wp_parse_url( home_url( '/' ), PHP_URL_HOST )
		);
	}

	/**
	 * Build a failure response payload.
	 *
	 * @param string $message Error message.
	 * @return array<string, mixed>
	 */
	private function build_failure_response( $message ) {
		return array(
			'success' => false,
			'message' => $message,
		);
	}

	/**
	 * Get the absolute REST path.
	 *
	 * @return string
	 */
	public static function get_rest_path() {
		return '/' . self::REST_NAMESPACE . self::REST_ROUTE;
	}
}

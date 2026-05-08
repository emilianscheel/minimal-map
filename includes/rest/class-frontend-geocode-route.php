<?php
/**
 * Public frontend geocoding REST route.
 *
 * @package Minimal_Map
 */

namespace MinimalMap\Rest;

defined( 'ABSPATH' ) || exit;

/**
 * Proxies free-text geocoding for the frontend search panel.
 */
class Frontend_Geocode_Route {
	/**
	 * Namespace for plugin REST routes.
	 */
	const REST_NAMESPACE = 'minimal-map/v1';

	/**
	 * REST route path.
	 */
	const REST_ROUTE = '/frontend-geocode';

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
				// Public by design: frontend visitors can geocode search queries for visible maps.
				'permission_callback' => '__return_true',
				'args'                => $this->get_route_args(),
			)
		);
	}

	/**
	 * Handle geocoding requests.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function handle_request( $request ) {
		$query     = $this->normalize_query( $request->get_json_params() ?: $request->get_params() );
		$cache_key = $this->get_cache_key( $query );
		$cached    = get_transient( $cache_key );

		if ( false !== $cached ) {
			return rest_ensure_response( $cached );
		}

		if ( '' === $query ) {
			$result = $this->build_failure_response(
				__( 'No matching coordinates were found.', 'minimal-map' )
			);

			set_transient( $cache_key, $result, HOUR_IN_SECONDS );
			return rest_ensure_response( $result );
		}

		$remote = wp_remote_get(
			add_query_arg(
				$this->build_query_args( $query ),
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
				__( 'No matching coordinates were found.', 'minimal-map' )
			);

			set_transient( $cache_key, $result, HOUR_IN_SECONDS );
			return rest_ensure_response( $result );
		}

		$status_code = wp_remote_retrieve_response_code( $remote );
		$body        = json_decode( wp_remote_retrieve_body( $remote ), true );

		if ( 200 !== $status_code || ! is_array( $body ) || empty( $body[0]['lat'] ) || empty( $body[0]['lon'] ) ) {
			$result = $this->build_failure_response(
				__( 'No matching coordinates were found.', 'minimal-map' )
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
		return array(
			'query' => array(
				'required'          => true,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
		);
	}

	/**
	 * Normalize query request data.
	 *
	 * @param array<string, mixed> $params Request params.
	 * @return string
	 */
	private function normalize_query( $params ) {
		return isset( $params['query'] ) ? sanitize_text_field( (string) $params['query'] ) : '';
	}

	/**
	 * Build query arguments for Nominatim.
	 *
	 * @param string $query Free-text address query.
	 * @return array<string, string|int>
	 */
	private function build_query_args( $query ) {
		return array(
			'format'         => 'jsonv2',
			'limit'          => 1,
			'addressdetails' => 0,
			'q'              => $query,
		);
	}

	/**
	 * Build a cache key.
	 *
	 * @param string $query Free-text address query.
	 * @return string
	 */
	private function get_cache_key( $query ) {
		return 'minimal_map_frontend_geocode_' . md5( wp_json_encode( $query ) );
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

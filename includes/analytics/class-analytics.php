<?php
/**
 * Analytics storage and settings service.
 *
 * @package Minimal_Map
 */

namespace MinimalMap\Analytics;

defined( 'ABSPATH' ) || exit;

/**
 * Provides analytics settings, persistence, and reporting.
 */
class Analytics {
	/**
	 * Stored schema version.
	 */
	const SCHEMA_VERSION = '2';

	/**
	 * Enabled option name.
	 */
	const OPTION_ENABLED = 'minimal_map_analytics_enabled';

	/**
	 * Complianz enabled option name.
	 */
	const OPTION_COMPLIANZ_ENABLED = 'minimal_map_analytics_complianz_enabled';

	/**
	 * Schema version option name.
	 */
	const OPTION_SCHEMA_VERSION = 'minimal_map_analytics_schema_version';

	/**
	 * Cleanup cron hook.
	 */
	const CLEANUP_HOOK = 'minimal_map_analytics_cleanup_daily';

	/**
	 * Retention period in days.
	 */
	const RETENTION_DAYS = 90;

	/**
	 * Allowed query types.
	 *
	 * @var string[]
	 */
	const QUERY_TYPES = array( 'text', 'address', 'coordinates', 'live_location' );

	/**
	 * Allowed event categories.
	 *
	 * @var string[]
	 */
	const EVENT_CATEGORIES = array( 'search', 'selection', 'action' );

	/**
	 * Allowed interaction sources.
	 *
	 * @var string[]
	 */
	const INTERACTION_SOURCES = array( 'search_panel', 'map_marker', 'in_map_card' );

	/**
	 * Allowed action types.
	 *
	 * @var string[]
	 */
	const ACTION_TYPES = array( 'opening_hours', 'telephone', 'email', 'website', 'social_media', 'google_maps' );

	/**
	 * Default summary range key.
	 */
	const DEFAULT_SUMMARY_RANGE = '30d';

	/**
	 * Allowed summary range keys.
	 */
	const SUMMARY_RANGE_KEYS = array( 'today', 'yesterday', '7d', '30d', '90d', 'all' );

	/**
	 * Maximum number of top breakdown items.
	 */
	const SUMMARY_TOP_ITEMS_LIMIT = 5;

	/**
	 * Return the analytics table name.
	 *
	 * @return string
	 */
	public function get_table_name() {
		global $wpdb;

		return $wpdb->prefix . 'minimal_map_analytics_queries';
	}

	/**
	 * Ensure the analytics schema exists.
	 *
	 * @return void
	 */
	public function ensure_schema() {
		if ( self::SCHEMA_VERSION === get_option( self::OPTION_SCHEMA_VERSION ) && $this->table_exists() ) {
			return;
		}

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table_name      = $this->get_table_name();
		$charset_collate = $this->get_charset_collate();
		$sql             = "CREATE TABLE {$table_name} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			event_category varchar(32) NOT NULL DEFAULT 'search',
			query_text varchar(255) NOT NULL DEFAULT '',
			query_type varchar(32) NOT NULL DEFAULT 'text',
			result_count int(10) unsigned NOT NULL DEFAULT 0,
			nearest_distance_meters int(10) unsigned NULL DEFAULT NULL,
			location_id bigint(20) unsigned NULL DEFAULT NULL,
			location_title varchar(255) NOT NULL DEFAULT '',
			interaction_source varchar(32) NOT NULL DEFAULT '',
			action_type varchar(32) NOT NULL DEFAULT '',
			action_target varchar(255) NOT NULL DEFAULT '',
			occurred_at_gmt datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY occurred_at_gmt (occurred_at_gmt),
			KEY event_category (event_category),
			KEY query_type (query_type),
			KEY interaction_source (interaction_source),
			KEY action_type (action_type),
			KEY location_id (location_id)
		) {$charset_collate};";

		dbDelta( $sql );
		update_option( self::OPTION_SCHEMA_VERSION, self::SCHEMA_VERSION, false );
	}

	/**
	 * Schedule analytics cleanup if needed.
	 *
	 * @return void
	 */
	public function schedule_cleanup() {
		if ( wp_next_scheduled( self::CLEANUP_HOOK ) ) {
			return;
		}

		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::CLEANUP_HOOK );
	}

	/**
	 * Delete raw analytics rows older than the retention window.
	 *
	 * @return void
	 */
	public function cleanup_old_queries() {
		if ( ! $this->table_exists() ) {
			return;
		}

		global $wpdb;

		$table_name = $this->get_table_name();
		$cutoff     = gmdate( 'Y-m-d H:i:s', time() - ( self::RETENTION_DAYS * DAY_IN_SECONDS ) );
		$delete_sql = $wpdb->prepare(
			'DELETE FROM %i WHERE occurred_at_gmt < %s',
			$table_name,
			$cutoff
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Intentional custom analytics table cleanup; SQL is prepared above.
		$wpdb->query( $delete_sql );
	}

	/**
	 * Delete all stored analytics rows.
	 *
	 * @return bool
	 */
	public function delete_all_queries() {
		if ( ! $this->table_exists() ) {
			return true;
		}

		global $wpdb;

		$delete_sql = $wpdb->prepare(
			'DELETE FROM %i',
			$this->get_table_name()
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Intentional custom analytics table purge; SQL is prepared above.
		$deleted = $wpdb->query( $delete_sql );

		return false !== $deleted;
	}

	/**
	 * Whether analytics tracking is enabled.
	 *
	 * @return bool
	 */
	public function is_enabled() {
		return (bool) get_option( self::OPTION_ENABLED, false );
	}

	/**
	 * Persist the analytics enabled flag.
	 *
	 * @param bool $enabled Desired enabled state.
	 * @return bool
	 */
	public function update_enabled( $enabled ) {
		update_option( self::OPTION_ENABLED, $enabled ? '1' : '0', false );

		return $this->is_enabled();
	}

	/**
	 * Whether Complianz script blocking is enabled.
	 *
	 * @return bool
	 */
	public function is_complianz_enabled() {
		return (bool) get_option( self::OPTION_COMPLIANZ_ENABLED, false );
	}

	/**
	 * Persist the Complianz enabled flag.
	 *
	 * @param bool $enabled Desired enabled state.
	 * @return bool
	 */
	public function update_complianz_enabled( $enabled ) {
		update_option( self::OPTION_COMPLIANZ_ENABLED, $enabled ? '1' : '0', false );

		return $this->is_complianz_enabled();
	}

	/**
	 * Whether the Complianz plugin is installed and active.
	 *
	 * @return bool
	 */
	public function is_complianz_installed(): bool {
		return function_exists( 'cmplz_has_consent' );
	}

	/**
	 * Track one analytics query if analytics is enabled.
	 *
	 * @param array<string, mixed> $payload Raw query payload.
	 * @return bool
	 */
	public function track_query( $payload ) {
		return $this->track_event( $payload );
	}

	/**
	 * Track one analytics event if analytics is enabled.
	 *
	 * @param array<string, mixed> $payload Raw event payload.
	 * @return bool
	 */
	public function track_event( $payload ) {
		if ( ! $this->is_enabled() ) {
			return false;
		}

		$normalized = $this->normalize_track_payload( $payload );

		if ( ! $this->is_valid_track_payload( $normalized ) ) {
			return false;
		}

		$this->ensure_schema();

		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Intentional insert into the plugin's custom analytics table.
		$inserted = $wpdb->insert(
			$this->get_table_name(),
			array(
				'event_category'          => $normalized['event_category'],
				'query_text'              => $normalized['query_text'],
				'query_type'              => $normalized['query_type'],
				'result_count'            => $normalized['result_count'],
				'nearest_distance_meters' => $normalized['nearest_distance_meters'],
				'location_id'             => $normalized['location_id'],
				'location_title'          => $normalized['location_title'],
				'interaction_source'      => $normalized['interaction_source'],
				'action_type'             => $normalized['action_type'],
				'action_target'           => $normalized['action_target'],
				'occurred_at_gmt'         => gmdate( 'Y-m-d H:i:s' ),
			),
			array( '%s', '%s', '%s', '%d', '%d', '%d', '%s', '%s', '%s', '%s', '%s' )
		);

		return false !== $inserted;
	}

	/**
	 * Return summary analytics metrics.
	 *
	 * @param string $range Selected analytics range.
	 * @param string $category Selected analytics category.
	 * @return array<string, mixed>
	 */
	public function get_summary( $range = self::DEFAULT_SUMMARY_RANGE, $category = 'search' ) {
		$this->ensure_schema();

		$normalized_category = $this->sanitize_event_category( $category );

		switch ( $normalized_category ) {
			case 'selection':
				return $this->get_selection_summary( $range );
			case 'action':
				return $this->get_action_summary( $range );
			case 'search':
			default:
				return $this->get_search_summary( $range );
		}
	}

	/**
	 * Query paginated analytics rows.
	 *
	 * @param array<string, mixed> $args Query arguments.
	 * @return array<string, mixed>
	 */
	public function query_queries( $args = array() ) {
		$this->ensure_schema();

		global $wpdb;

		$page               = max( 1, isset( $args['page'] ) ? absint( $args['page'] ) : 1 );
		$per_page           = max( 1, min( 50, isset( $args['per_page'] ) ? absint( $args['per_page'] ) : 10 ) );
		$range              = isset( $args['range'] ) ? $this->normalize_range_key( $args['range'] ) : self::DEFAULT_SUMMARY_RANGE;
		$category           = isset( $args['category'] ) ? $this->sanitize_event_category( $args['category'] ) : 'search';
		$search             = isset( $args['search'] ) ? trim( sanitize_text_field( (string) $args['search'] ) ) : '';
		$offset             = ( $page - 1 ) * $per_page;
		$where_conditions   = array();
		$params             = array();
		$table_name         = $this->get_table_name();
		$range_where        = $this->build_range_where_fragment( $range );
		$category_where     = $this->build_category_where_fragment( $category );
		$search_where       = $this->build_query_search_fragment( $category, $search );

		if ( ! empty( $range_where['sql'] ) ) {
			$where_conditions[] = ltrim( str_replace( 'WHERE ', '', $range_where['sql'] ) );
			$params             = array_merge( $params, $range_where['params'] );
		}

		if ( ! empty( $category_where['sql'] ) ) {
			$where_conditions[] = $category_where['sql'];
			$params             = array_merge( $params, $category_where['params'] );
		}

		if ( ! empty( $search_where['sql'] ) ) {
			$where_conditions[] = $search_where['sql'];
			$params             = array_merge( $params, $search_where['params'] );
		}

		$where = empty( $where_conditions ) ? '' : 'WHERE ' . implode( ' AND ', $where_conditions );
		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $where is built from internal whitelisted fragments; table and values are prepared.
		$count_sql = $wpdb->prepare(
			"SELECT COUNT(*) FROM %i {$where}",
			array_merge( array( $table_name ), $params )
		);
		$items_sql = "SELECT id, event_category, query_text, query_type, result_count, nearest_distance_meters, location_id, location_title, interaction_source, action_type, action_target, occurred_at_gmt
			FROM %i
			{$where}
			ORDER BY occurred_at_gmt DESC, id DESC
			LIMIT %d OFFSET %d";
		// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Intentional custom analytics table read; SQL is prepared above.
		$total_items = (int) $wpdb->get_var( $count_sql );

		$item_params   = array( $table_name );
		$item_params   = array_merge( $item_params, $params );
		$item_params[] = $per_page;
		$item_params[] = $offset;
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- SQL template is composed from internal fragments; identifiers and values are prepared here.
		$query         = $wpdb->prepare( $items_sql, $item_params );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Intentional custom analytics table read; SQL is prepared above.
		$rows          = $wpdb->get_results( $query, ARRAY_A );

		return array(
			'items'      => array_map( array( $this, 'normalize_row' ), is_array( $rows ) ? $rows : array() ),
			'totalItems' => $total_items,
			'totalPages' => max( 1, (int) ceil( $total_items / $per_page ) ),
		);
	}

	/**
	 * Return search analytics summary.
	 *
	 * @param string $range Selected analytics range.
	 * @return array<string, mixed>
	 */
	private function get_search_summary( $range ) {
		$rows   = $this->get_summary_rows( $range, 'search' );
		$total  = count( $rows );
		$series = $this->build_search_summary_series( $rows, $range );

		if ( 0 === $total ) {
			return array(
				'category'                     => 'search',
				'totalSearches'                => 0,
				'searchesToday'                => 0,
				'zeroResultSearches'           => 0,
				'averageNearestDistanceMeters' => null,
				'successRate'                  => 0.0,
				'series'                       => $series,
				'breakdowns'                   => array(
					'queryTypeMix'         => array(),
					'resultDistribution'   => array(),
					'topQueries'           => array(),
					'topZeroResultQueries' => array(),
				),
			);
		}

		$searches_today = $this->count_rows_for_local_date( $rows, new \DateTimeImmutable( 'now', wp_timezone() ) );
		$zero_results   = $this->count_zero_result_rows( $rows );
		$average        = $this->get_average_nearest_distance( $rows );
		$success_rate   = $this->calculate_rate( $total - $zero_results, $total );

		return array(
			'category'                     => 'search',
			'totalSearches'                => $total,
			'searchesToday'                => $searches_today,
			'zeroResultSearches'           => $zero_results,
			'averageNearestDistanceMeters' => null !== $average ? (float) $average : null,
			'successRate'                  => $success_rate,
			'series'                       => $series,
			'breakdowns'                   => array(
				'queryTypeMix'         => $this->build_query_type_mix_breakdown( $rows ),
				'resultDistribution'   => $this->build_result_distribution_breakdown( $rows ),
				'topQueries'           => $this->build_top_query_breakdown( $rows, false ),
				'topZeroResultQueries' => $this->build_top_query_breakdown( $rows, true ),
			),
		);
	}

	/**
	 * Return selection analytics summary.
	 *
	 * @param string $range Selected analytics range.
	 * @return array<string, mixed>
	 */
	private function get_selection_summary( $range ) {
		$selection_rows = $this->get_summary_rows( $range, 'selection' );
		$search_rows    = $this->get_summary_rows( $range, 'search' );
		$series         = $this->build_selection_summary_series( $selection_rows, $search_rows, $range );
		$total          = count( $selection_rows );
		$search_total   = count( $search_rows );

		return array(
			'category'       => 'selection',
			'totalSelections'=> $total,
			'conversionRate' => $this->calculate_rate( $total, $search_total ),
			'series'         => $series,
			'breakdowns'     => array(
				'sourceMix'    => $this->build_source_mix_breakdown(
					$selection_rows,
					array(
						'search_panel' => __( 'Search panel', 'minimal-map' ),
						'map_marker'   => __( 'Map marker', 'minimal-map' ),
					)
				),
				'topLocations' => $this->build_top_location_breakdown( $selection_rows ),
			),
		);
	}

	/**
	 * Return action analytics summary.
	 *
	 * @param string $range Selected analytics range.
	 * @return array<string, mixed>
	 */
	private function get_action_summary( $range ) {
		$rows   = $this->get_summary_rows( $range, 'action' );
		$total  = count( $rows );
		$series = $this->build_action_summary_series( $rows, $range );

		return array(
			'category'    => 'action',
			'totalActions'=> $total,
			'series'      => $series,
			'breakdowns'  => array(
				'actionTypeMix' => $this->build_action_type_mix_breakdown( $rows ),
				'sourceMix'     => $this->build_source_mix_breakdown(
					$rows,
					array(
						'search_panel' => __( 'Search panel', 'minimal-map' ),
						'in_map_card'  => __( 'In-map card', 'minimal-map' ),
					)
				),
				'topLocations'  => $this->build_top_location_breakdown( $rows ),
			),
		);
	}

	/**
	 * Return query rows for one summary range and category.
	 *
	 * @param string $range Selected analytics range.
	 * @param string $category Selected category.
	 * @return array<int, array<string, mixed>>
	 */
	private function get_summary_rows( $range, $category ) {
		global $wpdb;

		$table_name     = $this->get_table_name();
		$where_clauses  = array();
		$params         = array();
		$range_where    = $this->build_range_where_fragment( $range );
		$category_where = $this->build_category_where_fragment( $category );

		if ( ! empty( $range_where['sql'] ) ) {
			$where_clauses[] = ltrim( str_replace( 'WHERE ', '', $range_where['sql'] ) );
			$params          = array_merge( $params, $range_where['params'] );
		}

		if ( ! empty( $category_where['sql'] ) ) {
			$where_clauses[] = $category_where['sql'];
			$params          = array_merge( $params, $category_where['params'] );
		}

		$where = empty( $where_clauses ) ? '' : 'WHERE ' . implode( ' AND ', $where_clauses );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $where is built from internal whitelisted fragments; table and values are prepared.
		$sql = "SELECT event_category, query_text, query_type, result_count, nearest_distance_meters, location_id, location_title, interaction_source, action_type, action_target, occurred_at_gmt
			FROM %i
			{$where}
			ORDER BY occurred_at_gmt ASC, id ASC";

		// phpcs:disable WordPress.DB.PreparedSQL.NotPrepared -- SQL template is composed from internal fragments; identifiers and values are prepared here.
		$sql = $wpdb->prepare(
			$sql,
			array_merge( array( $table_name ), $params )
		);
		// phpcs:enable WordPress.DB.PreparedSQL.NotPrepared

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Intentional custom analytics table read; SQL is prepared above.
		$rows = $wpdb->get_results( $sql, ARRAY_A );

		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Build stable search series for the selected range.
	 *
	 * @param array<int, array<string, mixed>> $rows Search rows.
	 * @param string                           $range Selected range.
	 * @return array<string, array<int, array<string, int|float|string|null>>>
	 */
	private function build_search_summary_series( $rows, $range ) {
		$bucket_state = $this->initialize_summary_buckets( $range, $rows );
		$buckets      = $bucket_state['buckets'];
		$granularity  = $bucket_state['granularity'];

		foreach ( $rows as $row ) {
			$local_key = $this->get_row_bucket_key( $row, $granularity );

			if ( ! $local_key || ! isset( $buckets[ $local_key ] ) ) {
				continue;
			}

			$buckets[ $local_key ]['totalSearches'] += 1;
			$buckets[ $local_key ]['searchesToday'] += 1;
			$buckets[ $local_key ]['successfulSearches'] += isset( $row['result_count'] ) && (int) $row['result_count'] > 0 ? 1 : 0;

			if ( isset( $row['result_count'] ) && 0 === (int) $row['result_count'] ) {
				$buckets[ $local_key ]['zeroResultSearches'] += 1;
			}

			if ( isset( $row['nearest_distance_meters'] ) && null !== $row['nearest_distance_meters'] && '' !== $row['nearest_distance_meters'] ) {
				$buckets[ $local_key ]['averageNearestDistanceMeters_sum'] += (float) $row['nearest_distance_meters'];
				$buckets[ $local_key ]['averageNearestDistanceMeters_count'] += 1;
			}
		}

		$series = array(
			'totalSearches'                => array(),
			'searchesToday'                => array(),
			'zeroResultSearches'           => array(),
			'averageNearestDistanceMeters' => array(),
			'successRate'                  => array(),
		);

		foreach ( $buckets as $date => $bucket ) {
			$series['totalSearches'][] = array(
				'date'  => $date,
				'value' => $bucket['totalSearches'],
			);
			$series['searchesToday'][] = array(
				'date'  => $date,
				'value' => $bucket['searchesToday'],
			);
			$series['zeroResultSearches'][] = array(
				'date'  => $date,
				'value' => $bucket['zeroResultSearches'],
			);
			$series['averageNearestDistanceMeters'][] = array(
				'date'  => $date,
				'value' => $bucket['averageNearestDistanceMeters_count'] > 0
					? $bucket['averageNearestDistanceMeters_sum'] / $bucket['averageNearestDistanceMeters_count']
					: 0,
			);
			$series['successRate'][] = array(
				'date'  => $date,
				'value' => $this->calculate_rate( $bucket['successfulSearches'], $bucket['totalSearches'] ),
			);
		}

		return $series;
	}

	/**
	 * Build stable selection series for the selected range.
	 *
	 * @param array<int, array<string, mixed>> $selection_rows Selection rows.
	 * @param array<int, array<string, mixed>> $search_rows Search rows.
	 * @param string                           $range Selected range.
	 * @return array<string, array<int, array<string, int|float|string|null>>>
	 */
	private function build_selection_summary_series( $selection_rows, $search_rows, $range ) {
		$bucket_state = $this->initialize_summary_buckets( $range, array_merge( $selection_rows, $search_rows ) );
		$buckets      = $bucket_state['buckets'];
		$granularity  = $bucket_state['granularity'];

		foreach ( $search_rows as $row ) {
			$local_key = $this->get_row_bucket_key( $row, $granularity );

			if ( $local_key && isset( $buckets[ $local_key ] ) ) {
				$buckets[ $local_key ]['searches'] += 1;
			}
		}

		foreach ( $selection_rows as $row ) {
			$local_key = $this->get_row_bucket_key( $row, $granularity );

			if ( $local_key && isset( $buckets[ $local_key ] ) ) {
				$buckets[ $local_key ]['selections'] += 1;
			}
		}

		$series = array(
			'totalSelections' => array(),
			'conversionRate'  => array(),
		);

		foreach ( $buckets as $date => $bucket ) {
			$series['totalSelections'][] = array(
				'date'  => $date,
				'value' => $bucket['selections'],
			);
			$series['conversionRate'][] = array(
				'date'  => $date,
				'value' => $this->calculate_rate( $bucket['selections'], $bucket['searches'] ),
			);
		}

		return $series;
	}

	/**
	 * Build stable action series for the selected range.
	 *
	 * @param array<int, array<string, mixed>> $rows Action rows.
	 * @param string                           $range Selected range.
	 * @return array<string, array<int, array<string, int|float|string|null>>>
	 */
	private function build_action_summary_series( $rows, $range ) {
		$bucket_state = $this->initialize_summary_buckets( $range, $rows );
		$buckets      = $bucket_state['buckets'];
		$granularity  = $bucket_state['granularity'];
		$series       = array(
			'totalActions' => array(),
		);

		foreach ( $rows as $row ) {
			$local_key = $this->get_row_bucket_key( $row, $granularity );

			if ( $local_key && isset( $buckets[ $local_key ] ) ) {
				$buckets[ $local_key ]['totalActions'] += 1;
			}
		}

		foreach ( $buckets as $date => $bucket ) {
			$series['totalActions'][] = array(
				'date'  => $date,
				'value' => $bucket['totalActions'],
			);
		}

		return $series;
	}

	/**
	 * Build initialized summary buckets for a range.
	 *
	 * @param string                           $range Selected analytics range.
	 * @param array<int, array<string, mixed>> $rows Summary rows.
	 * @return array<string, mixed>
	 */
	private function initialize_summary_buckets( $range, $rows ) {
		$range_config = $this->get_range_config( $range );
		$granularity  = $range_config['granularity'];
		$buckets      = array();

		if ( 'month' === $granularity ) {
			if ( empty( $rows ) ) {
				return array(
					'granularity' => $granularity,
					'buckets'     => array(),
				);
			}

			$first_occurrence = $this->get_local_occurrence( $rows[0]['occurred_at_gmt'] );
			$cursor           = $first_occurrence->modify( 'first day of this month' )->setTime( 0, 0, 0 );
			$end_month        = ( new \DateTimeImmutable( 'now', wp_timezone() ) )->modify( 'first day of this month' )->setTime( 0, 0, 0 );

			while ( $cursor->getTimestamp() <= $end_month->getTimestamp() ) {
				$key             = $this->format_bucket_key( $cursor, $granularity );
				$buckets[ $key ] = $this->get_empty_summary_bucket();
				$cursor          = $cursor->modify( '+1 month' );
			}

			return array(
				'granularity' => $granularity,
				'buckets'     => $buckets,
			);
		}

		$cursor = $range_config['start_local'];
		$end    = $range_config['end_local'];
		$step   = 'hour' === $granularity ? '+1 hour' : '+1 day';

		while ( $cursor instanceof \DateTimeImmutable && $end instanceof \DateTimeImmutable && $cursor->getTimestamp() < $end->getTimestamp() ) {
			$key             = $this->format_bucket_key( $cursor, $granularity );
			$buckets[ $key ] = $this->get_empty_summary_bucket();
			$cursor          = $cursor->modify( $step );
		}

		return array(
			'granularity' => $granularity,
			'buckets'     => $buckets,
		);
	}

	/**
	 * Return one empty summary bucket.
	 *
	 * @return array<string, float|int>
	 */
	private function get_empty_summary_bucket() {
		return array(
			'totalSearches'                      => 0,
			'searchesToday'                      => 0,
			'zeroResultSearches'                 => 0,
			'successfulSearches'                 => 0,
			'averageNearestDistanceMeters_sum'   => 0.0,
			'averageNearestDistanceMeters_count' => 0,
			'searches'                           => 0,
			'selections'                         => 0,
			'totalActions'                       => 0,
		);
	}

	/**
	 * Return one normalized range configuration.
	 *
	 * @param string $range Selected analytics range.
	 * @return array<string, mixed>
	 */
	private function get_range_config( $range ) {
		$normalized_range = $this->normalize_range_key( $range );
		$timezone         = wp_timezone();
		$today_start      = ( new \DateTimeImmutable( 'now', $timezone ) )->setTime( 0, 0, 0 );

		switch ( $normalized_range ) {
			case 'today':
				$start_local = $today_start;
				$end_local   = $today_start->modify( '+1 day' );
				$granularity = 'hour';
				break;
			case 'yesterday':
				$start_local = $today_start->modify( '-1 day' );
				$end_local   = $today_start;
				$granularity = 'hour';
				break;
			case '7d':
				$start_local = $today_start->modify( '-6 days' );
				$end_local   = $today_start->modify( '+1 day' );
				$granularity = 'day';
				break;
			case '90d':
				$start_local = $today_start->modify( '-89 days' );
				$end_local   = $today_start->modify( '+1 day' );
				$granularity = 'day';
				break;
			case 'all':
				$start_local = null;
				$end_local   = null;
				$granularity = 'month';
				break;
			case '30d':
			default:
				$start_local = $today_start->modify( '-29 days' );
				$end_local   = $today_start->modify( '+1 day' );
				$granularity = 'day';
				break;
		}

		return array(
			'range'       => $normalized_range,
			'granularity' => $granularity,
			'start_local' => $start_local,
			'end_local'   => $end_local,
			'start_gmt'   => $start_local instanceof \DateTimeImmutable
				? $start_local->setTimezone( new \DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' )
				: null,
			'end_gmt'     => $end_local instanceof \DateTimeImmutable
				? $end_local->setTimezone( new \DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' )
				: null,
		);
	}

	/**
	 * Build one SQL range fragment with prepared params.
	 *
	 * @param string $range Selected analytics range.
	 * @return array<string, mixed>
	 */
	private function build_range_where_fragment( $range ) {
		$config     = $this->get_range_config( $range );
		$conditions = array();
		$params     = array();

		if ( ! empty( $config['start_gmt'] ) ) {
			$conditions[] = 'occurred_at_gmt >= %s';
			$params[]     = $config['start_gmt'];
		}

		if ( ! empty( $config['end_gmt'] ) ) {
			$conditions[] = 'occurred_at_gmt < %s';
			$params[]     = $config['end_gmt'];
		}

		return array(
			'sql'    => empty( $conditions ) ? '' : 'WHERE ' . implode( ' AND ', $conditions ),
			'params' => $params,
		);
	}

	/**
	 * Build one SQL category fragment with prepared params.
	 *
	 * @param string $category Selected category.
	 * @return array<string, mixed>
	 */
	private function build_category_where_fragment( $category ) {
		$normalized_category = $this->sanitize_event_category( $category );

		if ( 'search' === $normalized_category ) {
			return array(
				'sql'    => "(event_category = 'search' OR event_category = '' OR event_category IS NULL)",
				'params' => array(),
			);
		}

		return array(
			'sql'    => 'event_category = %s',
			'params' => array( $normalized_category ),
		);
	}

	/**
	 * Build one SQL text search fragment with prepared params.
	 *
	 * @param string $category Selected category.
	 * @param string $search Search string.
	 * @return array<string, mixed>
	 */
	private function build_query_search_fragment( $category, $search ) {
		global $wpdb;

		if ( '' === $search ) {
			return array(
				'sql'    => '',
				'params' => array(),
			);
		}

		$like = '%' . $wpdb->esc_like( $search ) . '%';

		switch ( $this->sanitize_event_category( $category ) ) {
			case 'selection':
				return array(
					'sql'    => '(location_title LIKE %s OR query_text LIKE %s OR interaction_source LIKE %s)',
					'params' => array( $like, $like, $like ),
				);
			case 'action':
				return array(
					'sql'    => '(location_title LIKE %s OR action_type LIKE %s OR action_target LIKE %s OR interaction_source LIKE %s)',
					'params' => array( $like, $like, $like, $like ),
				);
			case 'search':
			default:
				return array(
					'sql'    => 'query_text LIKE %s',
					'params' => array( $like ),
				);
		}
	}

	/**
	 * Normalize one analytics range key.
	 *
	 * @param string $range Raw range.
	 * @return string
	 */
	private function normalize_range_key( $range ) {
		$normalized = sanitize_key( (string) $range );

		if ( in_array( $normalized, self::SUMMARY_RANGE_KEYS, true ) ) {
			return $normalized;
		}

		return self::DEFAULT_SUMMARY_RANGE;
	}

	/**
	 * Convert one GMT occurrence into the site timezone.
	 *
	 * @param string $occurred_at_gmt Occurrence timestamp in GMT.
	 * @return \DateTimeImmutable
	 */
	private function get_local_occurrence( $occurred_at_gmt ) {
		return ( new \DateTimeImmutable( (string) $occurred_at_gmt, new \DateTimeZone( 'UTC' ) ) )->setTimezone( wp_timezone() );
	}

	/**
	 * Format one time bucket key.
	 *
	 * @param \DateTimeImmutable $date Date to format.
	 * @param string             $granularity Bucket granularity.
	 * @return string
	 */
	private function format_bucket_key( \DateTimeImmutable $date, $granularity ) {
		switch ( $granularity ) {
			case 'hour':
				return $date->format( 'Y-m-d H:00' );
			case 'month':
				return $date->format( 'Y-m' );
			case 'day':
			default:
				return $date->format( 'Y-m-d' );
		}
	}

	/**
	 * Return one row bucket key.
	 *
	 * @param array<string, mixed> $row Row data.
	 * @param string               $granularity Bucket granularity.
	 * @return string|null
	 */
	private function get_row_bucket_key( $row, $granularity ) {
		if ( empty( $row['occurred_at_gmt'] ) ) {
			return null;
		}

		try {
			$local_occurrence = $this->get_local_occurrence( $row['occurred_at_gmt'] );
		} catch ( \Exception $exception ) {
			return null;
		}

		return $this->format_bucket_key( $local_occurrence, $granularity );
	}

	/**
	 * Count rows that occurred on one local date.
	 *
	 * @param array<int, array<string, mixed>> $rows Summary rows.
	 * @param \DateTimeImmutable               $target_date Target local date.
	 * @return int
	 */
	private function count_rows_for_local_date( $rows, \DateTimeImmutable $target_date ) {
		$target_key = $target_date->format( 'Y-m-d' );
		$count      = 0;

		foreach ( $rows as $row ) {
			$bucket_key = $this->get_row_bucket_key( $row, 'day' );

			if ( $bucket_key === $target_key ) {
				++$count;
			}
		}

		return $count;
	}

	/**
	 * Count zero-result summary rows.
	 *
	 * @param array<int, array<string, mixed>> $rows Summary rows.
	 * @return int
	 */
	private function count_zero_result_rows( $rows ) {
		$count = 0;

		foreach ( $rows as $row ) {
			if ( isset( $row['result_count'] ) && 0 === (int) $row['result_count'] ) {
				++$count;
			}
		}

		return $count;
	}

	/**
	 * Return the average nearest distance across rows with distance data.
	 *
	 * @param array<int, array<string, mixed>> $rows Summary rows.
	 * @return float|null
	 */
	private function get_average_nearest_distance( $rows ) {
		$sum   = 0.0;
		$count = 0;

		foreach ( $rows as $row ) {
			if ( ! isset( $row['nearest_distance_meters'] ) || null === $row['nearest_distance_meters'] || '' === $row['nearest_distance_meters'] ) {
				continue;
			}

			$sum += (float) $row['nearest_distance_meters'];
			++$count;
		}

		if ( 0 === $count ) {
			return null;
		}

		return $sum / $count;
	}

	/**
	 * Calculate one percentage rate.
	 *
	 * @param int $numerator Numerator.
	 * @param int $denominator Denominator.
	 * @return float
	 */
	private function calculate_rate( $numerator, $denominator ) {
		if ( $denominator <= 0 ) {
			return 0.0;
		}

		return ( $numerator / $denominator ) * 100;
	}

	/**
	 * Build the query-type mix breakdown.
	 *
	 * @param array<int, array<string, mixed>> $rows Summary rows.
	 * @return array<int, array<string, int|string>>
	 */
	private function build_query_type_mix_breakdown( $rows ) {
		$counts = array_fill_keys( self::QUERY_TYPES, 0 );

		foreach ( $rows as $row ) {
			$type = $this->sanitize_query_type( isset( $row['query_type'] ) ? $row['query_type'] : 'text' );
			$counts[ $type ] += 1;
		}

		return array(
			array(
				'key'   => 'text',
				'label' => __( 'Text', 'minimal-map' ),
				'value' => $counts['text'],
			),
			array(
				'key'   => 'address',
				'label' => __( 'Address', 'minimal-map' ),
				'value' => $counts['address'],
			),
			array(
				'key'   => 'coordinates',
				'label' => __( 'Coordinates', 'minimal-map' ),
				'value' => $counts['coordinates'],
			),
			array(
				'key'   => 'live_location',
				'label' => __( 'Live location', 'minimal-map' ),
				'value' => $counts['live_location'],
			),
		);
	}

	/**
	 * Build the result-distribution breakdown.
	 *
	 * @param array<int, array<string, mixed>> $rows Summary rows.
	 * @return array<int, array<string, int|string>>
	 */
	private function build_result_distribution_breakdown( $rows ) {
		$counts = array(
			'0'   => 0,
			'1'   => 0,
			'2-5' => 0,
			'6+'  => 0,
		);

		foreach ( $rows as $row ) {
			$result_count = isset( $row['result_count'] ) ? max( 0, absint( $row['result_count'] ) ) : 0;

			if ( 0 === $result_count ) {
				$counts['0'] += 1;
			} elseif ( 1 === $result_count ) {
				$counts['1'] += 1;
			} elseif ( $result_count <= 5 ) {
				$counts['2-5'] += 1;
			} else {
				$counts['6+'] += 1;
			}
		}

		return array(
			array(
				'key'   => '0',
				'label' => __( '0 results', 'minimal-map' ),
				'value' => $counts['0'],
			),
			array(
				'key'   => '1',
				'label' => __( '1 result', 'minimal-map' ),
				'value' => $counts['1'],
			),
			array(
				'key'   => '2-5',
				'label' => __( '2-5 results', 'minimal-map' ),
				'value' => $counts['2-5'],
			),
			array(
				'key'   => '6+',
				'label' => __( '6+ results', 'minimal-map' ),
				'value' => $counts['6+'],
			),
		);
	}

	/**
	 * Build the top-query breakdown.
	 *
	 * @param array<int, array<string, mixed>> $rows Summary rows.
	 * @param bool                             $zero_results_only Restrict to zero-result searches.
	 * @return array<int, array<string, int|string>>
	 */
	private function build_top_query_breakdown( $rows, $zero_results_only ) {
		$counts = array();

		foreach ( $rows as $row ) {
			$result_count = isset( $row['result_count'] ) ? max( 0, absint( $row['result_count'] ) ) : 0;

			if ( $zero_results_only && 0 !== $result_count ) {
				continue;
			}

			$label = isset( $row['query_text'] ) ? trim( sanitize_text_field( (string) $row['query_text'] ) ) : '';

			if ( '' === $label ) {
				continue;
			}

			if ( ! isset( $counts[ $label ] ) ) {
				$counts[ $label ] = 0;
			}

			$counts[ $label ] += 1;
		}

		return $this->sort_counts_to_breakdown_items( $counts );
	}

	/**
	 * Build one source-mix breakdown.
	 *
	 * @param array<int, array<string, mixed>> $rows Summary rows.
	 * @param array<string, string>            $labels Labels keyed by source.
	 * @return array<int, array<string, int|string>>
	 */
	private function build_source_mix_breakdown( $rows, $labels ) {
		$counts = array_fill_keys( array_keys( $labels ), 0 );

		foreach ( $rows as $row ) {
			$source = $this->sanitize_interaction_source( isset( $row['interaction_source'] ) ? $row['interaction_source'] : '' );

			if ( '' !== $source && isset( $counts[ $source ] ) ) {
				$counts[ $source ] += 1;
			}
		}

		$items = array();

		foreach ( $labels as $key => $label ) {
			$items[] = array(
				'key'   => $key,
				'label' => $label,
				'value' => $counts[ $key ],
			);
		}

		return $items;
	}

	/**
	 * Build one action-type mix breakdown.
	 *
	 * @param array<int, array<string, mixed>> $rows Summary rows.
	 * @return array<int, array<string, int|string>>
	 */
	private function build_action_type_mix_breakdown( $rows ) {
		$labels = array(
			'opening_hours' => __( 'Opening hours', 'minimal-map' ),
			'telephone'     => __( 'Phone', 'minimal-map' ),
			'email'         => __( 'Email', 'minimal-map' ),
			'website'       => __( 'Website', 'minimal-map' ),
			'social_media'  => __( 'Social media', 'minimal-map' ),
			'google_maps'   => __( 'Google Maps', 'minimal-map' ),
		);
		$counts = array_fill_keys( array_keys( $labels ), 0 );

		foreach ( $rows as $row ) {
			$action_type = $this->sanitize_action_type( isset( $row['action_type'] ) ? $row['action_type'] : '' );

			if ( '' !== $action_type && isset( $counts[ $action_type ] ) ) {
				$counts[ $action_type ] += 1;
			}
		}

		$items = array();

		foreach ( $labels as $key => $label ) {
			$items[] = array(
				'key'   => $key,
				'label' => $label,
				'value' => $counts[ $key ],
			);
		}

		return $items;
	}

	/**
	 * Build one top-locations breakdown.
	 *
	 * @param array<int, array<string, mixed>> $rows Summary rows.
	 * @return array<int, array<string, int|string>>
	 */
	private function build_top_location_breakdown( $rows ) {
		$counts = array();

		foreach ( $rows as $row ) {
			$label = isset( $row['location_title'] ) ? trim( sanitize_text_field( (string) $row['location_title'] ) ) : '';

			if ( '' === $label ) {
				continue;
			}

			if ( ! isset( $counts[ $label ] ) ) {
				$counts[ $label ] = 0;
			}

			$counts[ $label ] += 1;
		}

		return $this->sort_counts_to_breakdown_items( $counts );
	}

	/**
	 * Normalize one raw analytics row for REST responses.
	 *
	 * @param array<string, mixed> $row Raw database row.
	 * @return array<string, mixed>
	 */
	private function normalize_row( $row ) {
		$occurred_at = isset( $row['occurred_at_gmt'] ) ? strtotime( (string) $row['occurred_at_gmt'] . ' UTC' ) : false;

		return array(
			'id'                      => isset( $row['id'] ) ? absint( $row['id'] ) : 0,
			'event_category'          => $this->sanitize_event_category( isset( $row['event_category'] ) ? $row['event_category'] : 'search' ),
			'query_text'              => isset( $row['query_text'] ) ? sanitize_text_field( (string) $row['query_text'] ) : '',
			'query_type'              => $this->sanitize_query_type( isset( $row['query_type'] ) ? $row['query_type'] : 'text' ),
			'result_count'            => isset( $row['result_count'] ) ? max( 0, absint( $row['result_count'] ) ) : 0,
			'nearest_distance_meters' => isset( $row['nearest_distance_meters'] ) && null !== $row['nearest_distance_meters']
				? max( 0, absint( $row['nearest_distance_meters'] ) )
				: null,
			'location_id'             => isset( $row['location_id'] ) && null !== $row['location_id']
				? absint( $row['location_id'] )
				: null,
			'location_title'          => isset( $row['location_title'] ) ? sanitize_text_field( (string) $row['location_title'] ) : '',
			'interaction_source'      => $this->sanitize_interaction_source( isset( $row['interaction_source'] ) ? $row['interaction_source'] : '' ),
			'action_type'             => $this->sanitize_action_type( isset( $row['action_type'] ) ? $row['action_type'] : '' ),
			'action_target'           => isset( $row['action_target'] ) ? sanitize_text_field( (string) $row['action_target'] ) : '',
			'occurred_at_gmt'         => false !== $occurred_at ? gmdate( 'c', $occurred_at ) : gmdate( 'c' ),
		);
	}

	/**
	 * Normalize and sanitize one tracking payload.
	 *
	 * @param array<string, mixed> $payload Raw tracking payload.
	 * @return array<string, mixed>
	 */
	private function normalize_track_payload( $payload ) {
		$query_text = isset( $payload['query_text'] ) ? trim( sanitize_text_field( (string) $payload['query_text'] ) ) : '';

		if ( strlen( $query_text ) > 255 ) {
			$query_text = substr( $query_text, 0, 255 );
		}

		$location_title = isset( $payload['location_title'] ) ? trim( sanitize_text_field( (string) $payload['location_title'] ) ) : '';

		if ( strlen( $location_title ) > 255 ) {
			$location_title = substr( $location_title, 0, 255 );
		}

		$action_target = isset( $payload['action_target'] ) ? trim( sanitize_text_field( (string) $payload['action_target'] ) ) : '';

		if ( strlen( $action_target ) > 255 ) {
			$action_target = substr( $action_target, 0, 255 );
		}

		$nearest_distance = null;

		if ( isset( $payload['nearest_distance_meters'] ) && '' !== $payload['nearest_distance_meters'] && null !== $payload['nearest_distance_meters'] ) {
			$nearest_distance = max( 0, (int) round( (float) $payload['nearest_distance_meters'] ) );
		}

		$location_id = isset( $payload['location_id'] ) && '' !== $payload['location_id']
			? absint( $payload['location_id'] )
			: null;

		return array(
			'event_category'          => $this->sanitize_event_category( isset( $payload['event_category'] ) ? $payload['event_category'] : 'search' ),
			'query_text'              => $query_text,
			'query_type'              => $this->sanitize_query_type( isset( $payload['query_type'] ) ? $payload['query_type'] : 'text' ),
			'result_count'            => isset( $payload['result_count'] ) ? max( 0, absint( $payload['result_count'] ) ) : 0,
			'nearest_distance_meters' => $nearest_distance,
			'location_id'             => $location_id,
			'location_title'          => $location_title,
			'interaction_source'      => $this->sanitize_interaction_source( isset( $payload['interaction_source'] ) ? $payload['interaction_source'] : '' ),
			'action_type'             => $this->sanitize_action_type( isset( $payload['action_type'] ) ? $payload['action_type'] : '' ),
			'action_target'           => $action_target,
		);
	}

	/**
	 * Validate one normalized tracking payload.
	 *
	 * @param array<string, mixed> $payload Normalized tracking payload.
	 * @return bool
	 */
	private function is_valid_track_payload( $payload ) {
		switch ( $payload['event_category'] ) {
			case 'selection':
				return ! empty( $payload['location_id'] ) && '' !== $payload['location_title'] && '' !== $payload['interaction_source'];
			case 'action':
				return ! empty( $payload['location_id'] ) && '' !== $payload['location_title'] && '' !== $payload['interaction_source'] && '' !== $payload['action_type'];
			case 'search':
			default:
				return '' !== $payload['query_text'];
		}
	}

	/**
	 * Sort one associative count map into breakdown items.
	 *
	 * @param array<string, int> $counts Count map.
	 * @return array<int, array<string, int|string>>
	 */
	private function sort_counts_to_breakdown_items( $counts ) {
		if ( empty( $counts ) ) {
			return array();
		}

		uksort(
			$counts,
			static function ( $left, $right ) use ( $counts ) {
				$value_compare = $counts[ $right ] <=> $counts[ $left ];

				if ( 0 !== $value_compare ) {
					return $value_compare;
				}

				return strcasecmp( $left, $right );
			}
		);

		$items = array();

		foreach ( array_slice( $counts, 0, self::SUMMARY_TOP_ITEMS_LIMIT, true ) as $label => $value ) {
			$items[] = array(
				'key'   => $label,
				'label' => $label,
				'value' => $value,
			);
		}

		return $items;
	}

	/**
	 * Sanitize a query type into the supported set.
	 *
	 * @param mixed $query_type Raw query type.
	 * @return string
	 */
	private function sanitize_query_type( $query_type ) {
		$normalized = sanitize_key( (string) $query_type );

		if ( in_array( $normalized, self::QUERY_TYPES, true ) ) {
			return $normalized;
		}

		return 'text';
	}

	/**
	 * Sanitize an event category into the supported set.
	 *
	 * @param mixed $category Raw category.
	 * @return string
	 */
	private function sanitize_event_category( $category ) {
		$normalized = sanitize_key( (string) $category );

		if ( in_array( $normalized, self::EVENT_CATEGORIES, true ) ) {
			return $normalized;
		}

		return 'search';
	}

	/**
	 * Sanitize one interaction source into the supported set.
	 *
	 * @param mixed $source Raw source.
	 * @return string
	 */
	private function sanitize_interaction_source( $source ) {
		$normalized = sanitize_key( (string) $source );

		if ( in_array( $normalized, self::INTERACTION_SOURCES, true ) ) {
			return $normalized;
		}

		return '';
	}

	/**
	 * Sanitize one action type into the supported set.
	 *
	 * @param mixed $action_type Raw action type.
	 * @return string
	 */
	private function sanitize_action_type( $action_type ) {
		$normalized = sanitize_key( (string) $action_type );

		if ( in_array( $normalized, self::ACTION_TYPES, true ) ) {
			return $normalized;
		}

		return '';
	}

	/**
	 * Whether the analytics table exists.
	 *
	 * @return bool
	 */
	private function table_exists() {
		global $wpdb;

		$table_name = $this->get_table_name();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Lightweight existence check for the plugin's custom analytics table.
		$result     = $wpdb->get_var(
			$wpdb->prepare( 'SHOW TABLES LIKE %s', $table_name )
		);

		return $table_name === $result;
	}

	/**
	 * Return the current charset/collation fragment for dbDelta.
	 *
	 * @return string
	 */
	private function get_charset_collate() {
		global $wpdb;

		if ( method_exists( $wpdb, 'get_charset_collate' ) ) {
			return $wpdb->get_charset_collate();
		}

		return '';
	}
}

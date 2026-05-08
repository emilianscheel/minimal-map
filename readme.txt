=== Emilian Scheel's Minimal Map & Store Locator ===
Contributors: emilianscheel
Tags: maps, gutenberg, blocks, geolocation
Requires at least: 6.9
Tested up to: 6.9
Requires PHP: 8.3
Stable tag: 0.8.3
License: MIT
License URI: https://opensource.org/license/mit/

WordPress store locator and MapLibre map block with a native admin workspace for locations, styles, tags, and analytics.

== Description ==

Minimal Map: Store Locator & Map Block is built for current WordPress only. The plugin supports the latest stable WordPress release and PHP 8.3, and its build pipeline is optimized around that target instead of carrying legacy compatibility code.

Features include:

* Open source WordPress map plugin.
* Completely free map plugin for WordPress.
* WordPress-native map plugin built with native WordPress components.
* Built-in WordPress admin experience.
* Gutenberg map block for the block editor.
* Store locator plugin for WordPress.
* Location finder, branch locator, dealer locator, office locator.
* Interactive map for business locations, shops, studios, offices, showrooms, events, and directories.
* Frontend map powered by MapLibre.
* Live block editor map preview.
* Dedicated admin workspace for locations, collections, tags, markers, logos, and styles.
* Privacy-first search analytics with search query trends and metrics.
* Advanced interaction analytics for location selections and actions (website, email, phone, etc.).
* Export analytics reports to CSV for offline analysis.
* GDPR-ready tracking with built-in Complianz script blocking support.
* Marker clustering to handle hundreds of locations on a single map.
* "Find Me" button for real-time user location centering.
* Live user location "blue dot" indicator.
* Reusable location collections for grouped maps and filtered map views.
* Merge location collections to easily consolidate data.
* Searchable map with integrated search panel.
* Distance-based search results with real-time distance calculation (m/km).
* Automatic nearest-location highlighting in search results.
* Store locator cards with address, phone, email, website, logo, and tags.
* Social media links for locations (Instagram, X, Facebook, Threads, YouTube, Telegram).
* Detailed opening hours with support for lunch breaks and seasonal notes.
* Real-time "Open Now" status with customizable indicator colors.
* Dynamic opening status hints like "Opens soon" or "Closes soon".
* Address geocoding for fast location entry.
* Duplicate existing locations for faster data entry.
* Retrieve coordinates automatically from addresses (re-geocoding).
* Manual map pin placement and coordinate editing.
* CSV, Excel (XLSX), and JSON import/export for seamless location data management.
* Custom CSV/Excel/JSON field mapping for flexible location imports.
* Import opening hours and lunch breaks from external CSV, Excel, and JSON files.
* CSV export for analytics.
* Example CSV/Excel/JSON export for faster onboarding.
* Bulk-friendly location management in a native WordPress admin UI.
* Bulk-assign logos, markers, tags, and opening hours to multiple locations.
* Power-user keyboard shortcuts for lightning-fast admin workflows (n, m).
* Custom SVG logo library for location branding.
* Custom marker presets and visual pin styles.
* Individual location pin colors and bulk marker color updates.
* Multiple map style presets including Liberty, Bright, and Positron.
* Custom style themes for map colors and visual branding.
* Map theme import from Minimal Map JSON or MapLibre style JSON v8.
* Custom font family support for perfect typography matching.
* Configurable zoom controls with custom position, colors, spacing, radius, and icons.
* Choose from multiple zoom icon sets (plus/minus, circles, lines).
* Configurable search panel colors, spacing, width, and card styling.
* In-map location cards for modern overlay-style details.
* Customizable "View on Google Maps" navigation button styling.
* Customizable map attribution (credits) styling and positioning.
* Collection-based map output for store groups, regions, teams, and categories.
* Iframe embed snippet generation for external embeds.
* Custom map height controls with mobile-specific height overrides.
* Scroll zoom, mobile two-finger zoom, and cooperative gesture settings.
* English source strings with German and French translations.
* Feels native to WordPress and built for modern WordPress sites.
* Marker library with built-in SVG presets for rapid map styling.
* Pre-built WordPress and static palette templates for style themes.
* Multi-edit color selection for map style themes.
* Animated analytics metrics with relative time labels and event icons.
* Bulk-delete analytics data for privacy and data management.

Only the latest stable WordPress release is supported. Older WordPress and PHP versions are intentionally out of scope for this plugin.

== External services ==

Minimal Map: Store Locator & Map Block can connect to external services to render maps, geocode addresses, and open navigation links.

= OpenFreeMap =

The bundled map presets load map style and tile data from OpenFreeMap when a map is displayed on the frontend, in the block editor preview, or in the admin map preview. The visitor's browser requests the selected style and map tiles directly from OpenFreeMap. Those requests include normal browser request data such as the requested tile/style URL, IP address, user agent, and referrer.

OpenFreeMap is provided by OpenFreeMap. Terms of service: https://openfreemap.org/tos/ Privacy policy: https://openfreemap.org/privacy/

= OpenStreetMap Nominatim =

Address geocoding uses the OpenStreetMap Nominatim service when an administrator requests coordinates for an address, and frontend live search uses it when a visitor enters a free-text location search. The plugin sends the entered address or search query, the site URL as the request referrer, and a plugin user agent. Results are cached locally to reduce repeated requests.

Nominatim is provided by the OpenStreetMap Foundation. Usage policy: https://operations.osmfoundation.org/policies/nominatim/ Privacy policy: https://osmfoundation.org/wiki/Privacy_Policy

= Google Maps =

If the optional Google Maps navigation button is enabled for a map, clicking that button opens Google Maps in a new browser tab. The destination location coordinates are included in the Google Maps URL. The plugin does not contact Google Maps until the visitor clicks the navigation link.

Google Maps is provided by Google. Google Maps terms: https://www.google.com/help/terms_maps/ Privacy policy: https://policies.google.com/privacy

== Installation ==

1. Upload the plugin to `/wp-content/plugins/`.
1. Activate the plugin through the 'Plugins' menu in WordPress
1. Add the Minimal Map block in the block editor or manage data through the Minimal Map: Store Locator & Map Block admin menu.

== Frequently Asked Questions ==

= Which WordPress and PHP versions are supported? =

The plugin supports WordPress 6.9.4 and PHP 8.3. The codebase and CI pipeline are optimized for the latest stable stack only.

= Does the plugin include translations? =

Yes. English is the source language and German/French translations are included.

== Screenshots ==

1. Dashboard overview (`dashboard.png`)
2. Location management (`locations.png`)
3. Collection management (`collections.png`)
4. Tag management (`tags.png`)
5. Map style management (`styles.png`)
6. Search interface (`search.png`)
7. Zoom controls (`zoom.png`)
8. Layout options (`layout.png`)
9. Gutenberg block integration (`gutenberg.png`)
10. Map preview (`preview.png`)

== Changelog ==

= 0.8.2 =
* Removed license verification and paid feature locking so all plugin features are free.
* Removed the 10-location limit.
* Added external service documentation for map tiles, geocoding, and navigation links.
* Moved iframe document CSS to WordPress enqueue APIs.
* Added direct-access guards to plugin PHP files.

= 0.8.0 =
* Added marker library with built-in SVG presets for rapid map styling.
* Added pre-built WordPress and static palette templates for style themes.
* Added multi-edit color selection for map style themes.
* Added animated analytics metrics with relative time labels and event icons.
* Added bulk-delete analytics data feature.
* Added French (fr_FR) translations.
* Added "Clean" action for analytics data.
* Fixed Complianz script blocking integration.
* Refined admin modal layouts and stabilized analytics views.

= 0.7.0 =
* Added comprehensive search, selection, and action analytics with CSV export.
* Added support for Excel (XLSX) import and export.
* Added JSON import and export for locations, including custom-schema JSON imports via the existing mapping workflow.
* Added custom CSV/Excel/JSON field mapping for location and opening hours import.
* Added duplicate location and retrieve coordinates (re-geocoding) features.
* Added bulk actions for assigning logos, markers, tags, and opening hours.
* Added bulk marker color updates for multiple locations.
* Added social media links (Instagram, X, Facebook, Threads, YouTube, Telegram) to locations.
* Added "Find Me" button and live user location "blue dot" indicator.
* Added marker clustering for handling large datasets.
* Added in-map location cards for modern overlay layouts.
* Added power-user keyboard shortcuts (n for new, m for merge).
* Refined admin modal layouts and stabilized collection previews.
* Unified modal widths and polished the dashboard experience.

= 0.2.0 =
* Added detailed opening hours with lunch breaks, seasonal notes, and "Open Now" status indicators.
* Added distance-based search results with real-time m/km calculation and nearest-result highlighting.
* Added custom CSV field mapping for flexible location imports from external data sources.
* Added collection merging to consolidate location groups within the admin workspace.
* Added mobile-specific map height overrides and cooperative gesture (two-finger pan) support.
* Added advanced styling controls for zoom icons, map attribution, and navigation buttons.
* Expanded location data fields for more detailed contact and address information.
* Optimized the build pipeline for latest-only WordPress and PHP support.
* Split the admin and map runtime bundles into async chunks.
* Added bundle budget checks and bundle analysis tooling.
* Added native plugin translations for English source strings and German.

== Upgrade Notice ==

= 0.2.0 =
This release switches the plugin to latest-only support and ships a smaller, more efficient runtime loading model.

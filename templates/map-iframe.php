<?php
/**
 * Standalone iframe map document.
 *
 * @package Minimal_Map
 */

defined( 'ABSPATH' ) || exit;

?>
<!doctype html>
<html <?php echo $language_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
<head>
	<meta charset="<?php echo esc_attr( $charset ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title><?php echo esc_html( $document_title ); ?></title>
	<style id="minimal-map-iframe-document-css"><?php echo esc_html( $document_styles ); ?></style>
	<?php wp_head(); ?>
</head>
<body
	class="minimal-map-iframe-page"
	<?php if ( '' !== $document_font_family ) : ?>
		style="--minimal-map-font-family: <?php echo esc_attr( $document_font_family ); ?>;"
	<?php endif; ?>
>
	<?php if ( '' !== $error_message ) : ?>
		<div class="minimal-map-iframe-page__error"><?php echo esc_html( $error_message ); ?></div>
	<?php else : ?>
		<?php echo $map_surface_markup; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	<?php endif; ?>
	<?php wp_footer(); ?>
</body>
</html>

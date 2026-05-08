import { Notice } from "@wordpress/components";
import { useEffect, useMemo, useRef } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { createMinimalMap } from "../../map/bootstrap";
import type { MinimalMapInstance, RawMapConfig } from "../../types";
import type { LocationsController } from "./types";

export default function MapStep({
  controller,
}: {
  controller: LocationsController;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MinimalMapInstance | null>(null);
  const runtimeConfig = useMemo(
    () => ({
      ...(window.MinimalMapAdminConfig?.mapConfig ?? {}),
      autoFetchLocations: false,
      onMapClick: controller.onMapLocationSelect,
    }),
    [controller.onMapLocationSelect],
  );
  const mapConfig = useMemo<RawMapConfig>(
    () => ({
      centerLat:
        controller.selectedCoordinates?.lat ??
        controller.mapCenter?.lat ??
        52.517,
      centerLng:
        controller.selectedCoordinates?.lng ??
        controller.mapCenter?.lng ??
        13.388,
      zoom: controller.selectedCoordinates || controller.mapCenter ? 15 : 11,
      height: 400,
      heightUnit: "px",
      stylePreset: "positron",
      showZoomControls: false,
      allowSearch: false,
      locations: [],
      markerLat: controller.selectedCoordinates?.lat ?? null,
      markerLng: controller.selectedCoordinates?.lng ?? null,
    }),
    [controller.mapCenter, controller.selectedCoordinates],
  );

  useEffect(() => {
    if (!hostRef.current) {
      return undefined;
    }

    mapRef.current = createMinimalMap(
      hostRef.current,
      mapConfig,
      runtimeConfig,
    );

    return () => {
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, [runtimeConfig]);

  useEffect(() => {
    mapRef.current?.update(mapConfig);
  }, [mapConfig]);

  return (
    <div className="minimal-map-admin__location-map-step">
      {controller.geocodeError ? (
        <Notice status="warning" isDismissible={false}>
          {controller.geocodeError}
        </Notice>
      ) : controller.geocodeNotice ? (
        <Notice status="info" isDismissible={false}>
          {controller.geocodeNotice}
        </Notice>
      ) : null}
      {!controller.selectedCoordinates && (
        <p className="minimal-map-admin__location-map-hint">
          {__("Click on the map to place the location marker.", "minimal-map")}
        </p>
      )}
      <div ref={hostRef} className="minimal-map-admin__location-map-surface" />
    </div>
  );
}

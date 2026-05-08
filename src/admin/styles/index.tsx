import {
  Card,
  CardBody,
  DropZone,
  Notice,
  Spinner,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import type { StylesController } from "./types";
import { ColorControl } from "./ColorControl";
import { CreateThemeModal } from "./CreateThemeModal";
import { DeleteThemeModal } from "./DeleteThemeModal";
import { createMinimalMap } from "../../map/bootstrap";
import type {
  MinimalMapInstance,
  RawMapConfig,
  MapRuntimeConfig,
  StyleThemeSlot,
} from "../../types";
import { COLOR_GROUPS, SLOT_LABELS } from "./constants";

interface StylesViewProps {
  controller: StylesController;
  runtimeConfig: MapRuntimeConfig;
}

const ALL_COLOR_SLOTS: StyleThemeSlot[] = Array.from(
  new Set(COLOR_GROUPS.flatMap((group) => group.slots)),
);

function buildMixedGradient(colors: string[]): string {
  const uniqueColors = Array.from(new Set(colors));

  if (uniqueColors.length <= 1) {
    return uniqueColors[0] || "#000000";
  }

  const stops = uniqueColors.map((currentColor, index) => {
    const stop = uniqueColors.length === 1
      ? 0
      : Math.round((index / (uniqueColors.length - 1)) * 100);

    return `${currentColor} ${stop}%`;
  });

  return `linear-gradient(135deg, ${stops.join(", ")})`;
}

export default function StylesView({
  controller,
  runtimeConfig,
}: StylesViewProps) {
  const {
    isLoading,
    draftColors,
    setDraftColor,
    activeTheme,
    actionNotice,
    isCreateModalOpen,
    isDeleteModalOpen,
    closeCreateModal,
    closeDeleteModal,
    createTheme,
    deleteTheme,
  } = controller;
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MinimalMapInstance | null>(null);
  const skipSelectionResetRef = useRef(false);
  const [selectedSlots, setSelectedSlots] = useState<StyleThemeSlot[]>([]);

  const mapConfig = useMemo<RawMapConfig>(
    () => ({
      centerLat: 52.517,
      centerLng: 13.388,
      zoom: 12,
      height: 100,
      heightUnit: "%",
      stylePreset: activeTheme?.basePreset || "positron",
      styleTheme: draftColors || {},
      interactive: true,
      scrollZoom: true,
      showAttribution: true,
    }),
    [activeTheme?.basePreset, draftColors],
  );

  useEffect(() => {
    if (skipSelectionResetRef.current) {
      skipSelectionResetRef.current = false;
      return;
    }

    setSelectedSlots([]);
  }, [activeTheme?.slug, draftColors]);

  const applyColorToSlots = (slots: StyleThemeSlot[], color: string) => {
    if (slots.length === 0) {
      return;
    }

    skipSelectionResetRef.current = true;

    slots.forEach((slot) => {
      setDraftColor(slot, color);
    });
  };

  const toggleSlotSelection = (slot: StyleThemeSlot, checked: boolean) => {
    setSelectedSlots((currentSlots) => {
      if (checked) {
        return currentSlots.includes(slot)
          ? currentSlots
          : [ ...currentSlots, slot ];
      }

      return currentSlots.filter((currentSlot) => currentSlot !== slot);
    });
  };

  const allSlotsSelected = selectedSlots.length === ALL_COLOR_SLOTS.length;
  const hasSelectedSlots = selectedSlots.length > 0;
  const selectedColors = selectedSlots.map((slot) => draftColors?.[slot] || "#000000");
  const firstSelectedColor = selectedColors[0] || "#000000";
  const uniqueSelectedColors = Array.from(new Set(selectedColors));
  const hasMixedSelectedColors = uniqueSelectedColors.length > 1;
  const multiEditColor = hasMixedSelectedColors
    ? firstSelectedColor
    : selectedColors[0] || "#000000";
  const mixedSelectedGradient = buildMixedGradient(uniqueSelectedColors);

  useEffect(() => {
    if (!mapHostRef.current || !activeTheme) {
      return undefined;
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = createMinimalMap(mapHostRef.current, mapConfig, {
        ...runtimeConfig,
        autoFetchLocations: false,
      });
    } else {
      mapInstanceRef.current.update(mapConfig);
    }

    return () => {
      // We don't destroy on every re-render to keep it live
    };
  }, [activeTheme, mapConfig, runtimeConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="minimal-map-styles__loading">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="minimal-map-styles" style={{ position: "relative" }}>
      {actionNotice ? (
        <Notice
          status={actionNotice.status}
          onRemove={controller.dismissActionNotice}
        >
          {actionNotice.message}
        </Notice>
      ) : null}
      <DropZone
        onFilesDrop={(files) => {
          void controller.onImportFiles(files as unknown as FileList);
        }}
        label={__(
          "Drop Minimal Map or MapLibre JSON theme files here to upload",
          "minimal-map",
        )}
      />
      <div className="minimal-map-styles__layout">
        <div className="minimal-map-styles__controls">
          <Card className="minimal-map-styles__group-card">
            <CardBody>
              <ColorControl
                label={__("Select all colors", "minimal-map")}
                color={multiEditColor}
                mixed={hasSelectedSlots && hasMixedSelectedColors}
                mixedGradient={mixedSelectedGradient}
                disabled={!hasSelectedSlots}
                showCheckbox
                checked={allSlotsSelected}
                indeterminate={hasSelectedSlots && !allSlotsSelected}
                checkboxLabel={__("Select all colors", "minimal-map")}
                onCheckedChange={(checked) =>
                  setSelectedSlots(checked ? ALL_COLOR_SLOTS : [])
                }
                onChange={(color) => applyColorToSlots(selectedSlots, color)}
              />
            </CardBody>
          </Card>
          {COLOR_GROUPS.map((group) => (
            <Card key={group.label} className="minimal-map-styles__group-card">
              <CardBody>
                <h3 className="minimal-map-styles__group-title">
                  {group.label}
                </h3>
                <div className="minimal-map-styles__group-grid">
                  {group.slots.map((slot) => (
                    <ColorControl
                      key={slot}
                      label={SLOT_LABELS[slot]}
                      color={draftColors?.[slot] || "#000000"}
                      showCheckbox
                      checked={selectedSlots.includes(slot)}
                      checkboxLabel={SLOT_LABELS[slot]}
                      onCheckedChange={(checked) =>
                        toggleSlotSelection(slot, checked)
                      }
                      onChange={(color) => {
                        if (selectedSlots.includes(slot)) {
                          applyColorToSlots(selectedSlots, color);
                          return;
                        }

                        applyColorToSlots([ slot ], color);
                      }}
                    />
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
        <div className="minimal-map-styles__preview">
          <div className="minimal-map-styles__preview-sticky">
            <Card className="minimal-map-styles__preview-card">
              <CardBody>
                <div
                  ref={mapHostRef}
                  className="minimal-map-styles__preview-surface"
                />
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      <CreateThemeModal
        isOpen={isCreateModalOpen}
        onRequestClose={closeCreateModal}
        onCreate={createTheme}
      />

      <DeleteThemeModal
        isOpen={isDeleteModalOpen}
        onRequestClose={closeDeleteModal}
        onDelete={deleteTheme}
        theme={activeTheme}
      />
    </div>
  );
}

import {
  __experimentalColorGradientControl as ColorGradientControl,
  InspectorControls,
  __experimentalBorderRadiusControl as BorderRadiusControl,
  useBlockProps,
} from "@wordpress/block-editor";
import {
  Button,
  BoxControl,
  ColorIndicator,
  Dropdown,
  FormTokenField,
  FlexItem,
  PanelBody,
  RangeControl,
  TextareaControl,
  TextControl,
  ToggleControl,
  MenuGroup,
  MenuItem,
  __experimentalDropdownContentWrapper as DropdownContentWrapper,
  __experimentalHStack as HStack,
  __experimentalToggleGroupControl as ToggleGroupControl,
  __experimentalToggleGroupControlOptionIcon as ToggleGroupControlOptionIcon,
  __experimentalUnitControl as UnitControl,
} from "@wordpress/components";
import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { CheckIcon, ChevronDownIcon, MapPinnedIcon } from "../components/Icons";
import OptionDropdown from "./OptionDropdown";
import { collectLocationTags } from "../map/category-filter";
import { buildIframeSnippet } from "./embed";
import { createMinimalMap } from "../map/bootstrap";
import { normalizeHeightUnit, normalizeMapConfig } from "../map/defaults";
import { getActiveHeightCssValue } from "../map/responsive";
import {
  type ZoomControlIconOption,
  ZOOM_CONTROLS_POSITION_OPTIONS,
} from "../map/zoom-control-options";
import { getStyleOptions } from "../map/style-presets";
import type {
  BoxValue,
  MapBlockAttributes,
  MapCollectionOption,
  MapLocationTag,
  MapRuntimeConfig,
  MinimalMapInstance,
  RawMapConfig,
  StyleOption,
  StyleThemeRecord,
  ZoomControlsPosition,
} from "../types";

const runtimeConfig: MapRuntimeConfig = window.MinimalMapBlockConfig ?? {};
const HEIGHT_UNITS: StyleOption[] = (
  runtimeConfig.heightUnits ?? ["px", "em", "rem", "%", "vh", "vw"]
).map((value) => ({
  label: value,
  value,
}));
const BORDER_UNITS: StyleOption[] = ["px", "em", "rem"].map((value) => ({
  label: value,
  value,
}));
const BOX_CONTROL_INPUT_PROPS = { min: 0, max: 50 };
const BORDER_RADIUS_RANGE_MAX = 50;

function mapTagNamesToIds(
  tokenNames: Array<string | { value?: string }>,
  tags: MapLocationTag[],
): number[] {
  const tagIdsByName = new Map(tags.map((tag) => [tag.name, tag.id]));

  return Array.from(
    new Set(
      tokenNames
        .map((token) => (typeof token === "string" ? token : token.value ?? ""))
        .map((name) => tagIdsByName.get(name))
        .filter((tagId): tagId is number => typeof tagId === "number"),
    ),
  );
}

function clampRangeInputs(root: HTMLElement | null, max: number): void {
  if (!root) {
    return;
  }

  const maxValue = `${max}`;

  root
    .querySelectorAll<HTMLInputElement>('input[type="range"]')
    .forEach((input) => {
      input.max = maxValue;
      input.setAttribute("max", maxValue);
      input.setAttribute("aria-valuemax", maxValue);
    });
}

function parseHeightValue(
  rawValue: string | number | undefined,
  fallbackUnit: string,
): Pick<MapBlockAttributes, "height" | "heightUnit"> | null {
  if (typeof rawValue === "number") {
    return {
      height: rawValue,
      heightUnit: normalizeHeightUnit(fallbackUnit),
    };
  }

  if (typeof rawValue !== "string") {
    return null;
  }

  const match = rawValue.trim().match(/^(-?\d*\.?\d+)\s*([a-z%]*)$/i);

  if (!match) {
    return null;
  }

  return {
    height: Number(match[1]),
    heightUnit: normalizeHeightUnit(match[2] || fallbackUnit),
  };
}

function getHeightControlValue(
  height: number | undefined,
  unit: string | undefined,
): string | undefined {
  if (typeof height !== "number" || Number.isNaN(height)) {
    return undefined;
  }

  return `${height}${normalizeHeightUnit(unit)}`;
}

interface EditProps {
  attributes: MapBlockAttributes;
  setAttributes: (attributes: Partial<MapBlockAttributes>) => void;
}

interface BorderRadiusValues {
  topLeft?: string;
  topRight?: string;
  bottomRight?: string;
  bottomLeft?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

function parseLengthValue(
  rawValue: string | number | undefined,
  fallback = "1px",
): string | null {
  if (typeof rawValue === "number") {
    return `${rawValue}px`;
  }

  if (typeof rawValue !== "string") {
    return null;
  }

  const trimmed = rawValue.trim();
  const match = trimmed.match(/^(-?\d*\.?\d+)\s*([a-z%]*)$/i);

  if (!match) {
    return null;
  }

  if (trimmed === "0") {
    return "0px";
  }

  const unit = match[2] || fallback.replace(/^-?\d*\.?\d+/, "") || "px";

  return `${Number(match[1])}${normalizeHeightUnit(unit)}`;
}

function copyTextToClipboard(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard
      .writeText(value)
      .then(() => true)
      .catch(() => false);
  }

  const element = document.createElement("textarea");
  element.value = value;
  element.setAttribute("readonly", "readonly");
  element.style.position = "absolute";
  element.style.left = "-9999px";
  document.body.appendChild(element);
  element.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(element);

  return Promise.resolve(copied);
}

function stringifyBorderRadiusValue(
  value: string | BorderRadiusValues | null | undefined,
): string {
  if (!value) {
    return "2px";
  }

  if (typeof value === "string") {
    return value.trim() || "2px";
  }

  const topLeft = value.topLeft ?? value.top ?? "";
  const topRight = value.topRight ?? value.right ?? "";
  const bottomRight = value.bottomRight ?? value.bottom ?? "";
  const bottomLeft = value.bottomLeft ?? value.left ?? "";
  const values = [topLeft, topRight, bottomRight, bottomLeft].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );

  if (values.length === 0) {
    return "2px";
  }

  const [first, second = first, third = first, fourth = second] = values;

  if (first === second && second === third && third === fourth) {
    return first;
  }

  if (first === third && second === fourth) {
    return `${first} ${second}`;
  }

  if (second === fourth) {
    return `${first} ${second} ${third}`;
  }

  return `${first} ${second} ${third} ${fourth}`;
}

function parseBorderRadiusValue(
  value: string | BorderRadiusValues | null | undefined,
):
  | {
      topLeft: string;
      topRight: string;
      bottomRight: string;
      bottomLeft: string;
    }
  | string {
  if (!value) {
    return "2px";
  }

  if (typeof value !== "string") {
    const topLeft = value.topLeft ?? value.top ?? "2px";
    const topRight = value.topRight ?? value.right ?? topLeft;
    const bottomRight = value.bottomRight ?? value.bottom ?? topLeft;
    const bottomLeft = value.bottomLeft ?? value.left ?? topRight;

    return {
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    };
  }

  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "2px";
  }

  const [topLeft, second = topLeft, third = topLeft, fourth = second] = parts;

  if (parts.length === 1) {
    return topLeft;
  }

  if (parts.length === 2) {
    return {
      topLeft,
      topRight: second,
      bottomRight: topLeft,
      bottomLeft: second,
    };
  }

  if (parts.length === 3) {
    return {
      topLeft,
      topRight: second,
      bottomRight: third,
      bottomLeft: second,
    };
  }

  return {
    topLeft,
    topRight: second,
    bottomRight: third,
    bottomLeft: fourth,
  };
}

function ZoomControlColorSettings({
  backgroundColor,
  iconColor,
  borderColor,
  defaultBackgroundColor,
  defaultIconColor,
  defaultBorderColor,
  onChange,
}: {
  backgroundColor: string;
  iconColor: string;
  borderColor: string;
  defaultBackgroundColor: string;
  defaultIconColor: string;
  defaultBorderColor: string;
  onChange: (
    key:
      | "zoomControlsBackgroundColor"
      | "zoomControlsIconColor"
      | "zoomControlsBorderColor",
    value: string,
  ) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
      <CompactColorDropdown
        label={__("Background", "minimal-map")}
        value={backgroundColor}
        defaultValue={defaultBackgroundColor}
        onChange={(value) => onChange("zoomControlsBackgroundColor", value)}
      />
      <CompactColorDropdown
        label={__("Foreground", "minimal-map")}
        value={iconColor}
        defaultValue={defaultIconColor}
        onChange={(value) => onChange("zoomControlsIconColor", value)}
      />
      <CompactColorDropdown
        label={__("Border", "minimal-map")}
        value={borderColor}
        defaultValue={defaultBorderColor}
        onChange={(value) => onChange("zoomControlsBorderColor", value)}
      />
    </div>
  );
}

function CreditsColorSettings({
  backgroundColor,
  foregroundColor,
  defaultBackgroundColor,
  defaultForegroundColor,
  onChange,
}: {
  backgroundColor: string;
  foregroundColor: string;
  defaultBackgroundColor: string;
  defaultForegroundColor: string;
  onChange: (
    key: "creditsBackgroundColor" | "creditsForegroundColor",
    value: string,
  ) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
      <CompactColorDropdown
        label={__("Background", "minimal-map")}
        value={backgroundColor}
        defaultValue={defaultBackgroundColor}
        onChange={(value) => onChange("creditsBackgroundColor", value)}
      />
      <CompactColorDropdown
        label={__("Foreground", "minimal-map")}
        value={foregroundColor}
        defaultValue={defaultForegroundColor}
        onChange={(value) => onChange("creditsForegroundColor", value)}
      />
    </div>
  );
}

function SearchPanelColorSettings({
  backgroundPrimary,
  backgroundSecondary,
  backgroundHover,
  foregroundPrimary,
  foregroundSecondary,
  defaults,
  onChange,
}: {
  backgroundPrimary: string;
  backgroundSecondary: string;
  backgroundHover: string;
  foregroundPrimary: string;
  foregroundSecondary: string;
  defaults: {
    backgroundPrimary: string;
    backgroundSecondary: string;
    backgroundHover: string;
    foregroundPrimary: string;
    foregroundSecondary: string;
  };
  onChange: (
    key:
      | "searchPanelBackgroundPrimary"
      | "searchPanelBackgroundSecondary"
      | "searchPanelBackgroundHover"
      | "searchPanelForegroundPrimary"
      | "searchPanelForegroundSecondary",
    value: string,
  ) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
      <CompactColorDropdown
        label={__("Background Primary", "minimal-map")}
        value={backgroundPrimary}
        defaultValue={defaults.backgroundPrimary}
        onChange={(value) => onChange("searchPanelBackgroundPrimary", value)}
      />
      <CompactColorDropdown
        label={__("Background Secondary", "minimal-map")}
        value={backgroundSecondary}
        defaultValue={defaults.backgroundSecondary}
        onChange={(value) => onChange("searchPanelBackgroundSecondary", value)}
      />
      <CompactColorDropdown
        label={__("Background Hover", "minimal-map")}
        value={backgroundHover}
        defaultValue={defaults.backgroundHover}
        onChange={(value) => onChange("searchPanelBackgroundHover", value)}
      />
      <CompactColorDropdown
        label={__("Foreground Primary", "minimal-map")}
        value={foregroundPrimary}
        defaultValue={defaults.foregroundPrimary}
        onChange={(value) => onChange("searchPanelForegroundPrimary", value)}
      />
      <CompactColorDropdown
        label={__("Foreground Secondary", "minimal-map")}
        value={foregroundSecondary}
        defaultValue={defaults.foregroundSecondary}
        onChange={(value) => onChange("searchPanelForegroundSecondary", value)}
      />
    </div>
  );
}

function GoogleMapsButtonColorSettings({
  backgroundColor,
  foregroundColor,
  defaultBackgroundColor,
  defaultForegroundColor,
  onChange,
}: {
  backgroundColor: string;
  foregroundColor: string;
  defaultBackgroundColor: string;
  defaultForegroundColor: string;
  onChange: (
    key: "googleMapsButtonBackgroundColor" | "googleMapsButtonForegroundColor",
    value: string,
  ) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
      <CompactColorDropdown
        label={__("Background", "minimal-map")}
        value={backgroundColor}
        defaultValue={defaultBackgroundColor}
        onChange={(value) => onChange("googleMapsButtonBackgroundColor", value)}
      />
      <CompactColorDropdown
        label={__("Foreground", "minimal-map")}
        value={foregroundColor}
        defaultValue={defaultForegroundColor}
        onChange={(value) => onChange("googleMapsButtonForegroundColor", value)}
      />
    </div>
  );
}

function OpeningHoursColorSettings({
  openColor,
  closedColor,
  soonColor,
  defaultOpenColor,
  defaultClosedColor,
  defaultSoonColor,
  onChange,
}: {
  openColor: string;
  closedColor: string;
  soonColor: string;
  defaultOpenColor: string;
  defaultClosedColor: string;
  defaultSoonColor: string;
  onChange: (
    key:
      | "openingHoursOpenColor"
      | "openingHoursClosedColor"
      | "openingHoursSoonColor",
    value: string,
  ) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
      <CompactColorDropdown
        label={__("Open", "minimal-map")}
        value={openColor}
        defaultValue={defaultOpenColor}
        onChange={(value) => onChange("openingHoursOpenColor", value)}
      />
      <CompactColorDropdown
        label={__("Closed", "minimal-map")}
        value={closedColor}
        defaultValue={defaultClosedColor}
        onChange={(value) => onChange("openingHoursClosedColor", value)}
      />
      <CompactColorDropdown
        label={__("Soon", "minimal-map")}
        value={soonColor}
        defaultValue={defaultSoonColor}
        onChange={(value) => onChange("openingHoursSoonColor", value)}
      />
    </div>
  );
}

function ClusterColorSettings({
  backgroundColor,
  foregroundColor,
  defaultBackgroundColor,
  defaultForegroundColor,
  onChange,
}: {
  backgroundColor: string;
  foregroundColor: string;
  defaultBackgroundColor: string;
  defaultForegroundColor: string;
  onChange: (
    key: "clusterBackgroundColor" | "clusterForegroundColor",
    value: string,
  ) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
      <CompactColorDropdown
        label={__("Background", "minimal-map")}
        value={backgroundColor}
        defaultValue={defaultBackgroundColor}
        onChange={(value) => onChange("clusterBackgroundColor", value)}
      />
      <CompactColorDropdown
        label={__("Foreground", "minimal-map")}
        value={foregroundColor}
        defaultValue={defaultForegroundColor}
        onChange={(value) => onChange("clusterForegroundColor", value)}
      />
    </div>
  );
}

function CompactColorDropdown({
  label,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <Dropdown
      className="minimal-map-editor__compact-color-dropdown"
      popoverProps={{
        placement: "left-start",
        offset: 36,
        shift: true,
      }}
      renderToggle={({ isOpen, onToggle }) => (
        <Button
          __next40pxDefaultSize
          variant="tertiary"
          onClick={onToggle}
          aria-expanded={isOpen}
          style={{
            width: "100%",
            justifyContent: "flex-start",
            paddingInline: "12px",
            color: "var(--wp-components-color-foreground, #1e1e1e)",
          }}
        >
          <HStack justify="flex-start" spacing={3}>
            <ColorIndicator colorValue={value} />
            <FlexItem title={label}>{label}</FlexItem>
          </HStack>
        </Button>
      )}
      renderContent={() => (
        <DropdownContentWrapper>
          <div style={{ width: "280px", maxWidth: "min(280px, 100vw - 32px)" }}>
            <ColorGradientControl
              label={label}
              showTitle={false}
              clearable={false}
              enableAlpha={false}
              onColorChange={(nextValue?: string) =>
                onChange(
                  typeof nextValue === "string" && nextValue.length > 0
                    ? nextValue
                    : defaultValue,
                )
              }
              colorValue={value}
            />
          </div>
        </DropdownContentWrapper>
      )}
    />
  );
}

function ThemeDropdown({
  themes,
  selectedSlug,
  onChange,
}: {
  themes: StyleThemeRecord[];
  selectedSlug: string;
  onChange: (value: string) => void;
}) {
  return (
    <OptionDropdown
      className="minimal-map-editor__theme-dropdown"
      emptyLabel={__("Default", "minimal-map")}
      groupLabel={__("Switch Theme", "minimal-map")}
      label={__("Style Theme", "minimal-map")}
      onChange={onChange}
      options={themes.map((theme) => ({
        label: theme.label,
        value: theme.slug,
      }))}
      selectedValue={selectedSlug}
    />
  );
}

function StylePresetDropdown({
  options,
  selectedValue,
  onChange,
}: {
  options: StyleOption[];
  selectedValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <OptionDropdown
      className="minimal-map-editor__style-preset-dropdown"
      emptyLabel={__("Select style preset", "minimal-map")}
      groupLabel={__("Switch Style Preset", "minimal-map")}
      label={__("Style Preset", "minimal-map")}
      onChange={onChange}
      options={options}
      selectedValue={selectedValue}
    />
  );
}

function CollectionDropdown({
  options,
  selectedId,
  onChange,
}: {
  options: MapCollectionOption[];
  selectedId: number;
  onChange: (value: number) => void;
}) {
  const selectedCollection = options.find((option) => option.id === selectedId);
  const selectedLabel =
    selectedId > 0
      ? selectedCollection?.title || __("Collection unavailable", "minimal-map")
      : __("All locations", "minimal-map");

  return (
    <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
      <span>{__("Collection", "minimal-map")}</span>
      <Dropdown
        className="minimal-map-editor__collection-dropdown"
        popoverProps={{
          placement: "left-start",
          offset: 36,
          shift: true,
        }}
        renderToggle={({ isOpen, onToggle }) => (
          <Button
            __next40pxDefaultSize
            className="minimal-map-editor__dropdown-toggle"
            variant="tertiary"
            onClick={onToggle}
            aria-expanded={isOpen}
            style={{
              width: "100%",
              justifyContent: "space-between",
              paddingInline: "12px",
            }}
          >
            <span>{selectedLabel}</span>
            <ChevronDownIcon size={16} style={{ flexShrink: 0 }} />
          </Button>
        )}
        renderContent={({ onClose }) => (
          <MenuGroup label={__("Switch Collection", "minimal-map")}>
            <MenuItem
              onClick={() => {
                onChange(0);
                onClose();
              }}
            >
              <HStack justify="space-between" style={{ width: "100%" }}>
                <span>{__("All locations", "minimal-map")}</span>
                {selectedId === 0 && (
                  <CheckIcon
                    size={16}
                    style={{
                      flexShrink: 0,
                      color: "var(--wp-admin-theme-color, #3858e8)",
                    }}
                  />
                )}
              </HStack>
            </MenuItem>
            {options.map((option) => {
              const isSelected = selectedId === option.id;
              return (
                <MenuItem
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    onClose();
                  }}
                >
                  <HStack justify="space-between" style={{ width: "100%" }}>
                    <span>{option.title}</span>
                    {isSelected && (
                      <CheckIcon
                        size={16}
                        style={{
                          flexShrink: 0,
                          color: "var(--wp-admin-theme-color, #3858e8)",
                        }}
                      />
                    )}
                  </HStack>
                </MenuItem>
              );
            })}
            {options.length === 0 ? (
              <div
                style={{
                  padding: "8px 12px",
                  color: "#757575",
                  fontSize: "12px",
                }}
              >
                {__("No collections available.", "minimal-map")}
              </div>
            ) : null}
          </MenuGroup>
        )}
      />
    </div>
  );
}

function SelectedTagsControl({
  allTags,
  selectedTagIds,
  suggestionTags,
  onChange,
}: {
  allTags: MapLocationTag[];
  selectedTagIds: number[];
  suggestionTags: MapLocationTag[];
  onChange: (value: number[]) => void;
}) {
  const currentTagNames = selectedTagIds
    .map((id) => allTags.find((tag) => tag.id === id)?.name)
    .filter(
      (name): name is string => typeof name === "string" && name.length > 0,
    );

  return (
    <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
      <FormTokenField
        label={__("Tags", "minimal-map")}
        value={currentTagNames}
        suggestions={suggestionTags.map((tag) => tag.name)}
        onChange={(tokenNames) =>
          onChange(mapTagNamesToIds(tokenNames, allTags))
        }
        __next40pxDefaultSize
      />
    </div>
  );
}

export default function Edit({ attributes, setAttributes }: EditProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MinimalMapInstance | null>(null);
  const zoomControlsRadiusRef = useRef<HTMLDivElement | null>(null);
  const searchPanelInputRadiusRef = useRef<HTMLDivElement | null>(null);
  const searchPanelCardRadiusRef = useRef<HTMLDivElement | null>(null);
  const googleMapsButtonRadiusRef = useRef<HTMLDivElement | null>(null);
  const creditsRadiusRef = useRef<HTMLDivElement | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const styleOptions = useMemo(
    () => getStyleOptions(runtimeConfig.stylePresets),
    [],
  );
  const allKnownTags = useMemo(
    () =>
      collectLocationTags([
        ...(runtimeConfig.locations ?? []),
        ...(runtimeConfig.collections ?? []).flatMap(
          (collection) => collection.locations ?? [],
        ),
      ]),
    [],
  );
  const selectedCollection = useMemo(
    () =>
      attributes.collectionId > 0
        ? (runtimeConfig.collections ?? []).find(
            (collection) => collection.id === attributes.collectionId,
          ) ?? null
        : null,
    [attributes.collectionId],
  );
  const selectableTags = useMemo(
    () =>
      collectLocationTags(
        attributes.collectionId > 0
          ? selectedCollection?.locations ?? []
          : runtimeConfig.locations ?? [],
      ),
    [attributes.collectionId, selectedCollection],
  );
  const effectiveFontFamily =
    typeof attributes.fontFamily === "string" &&
    attributes.fontFamily.trim() !== ""
      ? attributes.fontFamily
      : runtimeConfig.defaults?.fontFamily ?? "";
  const effectiveAttributes = useMemo(
    () => ({
      ...attributes,
      fontFamily: effectiveFontFamily,
    }),
    [attributes, effectiveFontFamily],
  );
  const config = useMemo(
    () =>
      normalizeMapConfig(
        {
          ...effectiveAttributes,
          locations:
            effectiveAttributes.collectionId > 0
              ? selectedCollection?.locations ?? []
              : undefined,
        },
        runtimeConfig,
      ),
    [effectiveAttributes, selectedCollection],
  );
  const [previewHeightCssValue, setPreviewHeightCssValue] = useState(() =>
    getActiveHeightCssValue(
      config,
      typeof window !== "undefined" ? window.innerWidth : undefined,
    ),
  );
  const iframeSnippet = useMemo(
    () => buildIframeSnippet(effectiveAttributes, runtimeConfig),
    [effectiveAttributes],
  );
  const blockProps = useBlockProps({ className: "minimal-map-editor" });
  const canEnableLiveLocationSearch = attributes.allowSearch;
  const canEnableLiveLocationMap =
    attributes.allowSearch && attributes.showZoomControls;

  useEffect(() => {
    if (!mapRef.current) {
      return undefined;
    }

    mapInstanceRef.current = createMinimalMap(
      mapRef.current,
      config,
      runtimeConfig,
    );

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    mapInstanceRef.current?.update(config);
  }, [config]);

  useEffect(() => {
    const nextHeightCssValue = getActiveHeightCssValue(
      config,
      typeof window !== "undefined" ? window.innerWidth : undefined,
    );

    setPreviewHeightCssValue((currentValue) =>
      currentValue === nextHeightCssValue ? currentValue : nextHeightCssValue,
    );
  }, [config]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncPreviewHeight = (): void => {
      const nextHeightCssValue = getActiveHeightCssValue(
        config,
        window.innerWidth,
      );

      setPreviewHeightCssValue((currentValue) =>
        currentValue === nextHeightCssValue ? currentValue : nextHeightCssValue,
      );
    };

    window.addEventListener("resize", syncPreviewHeight);

    return () => {
      window.removeEventListener("resize", syncPreviewHeight);
    };
  }, [config]);

  useEffect(() => {
    const targets = [
      zoomControlsRadiusRef.current,
      searchPanelInputRadiusRef.current,
      searchPanelCardRadiusRef.current,
      googleMapsButtonRadiusRef.current,
      creditsRadiusRef.current,
    ];
    const observers = targets
      .filter((target): target is HTMLDivElement => target !== null)
      .map((target) => {
        clampRangeInputs(target, BORDER_RADIUS_RANGE_MAX);

        const observer = new MutationObserver(() => {
          clampRangeInputs(target, BORDER_RADIUS_RANGE_MAX);
        });

        observer.observe(target, {
          childList: true,
          subtree: true,
        });

        return observer;
      });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  useEffect(() => {
    if (copyState === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState("idle");
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyState, iframeSnippet]);

  function updateNumberAttribute<
    Key extends keyof Pick<
      MapBlockAttributes,
      "centerLat" | "centerLng" | "zoom"
    >,
  >(key: Key) {
    return (value: string): void => {
      const numericValue = Number(value);

      if (Number.isNaN(numericValue)) {
        return;
      }

      setAttributes({
        [key]: numericValue,
      } as Pick<MapBlockAttributes, Key>);
    };
  }

  const updateHeight = (value?: string | number): void => {
    const parsed = parseHeightValue(value, attributes.heightUnit || "px");

    if (!parsed || Number.isNaN(parsed.height) || parsed.height <= 0) {
      return;
    }

    setAttributes({
      height: parsed.height,
      heightUnit: parsed.heightUnit,
    });
  };

  const updateHeightMobile = (value?: string | number): void => {
    if (
      typeof value === "undefined" ||
      (typeof value === "string" && value.trim() === "")
    ) {
      setAttributes({
        heightMobile: undefined,
        heightMobileUnit: undefined,
      });
      return;
    }

    const parsed = parseHeightValue(
      value,
      attributes.heightMobileUnit || attributes.heightUnit || "px",
    );

    if (!parsed || Number.isNaN(parsed.height) || parsed.height <= 0) {
      return;
    }

    setAttributes({
      heightMobile: parsed.height,
      heightMobileUnit: parsed.heightUnit,
    });
  };

  const updateZoom = (value?: number): void => {
    if (typeof value === "number") {
      setAttributes({ zoom: value });
    }
  };

  const updateBorderWidth = (value?: string | number): void => {
    const parsed = parseLengthValue(
      value,
      attributes.zoomControlsBorderWidth || "1px",
    );

    if (parsed) {
      setAttributes({ zoomControlsBorderWidth: parsed });
    }
  };

  const updateSearchPanelCardGap = (value?: string | number): void => {
    const parsed = parseLengthValue(
      value,
      attributes.searchPanelCardGap || "12px",
    );

    if (parsed) {
      setAttributes({ searchPanelCardGap: parsed });
    }
  };

  const updateSearchPanelWidth = (value?: string | number): void => {
    const parsed = parseLengthValue(
      value,
      attributes.searchPanelWidth || "320px",
    );

    if (parsed) {
      setAttributes({ searchPanelWidth: parsed });
    }
  };

  const copyIframeSnippet = (): void => {
    if (!iframeSnippet) {
      return;
    }

    void copyTextToClipboard(iframeSnippet).then((copied) => {
      setCopyState(copied ? "copied" : "error");
    });
  };

  if (attributes._isPreview) {
    return (
      <div
        {...useBlockProps({
          className: "minimal-map-editor__preview minimal-map-editor--preview",
          style: {
            backgroundImage: runtimeConfig.previewImageUrl
              ? `url(${runtimeConfig.previewImageUrl})`
              : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f0f0f1",
            color: "#757575",
            fontSize: "13px",
          },
        })}
      >
        {!runtimeConfig.previewImageUrl && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <MapPinnedIcon
              size={48}
              style={{ marginBottom: "12px", opacity: 0.5 }}
            />
            <p style={{ margin: 0 }}>
              {__("Minimal Map Preview", "minimal-map")}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <InspectorControls group="settings">
        <PanelBody title={__("Data", "minimal-map")} initialOpen={false}>
          <CollectionDropdown
            options={runtimeConfig.collections ?? []}
            selectedId={attributes.collectionId}
            onChange={(value) => setAttributes({ collectionId: value })}
          />
          <SelectedTagsControl
            allTags={allKnownTags}
            selectedTagIds={attributes.selectedTagIds}
            suggestionTags={selectableTags}
            onChange={(value) => setAttributes({ selectedTagIds: value })}
          />
        </PanelBody>
        <PanelBody title={__("Frame", "minimal-map")} initialOpen={false}>
          <TextControl
            label={__("Center Latitude", "minimal-map")}
            type="number"
            step="0.000001"
            value={attributes.centerLat}
            onChange={updateNumberAttribute("centerLat")}
          />
          <TextControl
            label={__("Center Longitude", "minimal-map")}
            type="number"
            step="0.000001"
            value={attributes.centerLng}
            onChange={updateNumberAttribute("centerLng")}
          />
          <RangeControl
            label={__("Zoom Level", "minimal-map")}
            value={attributes.zoom}
            onChange={updateZoom}
            min={0}
            max={22}
            step={0.5}
          />
        </PanelBody>
        <PanelBody title={__("Features", "minimal-map")} initialOpen={false}>
          <ToggleControl
            label={__("Show Zoom Controls", "minimal-map")}
            checked={attributes.showZoomControls}
            onChange={(value: boolean) =>
              setAttributes({ showZoomControls: value })
            }
          />
          <ToggleControl
            label={__("Allow Zoom via Scroll", "minimal-map")}
            checked={attributes.scrollZoom}
            onChange={(value: boolean) => setAttributes({ scrollZoom: value })}
          />
          <ToggleControl
            label={__("Allow Two-Finger Zoom", "minimal-map")}
            checked={attributes.mobileTwoFingerZoom}
            help={__(
              "When enabled, one can zoom the map using two fingers on mobile devices.",
              "minimal-map",
            )}
            onChange={(value: boolean) =>
              setAttributes({ mobileTwoFingerZoom: value })
            }
          />
          <ToggleControl
            label={__("Require Two Fingers to Move", "minimal-map")}
            help={__(
              "When enabled, one finger scrolls the page, while two fingers are required to move the map.",
              "minimal-map",
            )}
            checked={attributes.cooperativeGestures}
            onChange={(value: boolean) =>
              setAttributes({ cooperativeGestures: value })
            }
          />
          <ToggleControl
            label={__("Allow Search", "minimal-map")}
            checked={attributes.allowSearch}
            onChange={(value: boolean) => setAttributes({ allowSearch: value })}
          />
          <ToggleControl
            label={__("Enable Live Location Search", "minimal-map")}
            checked={attributes.enableLiveLocationSearch}
            disabled={!canEnableLiveLocationSearch}
            help={
              canEnableLiveLocationSearch
                ? undefined
                : __(
                    "Enable search first to use the live location result card.",
                    "minimal-map",
                  )
            }
            onChange={(value: boolean) =>
              setAttributes({ enableLiveLocationSearch: value })
            }
          />
          <ToggleControl
            label={__("Enable Live Location Map", "minimal-map")}
            checked={attributes.enableLiveLocationMap}
            disabled={!canEnableLiveLocationMap}
            help={
              canEnableLiveLocationMap
                ? undefined
                : __(
                    "Enable search and zoom controls first to use the live location map button.",
                    "minimal-map",
                  )
            }
            onChange={(value: boolean) =>
              setAttributes({ enableLiveLocationMap: value })
            }
          />
          <ToggleControl
            label={__("Enable Tags Filter", "minimal-map")}
            checked={attributes.enableCategoryFilter}
            onChange={(value: boolean) =>
              setAttributes({ enableCategoryFilter: value })
            }
          />
          <ToggleControl
            label={__("Enable Opened Quick Filter", "minimal-map")}
            checked={attributes.enableOpenedFilter}
            onChange={(value: boolean) =>
              setAttributes({ enableOpenedFilter: value })
            }
          />
          <ToggleControl
            label={__("Enable Marker Clustering", "minimal-map")}
            checked={attributes.enableMarkerClustering}
            onChange={(value: boolean) =>
              setAttributes({ enableMarkerClustering: value })
            }
          />
          <ToggleControl
            label={__("Google Maps Navigation", "minimal-map")}
            checked={attributes.googleMapsNavigation}
            onChange={(value: boolean) =>
              setAttributes({ googleMapsNavigation: value })
            }
          />
          <ToggleControl
            label={__("In-map Location Card", "minimal-map")}
            checked={attributes.inMapLocationCard}
            onChange={(value: boolean) =>
              setAttributes({ inMapLocationCard: value })
            }
          />
        </PanelBody>
        <PanelBody title={__("Embed", "minimal-map")} initialOpen={false}>
          <TextControl
            label={__("Iframe Font Family", "minimal-map")}
            value={effectiveFontFamily}
            help={__(
              "Iframes cannot inherit the font family from the parent page automatically. Paste a CSS font-family stack here to match it, or clear the field to use the WordPress theme default.",
              "minimal-map",
            )}
            onChange={(value: string) => setAttributes({ fontFamily: value })}
          />
          <TextareaControl
            label={__("Iframe Snippet", "minimal-map")}
            value={iframeSnippet}
            readOnly
            rows={6}
            help={__(
              "The snippet updates automatically when this block configuration changes.",
              "minimal-map",
            )}
            onChange={() => {}}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <Button
              __next40pxDefaultSize
              variant="secondary"
              onClick={copyIframeSnippet}
              disabled={!iframeSnippet}
            >
              {__("Copy Snippet", "minimal-map")}
            </Button>
            {copyState === "copied" ? (
              <span>{__("Copied", "minimal-map")}</span>
            ) : null}
            {copyState === "error" ? (
              <span>{__("Copy failed", "minimal-map")}</span>
            ) : null}
          </div>
        </PanelBody>
      </InspectorControls>
      <InspectorControls group="styles">
        <PanelBody title={__("Appearance", "minimal-map")} initialOpen={false}>
          <ThemeDropdown
            themes={runtimeConfig.styleThemes ?? []}
            selectedSlug={attributes.styleThemeSlug}
            onChange={(value) => setAttributes({ styleThemeSlug: value })}
          />
          <StylePresetDropdown
            options={styleOptions}
            selectedValue={attributes.stylePreset}
            onChange={(value) => setAttributes({ stylePreset: value })}
          />
          <UnitControl
            className="minimal-map-editor__height-control components-border-radius-control__unit-control"
            label={__("Height", "minimal-map")}
            value={getHeightControlValue(
              attributes.height ?? 420,
              attributes.heightUnit || "px",
            )}
            onChange={updateHeight}
            units={HEIGHT_UNITS}
            size="__unstable-large"
          />
          <UnitControl
            className="minimal-map-editor__height-control components-border-radius-control__unit-control"
            label={__("Height Mobile", "minimal-map")}
            value={getHeightControlValue(
              attributes.heightMobile,
              attributes.heightMobileUnit || attributes.heightUnit || "px",
            )}
            onChange={updateHeightMobile}
            units={HEIGHT_UNITS}
            size="__unstable-large"
          />
        </PanelBody>
        <PanelBody
          title={__("Zoom Controls", "minimal-map")}
          initialOpen={false}
        >
          <ZoomControlColorSettings
            backgroundColor={attributes.zoomControlsBackgroundColor}
            iconColor={attributes.zoomControlsIconColor}
            borderColor={attributes.zoomControlsBorderColor}
            defaultBackgroundColor={
              runtimeConfig.defaults?.zoomControlsBackgroundColor ?? "#ffffff"
            }
            defaultIconColor={
              runtimeConfig.defaults?.zoomControlsIconColor ?? "#1e1e1e"
            }
            defaultBorderColor={
              runtimeConfig.defaults?.zoomControlsBorderColor ?? "#dcdcde"
            }
            onChange={(key, value) => setAttributes({ [key]: value })}
          />
          <ToggleGroupControl
            __next40pxDefaultSize
            label={__("Position", "minimal-map")}
            value={attributes.zoomControlsPosition}
            isBlock
            onChange={(nextValue?: string | number) => {
              if (typeof nextValue === "string") {
                setAttributes({
                  zoomControlsPosition: nextValue as ZoomControlsPosition,
                });
              }
            }}
          >
            {ZOOM_CONTROLS_POSITION_OPTIONS.map((option) => (
              <ToggleGroupControlOptionIcon
                key={option.value}
                value={option.value}
                label={option.label}
                icon={option.icon}
              />
            ))}
          </ToggleGroupControl>
          <div className="minimal-map-editor__box-control">
            <BoxControl
              __next40pxDefaultSize
              label={__("Padding", "minimal-map")}
              values={attributes.zoomControlsPadding}
              units={HEIGHT_UNITS}
              inputProps={BOX_CONTROL_INPUT_PROPS}
              onChange={(value?: BoxValue) => {
                setAttributes({
                  zoomControlsPadding: value ?? attributes.zoomControlsPadding,
                });
              }}
            />
          </div>
          <div className="minimal-map-editor__box-control">
            <BoxControl
              __next40pxDefaultSize
              label={__("Outer Margin", "minimal-map")}
              values={attributes.zoomControlsOuterMargin}
              units={HEIGHT_UNITS}
              inputProps={BOX_CONTROL_INPUT_PROPS}
              onChange={(value?: BoxValue) => {
                setAttributes({
                  zoomControlsOuterMargin:
                    value ?? attributes.zoomControlsOuterMargin,
                });
              }}
            />
          </div>
          <div ref={zoomControlsRadiusRef}>
            <BorderRadiusControl
              onChange={(value: string | BorderRadiusValues) => {
                setAttributes({
                  zoomControlsBorderRadius: stringifyBorderRadiusValue(value),
                });
              }}
              values={parseBorderRadiusValue(
                attributes.zoomControlsBorderRadius,
              )}
            />
          </div>
          <UnitControl
            label={__("Border Width", "minimal-map")}
            value={attributes.zoomControlsBorderWidth}
            onChange={updateBorderWidth}
            units={BORDER_UNITS}
            size="__unstable-large"
          />
        </PanelBody>
        <PanelBody
          title={__("Search Panel", "minimal-map")}
          initialOpen={false}
        >
          <SearchPanelColorSettings
            backgroundPrimary={attributes.searchPanelBackgroundPrimary}
            backgroundSecondary={attributes.searchPanelBackgroundSecondary}
            backgroundHover={attributes.searchPanelBackgroundHover}
            foregroundPrimary={attributes.searchPanelForegroundPrimary}
            foregroundSecondary={attributes.searchPanelForegroundSecondary}
            defaults={{
              backgroundPrimary:
                runtimeConfig.defaults?.searchPanelBackgroundPrimary ??
                "#ffffff",
              backgroundSecondary:
                runtimeConfig.defaults?.searchPanelBackgroundSecondary ??
                "#f0f0f1",
              backgroundHover:
                runtimeConfig.defaults?.searchPanelBackgroundHover ?? "#f8f8f8",
              foregroundPrimary:
                runtimeConfig.defaults?.searchPanelForegroundPrimary ??
                "#1e1e1e",
              foregroundSecondary:
                runtimeConfig.defaults?.searchPanelForegroundSecondary ??
                "#1e1e1e",
            }}
            onChange={(key, value) => setAttributes({ [key]: value })}
          />
          <div className="minimal-map-editor__box-control">
            <BoxControl
              __next40pxDefaultSize
              label={__("Outer Margin", "minimal-map")}
              values={attributes.searchPanelOuterMargin}
              units={HEIGHT_UNITS}
              inputProps={BOX_CONTROL_INPUT_PROPS}
              onChange={(value?: BoxValue) => {
                setAttributes({
                  searchPanelOuterMargin:
                    value ?? attributes.searchPanelOuterMargin,
                });
              }}
            />
          </div>
          <div ref={searchPanelInputRadiusRef} style={{ marginBottom: "8px" }}>
            <BorderRadiusControl
              label={__("Border Radius Input", "minimal-map")}
              onChange={(value: string | BorderRadiusValues) => {
                setAttributes({
                  searchPanelBorderRadiusInput:
                    stringifyBorderRadiusValue(value),
                });
              }}
              values={parseBorderRadiusValue(
                attributes.searchPanelBorderRadiusInput || "10px",
              )}
            />
          </div>
          <div ref={searchPanelCardRadiusRef} style={{ marginBottom: "8px" }}>
            <BorderRadiusControl
              label={__("Border Radius Card", "minimal-map")}
              onChange={(value: string | BorderRadiusValues) => {
                setAttributes({
                  searchPanelBorderRadiusCard:
                    stringifyBorderRadiusValue(value),
                });
              }}
              values={parseBorderRadiusValue(
                attributes.searchPanelBorderRadiusCard,
              )}
            />
          </div>
          <UnitControl
            label={__("Card Gap", "minimal-map")}
            value={attributes.searchPanelCardGap}
            onChange={updateSearchPanelCardGap}
            units={HEIGHT_UNITS}
            size="__unstable-large"
          />
          <UnitControl
            label={__("Panel Width", "minimal-map")}
            value={attributes.searchPanelWidth}
            onChange={updateSearchPanelWidth}
            units={HEIGHT_UNITS}
            size="__unstable-large"
          />
        </PanelBody>
        <PanelBody title={__("Credits", "minimal-map")} initialOpen={false}>
          <CreditsColorSettings
            backgroundColor={attributes.creditsBackgroundColor}
            foregroundColor={attributes.creditsForegroundColor}
            defaultBackgroundColor={
              runtimeConfig.defaults?.creditsBackgroundColor ?? "#ffffff"
            }
            defaultForegroundColor={
              runtimeConfig.defaults?.creditsForegroundColor ?? "#1e1e1e"
            }
            onChange={(key, value) => setAttributes({ [key]: value })}
          />
          <div ref={creditsRadiusRef} style={{ marginBottom: "8px" }}>
            <BorderRadiusControl
              label={__("Border Radius", "minimal-map")}
              onChange={(value: string | BorderRadiusValues) => {
                setAttributes({
                  creditsBorderRadius: stringifyBorderRadiusValue(value),
                });
              }}
              values={parseBorderRadiusValue(attributes.creditsBorderRadius)}
            />
          </div>
          <div className="minimal-map-editor__box-control">
            <BoxControl
              __next40pxDefaultSize
              label={__("Padding", "minimal-map")}
              values={attributes.creditsPadding}
              units={HEIGHT_UNITS}
              inputProps={BOX_CONTROL_INPUT_PROPS}
              onChange={(value?: BoxValue) => {
                setAttributes({
                  creditsPadding: value ?? attributes.creditsPadding,
                });
              }}
            />
          </div>
          <div className="minimal-map-editor__box-control">
            <BoxControl
              __next40pxDefaultSize
              label={__("Outer Margin", "minimal-map")}
              values={attributes.creditsOuterMargin}
              units={HEIGHT_UNITS}
              inputProps={BOX_CONTROL_INPUT_PROPS}
              onChange={(value?: BoxValue) => {
                setAttributes({
                  creditsOuterMargin: value ?? attributes.creditsOuterMargin,
                });
              }}
            />
          </div>
        </PanelBody>
        <PanelBody
          title={__("Google Maps Button", "minimal-map")}
          initialOpen={false}
        >
          <GoogleMapsButtonColorSettings
            backgroundColor={attributes.googleMapsButtonBackgroundColor}
            foregroundColor={attributes.googleMapsButtonForegroundColor}
            defaultBackgroundColor={
              runtimeConfig.defaults?.googleMapsButtonBackgroundColor ??
              runtimeConfig.defaults?.searchPanelBackgroundSecondary ??
              "#f0f0f1"
            }
            defaultForegroundColor={
              runtimeConfig.defaults?.googleMapsButtonForegroundColor ??
              runtimeConfig.defaults?.searchPanelForegroundSecondary ??
              "#1e1e1e"
            }
            onChange={(key, value) => setAttributes({ [key]: value })}
          />
          <div ref={googleMapsButtonRadiusRef} style={{ marginBottom: "8px" }}>
            <BorderRadiusControl
              label={__("Border Radius", "minimal-map")}
              onChange={(value: string | BorderRadiusValues) => {
                setAttributes({
                  googleMapsButtonBorderRadius:
                    stringifyBorderRadiusValue(value),
                });
              }}
              values={parseBorderRadiusValue(
                attributes.googleMapsButtonBorderRadius,
              )}
            />
          </div>
          <div className="minimal-map-editor__box-control">
            <BoxControl
              __next40pxDefaultSize
              label={__("Padding", "minimal-map")}
              values={attributes.googleMapsButtonPadding}
              units={HEIGHT_UNITS}
              inputProps={BOX_CONTROL_INPUT_PROPS}
              onChange={(value?: BoxValue) => {
                setAttributes({
                  googleMapsButtonPadding:
                    value ?? attributes.googleMapsButtonPadding,
                });
              }}
            />
          </div>
          <ToggleControl
            label={__("Show icon", "minimal-map")}
            checked={attributes.googleMapsButtonShowIcon}
            onChange={(value: boolean) =>
              setAttributes({ googleMapsButtonShowIcon: value })
            }
          />
        </PanelBody>
        <PanelBody
          title={__("Opening Hours", "minimal-map")}
          initialOpen={false}
        >
          <OpeningHoursColorSettings
            openColor={attributes.openingHoursOpenColor}
            closedColor={attributes.openingHoursClosedColor}
            soonColor={attributes.openingHoursSoonColor}
            defaultOpenColor={
              runtimeConfig.defaults?.openingHoursOpenColor ?? "#1a7f37"
            }
            defaultClosedColor={
              runtimeConfig.defaults?.openingHoursClosedColor ?? "#b32d2e"
            }
            defaultSoonColor={
              runtimeConfig.defaults?.openingHoursSoonColor ?? "#d97706"
            }
            onChange={(key, value) => setAttributes({ [key]: value })}
          />
        </PanelBody>
        <PanelBody title={__("Cluster", "minimal-map")} initialOpen={false}>
          <ClusterColorSettings
            backgroundColor={attributes.clusterBackgroundColor}
            foregroundColor={attributes.clusterForegroundColor}
            defaultBackgroundColor={
              runtimeConfig.defaults?.clusterBackgroundColor ?? "#ffffff"
            }
            defaultForegroundColor={
              runtimeConfig.defaults?.clusterForegroundColor ?? "#000000"
            }
            onChange={(key, value) => setAttributes({ [key]: value })}
          />
        </PanelBody>
      </InspectorControls>
      <div {...blockProps}>
        <div
          ref={mapRef}
          className="minimal-map-editor__canvas"
          style={{ height: previewHeightCssValue }}
        />
      </div>
    </>
  );
}

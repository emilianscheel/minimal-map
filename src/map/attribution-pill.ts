import { __ } from "@wordpress/i18n";
import { getMapDomContext } from "./dom-context";
import type { NormalizedMapConfig, WordPressAttributionControl } from "../types";

function createAttributionLink(
  href: string,
  label: string,
  host: HTMLElement,
): HTMLAnchorElement {
  const context = getMapDomContext(host);
  const link = context.doc.createElement("a");

  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer noopener";
  link.textContent = label;

  return link;
}

export function createAttributionPill(
  host: HTMLElement,
  config: NormalizedMapConfig,
): WordPressAttributionControl {
  const context = getMapDomContext(host);
  const root = context.doc.createElement("div");
  const content = context.doc.createElement("span");
  const tilesLink = createAttributionLink(
    "https://openfreemap.org/",
    "OpenFreeMap",
    host,
  );
  const separator = context.doc.createElement("span");
  const dataPrefix = context.doc.createElement("span");
  const dataLink = createAttributionLink(
    "https://www.openstreetmap.org/copyright",
    "OpenStreetMap",
    host,
  );

  root.className = "minimal-map-attribution";
  root.setAttribute("role", "note");
  root.setAttribute("aria-label", __("Map credits", "minimal-map"));
  root.style.setProperty(
    "--minimal-map-attribution-padding-top",
    config.creditsPadding.top,
  );
  root.style.setProperty(
    "--minimal-map-attribution-padding-right",
    config.creditsPadding.right,
  );
  root.style.setProperty(
    "--minimal-map-attribution-padding-bottom",
    config.creditsPadding.bottom,
  );
  root.style.setProperty(
    "--minimal-map-attribution-padding-left",
    config.creditsPadding.left,
  );
  root.style.setProperty(
    "--minimal-map-attribution-margin-top",
    config.creditsOuterMargin.top,
  );
  root.style.setProperty(
    "--minimal-map-attribution-margin-right",
    config.creditsOuterMargin.right,
  );
  root.style.setProperty(
    "--minimal-map-attribution-margin-bottom",
    config.creditsOuterMargin.bottom,
  );
  root.style.setProperty(
    "--minimal-map-attribution-margin-left",
    config.creditsOuterMargin.left,
  );
  root.style.setProperty(
    "--minimal-map-attribution-background",
    config.creditsBackgroundColor,
  );
  root.style.setProperty(
    "--minimal-map-attribution-color",
    config.creditsForegroundColor,
  );
  root.style.setProperty(
    "--minimal-map-attribution-border-radius",
    config.creditsBorderRadius,
  );

  content.className = "minimal-map-attribution__content";
  separator.className = "minimal-map-attribution__separator";
  separator.textContent = " | ";
  dataPrefix.textContent = "";

  content.append(tilesLink, separator, dataPrefix, dataLink);
  root.appendChild(content);
  host.appendChild(root);

  return {
    destroy() {
      root.remove();
    },
  };
}

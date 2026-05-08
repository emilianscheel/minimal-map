import { __, sprintf } from "@wordpress/i18n";
import { memo, useEffect, useMemo, useState } from "@wordpress/element";
import {
  AtSign,
  ChevronDown,
  Clock3,
  Facebook,
  Globe,
  Instagram,
  LocateFixed,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Send,
  Twitter,
  Youtube,
} from "lucide-react";
import TagBadge from "../components/TagBadge";
import {
  isOpeningHoursConfigured,
  normalizeOpeningHours,
} from "../lib/locations/openingHours";
import {
  getOpeningHoursDisplayLines,
  getOpeningHoursStatus,
} from "./location-opening-hours";
import type {
  AnalyticsActionType,
  AnalyticsInteractionSource,
  MapLocationLogo,
  MapLocationPoint,
  SocialMediaPlatform,
} from "../types";

export interface LocationResultCardProps {
  analyticsSource?: Extract<AnalyticsInteractionSource, "search_panel" | "in_map_card">;
  distanceLabel?: string;
  googleMapsButtonShowIcon: boolean;
  googleMapsNavigation: boolean;
  id?: string;
  isSelected?: boolean;
  location: MapLocationPoint;
  mode: "search" | "in-map";
  onAnalyticsAction?: (
    actionType: AnalyticsActionType,
    actionTarget?: string,
  ) => void;
  onSelect?: (location: MapLocationPoint, distanceLabel?: string) => void;
  siteLocale: string;
  siteTimezone: string;
}

export interface LiveLocationResultCardProps {
  errorMessage?: string | null;
  isPending?: boolean;
  label: string;
  onSelect: () => void;
}

export const formatDisplayUrl = (url: string): string => {
  if (!url) {
    return "";
  }

  return url
    .replace(/^(https?:\/\/)/, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
};

export const formatLocationStreet = (location: MapLocationPoint): string => {
  return [location.street, location.house_number].filter(Boolean).join(" ");
};

export const formatLocationLocality = (location: MapLocationPoint): string => {
  return [location.postal_code, location.city].filter(Boolean).join(" ");
};

export const formatLocationAddress = (location: MapLocationPoint): string => {
  const streetLine = formatLocationStreet(location);
  const localityLine = formatLocationLocality(location);

  return [streetLine, localityLine].filter(Boolean).join(", ");
};

export const getGoogleMapsDirectionsUrl = (
  location: MapLocationPoint,
): string => {
  const params = new URLSearchParams({
    api: "1",
    destination: `${location.lat},${location.lng}`,
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const hasLocationCoordinates = (location: MapLocationPoint): boolean =>
  Number.isFinite(location.lat) && Number.isFinite(location.lng);

function getActionTargetHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getDelayUntilNextMinute(now: Date): number {
  return Math.max(
    1000,
    (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50,
  );
}

const SearchResultLogo = ({ logo }: { logo: MapLocationLogo }) => {
  const content = typeof logo.content === "string" ? logo.content : "";
  const isSvgMarkup = content.trim().startsWith("<svg");

  return (
    <div className="minimal-map-search__result-logo" aria-hidden="true">
      {isSvgMarkup ? (
        <div
          className="minimal-map-search__result-logo-svg"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <img
          className="minimal-map-search__result-logo-image"
          src={content}
          alt=""
        />
      )}
    </div>
  );
};

function LocationContactMeta({
  location,
  onAnalyticsAction,
}: {
  location: MapLocationPoint;
  onAnalyticsAction?: (
    actionType: AnalyticsActionType,
    actionTarget?: string,
  ) => void;
}) {
  const socialPlatforms: Record<
    SocialMediaPlatform,
    { label: string; icon: any }
  > = useMemo(
    () => ({
      instagram: { label: __("Instagram", "minimal-map"), icon: Instagram },
      x: { label: __("X", "minimal-map"), icon: Twitter },
      facebook: { label: __("Facebook", "minimal-map"), icon: Facebook },
      threads: { label: __("Threads", "minimal-map"), icon: AtSign },
      youtube: { label: __("YouTube", "minimal-map"), icon: Youtube },
      telegram: { label: __("Telegram", "minimal-map"), icon: Send },
    }),
    [],
  );

  const socialMedia = (location.social_media || []).filter(
    (link) => typeof link.url === "string" && link.url.trim(),
  );

  if (
    !location.telephone &&
    !location.email &&
    !location.website &&
    socialMedia.length === 0
  ) {
    return null;
  }

  return (
    <div className="minimal-map-search__result-meta">
      {location.telephone ? (
        <a
          className="minimal-map-search__meta-item minimal-map-search__meta-item--link"
          href={`tel:${location.telephone}`}
          onClick={() => onAnalyticsAction?.("telephone")}
        >
          <Phone size={10} />
          <span>{location.telephone}</span>
        </a>
      ) : null}
      {location.email ? (
        <a
          className="minimal-map-search__meta-item minimal-map-search__meta-item--link"
          href={`mailto:${location.email}`}
          onClick={() => onAnalyticsAction?.("email")}
        >
          <Mail size={10} />
          <span>{location.email}</span>
        </a>
      ) : null}
      {location.website ? (
        <a
          className="minimal-map-search__meta-item minimal-map-search__meta-item--link"
          href={location.website}
          onClick={() =>
            onAnalyticsAction?.(
              "website",
              getActionTargetHostname(location.website || ""),
            )}
          rel="noreferrer noopener"
          target="_blank"
        >
          <Globe size={10} />
          <span>{formatDisplayUrl(location.website)}</span>
        </a>
      ) : null}
      {socialMedia.map((link, index) => {
        const platform = socialPlatforms[link.platform];
        const Icon = platform.icon;

        return (
          <a
            key={index}
            className="minimal-map-search__meta-item minimal-map-search__meta-item--link"
            href={link.url}
            onClick={() => onAnalyticsAction?.("social_media", link.platform)}
            rel="noreferrer noopener"
            target="_blank"
          >
            <Icon size={10} />
            <span>{platform.label}</span>
          </a>
        );
      })}
    </div>
  );
}

export const LocationResultCard = memo(
  ({
    analyticsSource,
    distanceLabel,
    googleMapsButtonShowIcon,
    googleMapsNavigation,
    id,
    isSelected,
    location,
    mode,
    onAnalyticsAction,
    onSelect,
    siteLocale,
    siteTimezone,
  }: LocationResultCardProps) => {
    const emitAnalyticsAction = (
      actionType: AnalyticsActionType,
      actionTarget?: string,
    ) => {
      if (!analyticsSource) {
        return;
      }

      onAnalyticsAction?.(actionType, actionTarget);
    };

    const openingHours = useMemo(
      () => normalizeOpeningHours(location.opening_hours),
      [location.opening_hours],
    );
    const isInMapMode = mode === "in-map";
    const showStructuredOpeningHours = isOpeningHoursConfigured(openingHours);
    const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());

    useEffect(() => {
      setCurrentTimeMs(Date.now());
    }, [openingHours, siteLocale, siteTimezone]);

    useEffect(() => {
      if (!showStructuredOpeningHours) {
        return;
      }

      const timeout = setTimeout(() => {
        setCurrentTimeMs(Date.now());
      }, getDelayUntilNextMinute(new Date()));

      return () => clearTimeout(timeout);
    }, [currentTimeMs, showStructuredOpeningHours]);

    const address = useMemo(() => formatLocationAddress(location), [location]);
    const showStaticOpeningHoursNotes =
      !showStructuredOpeningHours &&
      typeof location.opening_hours_notes === "string" &&
      location.opening_hours_notes.trim() !== "";
    const showOpeningHours =
      showStructuredOpeningHours || showStaticOpeningHoursNotes;
    const openedStatus = useMemo(
      () =>
        showStructuredOpeningHours
          ? getOpeningHoursStatus(
              openingHours,
              siteLocale,
              siteTimezone,
              new Date(currentTimeMs),
            )
          : null,
      [
        currentTimeMs,
        openingHours,
        showStructuredOpeningHours,
        siteLocale,
        siteTimezone,
      ],
    );
    const openingHoursLines = useMemo(
      () => getOpeningHoursDisplayLines(openingHours, siteLocale),
      [openingHours, siteLocale],
    );

    const hasTags = (location.tags?.length || 0) > 0;
    const showGoogleMapsButton =
      googleMapsNavigation && hasLocationCoordinates(location);
    const showFooter = hasTags || showGoogleMapsButton || !!distanceLabel;

    const [isOpeningHoursExpanded, setIsOpeningHoursExpanded] = useState(false);

    const openingHoursStateClass = `is-${openedStatus?.state || "closed"}`;

    const openingHoursSection = showOpeningHours ? (
      <div className="minimal-map-search__result-opening-hours">
        {showStructuredOpeningHours ? (
          isInMapMode ? (
            <div
              className={`minimal-map-search__result-opening-hours-trigger minimal-map-search__result-opening-hours-trigger--static ${openingHoursStateClass}`}
            >
              <Clock3 size={10} />
              <span>{openedStatus?.label || __("Closed", "minimal-map")}</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={`minimal-map-search__result-opening-hours-trigger minimal-map-search__result-opening-hours-trigger--expandable ${openingHoursStateClass}`}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!isOpeningHoursExpanded) {
                    emitAnalyticsAction("opening_hours");
                  }
                  setIsOpeningHoursExpanded((value) => !value);
                }}
                aria-expanded={isOpeningHoursExpanded}
              >
                <Clock3 size={10} />
                <span>
                  {openedStatus?.label || __("Closed", "minimal-map")}
                </span>
                <ChevronDown
                  size={12}
                  className={`minimal-map-search__result-opening-hours-chevron ${
                    isOpeningHoursExpanded ? "is-open" : ""
                  }`}
                />
              </button>
              <div
                className={`minimal-map-search__result-opening-hours-panel ${
                  isOpeningHoursExpanded ? "is-open" : ""
                }`}
              >
                <div className="minimal-map-search__result-opening-hours-panel-inner">
                  <div className="minimal-map-search__result-opening-hours-list">
                    {openingHoursLines.map((line, index) => (
                      <div
                        key={index}
                        className="minimal-map-search__result-opening-hours-row"
                      >
                        <span className="minimal-map-search__result-opening-hours-day">
                          {line.dayLabel}
                        </span>
                        <span className="minimal-map-search__result-opening-hours-value">
                          {line.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  {location.opening_hours_notes ? (
                    <div className="minimal-map-search__result-opening-hours-notes">
                      {location.opening_hours_notes}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )
        ) : (
          <div className="minimal-map-search__result-opening-hours-trigger minimal-map-search__result-opening-hours-trigger--static">
            <Clock3 size={10} />
            <span>{location.opening_hours_notes}</span>
          </div>
        )}
      </div>
    ) : null;

    const cardBody = (
      <div className="minimal-map-location-card__body">
        <div className="minimal-map-search__result-layout">
          <div className="minimal-map-search__result-content">
            <div className="minimal-map-search__result-title">
              {location.title}
            </div>
            {address && (
              <div className="minimal-map-search__result-address">
                <MapPin size={10} />
                <div className="minimal-map-search__result-address-content">
                  <span>{address}</span>
                </div>
              </div>
            )}
            <LocationContactMeta
              location={location}
              onAnalyticsAction={emitAnalyticsAction}
            />
          </div>
          {location.logo && <SearchResultLogo logo={location.logo} />}
        </div>
      </div>
    );

    return (
      <div
        id={id}
        className={`minimal-map-search__result-item minimal-map-location-card ${
          isSelected ? "is-selected" : ""
        } minimal-map-search__result-item--${mode} ${
          isInMapMode ? "minimal-map-location-card--in-map" : ""
        }`}
      >
        {isInMapMode ? (
          cardBody
        ) : (
          <button
            type="button"
            className="minimal-map-search__result-select"
            onClick={() => onSelect?.(location, distanceLabel)}
          >
            {cardBody}
          </button>
        )}
        {openingHoursSection}
        {showFooter ? (
          <div className="minimal-map-search__result-footer">
            <div className="minimal-map-search__result-footer-content">
              {hasTags ? (
                <div className="minimal-map-search__result-tags">
                  {location.tags?.map((tag) => (
                    <TagBadge key={tag.id} tag={tag} />
                  ))}
                </div>
              ) : null}
              {showGoogleMapsButton ? (
                <a
                  className="minimal-map-search__maps-link"
                  href={getGoogleMapsDirectionsUrl(location)}
                  onClick={() => emitAnalyticsAction("google_maps")}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {googleMapsButtonShowIcon ? <Navigation size={10} /> : null}
                  <span>{__("Open in Google Maps", "minimal-map")}</span>
                </a>
              ) : null}
            </div>
            {distanceLabel ? (
              <div className="minimal-map-search__result-distance">
                {sprintf(__("%s away", "minimal-map"), distanceLabel)}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
);

export const LiveLocationResultCard = memo(
  ({
    errorMessage,
    isPending = false,
    label,
    onSelect,
  }: LiveLocationResultCardProps) => (
    <div className="minimal-map-search__result-item minimal-map-location-card minimal-map-search__result-item--live-location">
      <button
        type="button"
        className="minimal-map-search__result-select"
        onClick={onSelect}
        disabled={isPending}
        aria-busy={isPending}
      >
        <div className="minimal-map-search__result-layout">
          <div className="minimal-map-search__result-content">
            <div className="minimal-map-search__result-title minimal-map-search__result-title--live-location">
              <span
                className="minimal-map-search__result-live-location-icon"
                aria-hidden="true"
              >
                <LocateFixed size={14} />
              </span>
              <span>{label}</span>
            </div>
            {errorMessage ? (
              <div className="minimal-map-search__result-live-location-error">
                {errorMessage}
              </div>
            ) : null}
          </div>
        </div>
      </button>
    </div>
  ),
);

import { Button, Popover, SlotFillProvider } from "@wordpress/components";
import domReady from "@wordpress/dom-ready";
import { Suspense, createRoot, lazy } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import type { ComponentType, LazyExoticComponent } from "react";
import AdminSectionIcon from "./AdminSectionIcon";
import {
  adminConfig,
  getActiveSection,
  getSectionMap,
  isAdminSectionView,
} from "./app-config";
import LoadingView from "./LoadingView";
import type { AdminSectionView } from "../types";
import type { AdminSectionComponentProps } from "./sections/types";
import "./style.scss";

const DashboardSection = lazy(
  () =>
    import(
      /* webpackChunkName: "admin-section-dashboard" */
      "./sections/DashboardSection"
    ),
);
const AnalyticsSection = lazy(
  () =>
    import(
      /* webpackChunkName: "admin-section-analytics" */
      "./sections/AnalyticsSection"
    ),
);
const LocationsSection = lazy(
  () =>
    import(
      /* webpackChunkName: "admin-section-locations" */
      "./sections/LocationsSection"
    ),
);
const CollectionsSection = lazy(
  () =>
    import(
      /* webpackChunkName: "admin-section-collections" */
      "./sections/CollectionsSection"
    ),
);
const LogosSection = lazy(
  () =>
    import(
      /* webpackChunkName: "admin-section-logos" */
      "./sections/LogosSection"
    ),
);
const MarkersSection = lazy(
  () =>
    import(
      /* webpackChunkName: "admin-section-markers" */
      "./sections/MarkersSection"
    ),
);
const TagsSection = lazy(
  () =>
    import(
      /* webpackChunkName: "admin-section-tags" */
      "./sections/TagsSection"
    ),
);
const StylesSection = lazy(
  () =>
    import(
      /* webpackChunkName: "admin-section-styles" */
      "./sections/StylesSection"
    ),
);

const SECTION_COMPONENTS: Record<
  AdminSectionView,
  LazyExoticComponent<ComponentType<AdminSectionComponentProps>>
> = {
  dashboard: DashboardSection,
  analytics: AnalyticsSection,
  locations: LocationsSection,
  collections: CollectionsSection,
  logos: LogosSection,
  markers: MarkersSection,
  tags: TagsSection,
  styles: StylesSection,
};

function AdminSidebar({ currentView }: { currentView: AdminSectionView }) {
  return (
    <aside className="minimal-map-admin__sidebar">
      <nav
        className="minimal-map-admin__nav"
        aria-label={__("Minimal Map: Store Locator & Map Block Sections", "minimal-map")}
      >
        {adminConfig.sections.map((section) => {
          const isActive = section.view === currentView;

          return (
            <Button
              key={section.view}
              href={section.url}
              variant="tertiary"
              __next40pxDefaultSize
              className={[
                "minimal-map-admin__nav-item",
                isActive ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="minimal-map-admin__nav-icon">
                <AdminSectionIcon view={section.view} />
              </span>
              <span>{section.title}</span>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}

function App({ currentView }: { currentView: AdminSectionView }) {
  const sectionMap = getSectionMap();
  const activeSection = getActiveSection(currentView);
  const ActiveSectionComponent =
    SECTION_COMPONENTS[activeSection.view] ?? DashboardSection;

  return (
    <SlotFillProvider>
      <div className="minimal-map-admin__app">
        <AdminSidebar currentView={activeSection.view} />
        <div className="minimal-map-admin__panel">
          <Suspense fallback={<LoadingView />}>
            <ActiveSectionComponent
              activeSection={activeSection}
              appConfig={adminConfig}
              sectionMap={sectionMap}
            />
          </Suspense>
        </div>
      </div>
      <Popover.Slot />
    </SlotFillProvider>
  );
}

function mount(): void {
  document
    .querySelectorAll<HTMLElement>("[data-minimal-map-admin-root]")
    .forEach((node) => {
      const requestedView =
        node.getAttribute("data-current-view") ??
        adminConfig.currentView ??
        "dashboard";
      const currentView = isAdminSectionView(requestedView)
        ? requestedView
        : "dashboard";
      createRoot(node).render(<App currentView={currentView} />);
    });
}

domReady(mount);

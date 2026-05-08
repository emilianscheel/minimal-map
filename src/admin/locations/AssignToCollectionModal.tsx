import { Button, ComboboxControl, Modal } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import type { KeyboardEvent } from "react";
import Kbd from "../../components/Kbd";
import CollectionBadge from "../../components/CollectionBadge";
import type { LocationsController } from "./types";

export default function AssignToCollectionModal({
  controller,
}: {
  controller: LocationsController;
}) {
  if (
    !controller.isAssignToCollectionModalOpen ||
    !controller.selectedAssignmentLocation
  ) {
    return null;
  }

  const assignedCollections = controller.getCollectionsForLocation(
    controller.selectedAssignmentLocation.id,
  );
  const options = controller.collections.map((collection) => ({
    label: collection.title || __("Untitled collection", "minimal-map"),
    value: `${collection.id}`,
  }));
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    const isHTMLElement = target instanceof HTMLElement;
    const isComboboxExpanded =
      isHTMLElement && target.getAttribute("role") === "combobox"
        ? target.getAttribute("aria-expanded") === "true"
        : false;

    if (
      controller.isAssignmentSaving ||
      !controller.assignmentCollectionId ||
      event.key !== "Enter" ||
      event.shiftKey ||
      isComboboxExpanded ||
      (isHTMLElement &&
        target.closest("[data-minimal-map-dialog-ignore-enter='true']"))
    ) {
      return;
    }

    event.preventDefault();
    void controller.onAssignLocationToCollection();
  };

  return (
    <Modal
      className="minimal-map-admin__assign-to-collection-modal"
      contentLabel={__("Assign to collection", "minimal-map")}
      focusOnMount="firstInputElement"
      onKeyDown={handleKeyDown}
      onRequestClose={controller.onCloseAssignToCollectionModal}
      shouldCloseOnClickOutside={!controller.isAssignmentSaving}
      shouldCloseOnEsc={!controller.isAssignmentSaving}
      title={__("Assign to Collection", "minimal-map")}
    >
      <div className="minimal-map-admin__assign-to-collection-dialog">
        <div className="minimal-map-admin__assign-to-collection-copy">
          {assignedCollections.length > 0 ? (
            <div className="minimal-map-admin__location-collections">
              {assignedCollections.map((collection) => (
                <CollectionBadge key={collection.id} label={collection.title} />
              ))}
            </div>
          ) : (
            <p className="minimal-map-admin__assign-to-collection-empty">
              {__("Not assigned to any collection yet.", "minimal-map")}
            </p>
          )}
        </div>
        <ComboboxControl
          __next40pxDefaultSize
          label={__("Collection", "minimal-map")}
          value={controller.assignmentCollectionId}
          options={options}
          onChange={(value) =>
            controller.onSelectAssignmentCollection(value ?? "")
          }
          help={
            options.length === 0
              ? __(
                  "Create a collection first to assign this location.",
                  "minimal-map",
                )
              : undefined
          }
        />
        <div className="minimal-map-admin__assign-to-collection-actions">
          <Button
            __next40pxDefaultSize
            variant="tertiary"
            onClick={controller.onCloseAssignToCollectionModal}
            disabled={controller.isAssignmentSaving}
            data-minimal-map-dialog-ignore-enter="true"
          >
            {__("Cancel", "minimal-map")}
          </Button>
          <Button
            __next40pxDefaultSize
            variant="primary"
            onClick={() => void controller.onAssignLocationToCollection()}
            isBusy={controller.isAssignmentSaving}
            disabled={
              controller.isAssignmentSaving ||
              !controller.assignmentCollectionId
            }
          >
            <span className="minimal-map-admin__location-dialog-button-content">
              <span>{__("Assign", "minimal-map")}</span>
              <Kbd variant="blue">Enter</Kbd>
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}

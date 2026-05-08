import { Button, Modal } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import type { KeyboardEvent } from "react";
import Kbd from "../../components/Kbd";
import type { LocationsController } from "./types";

export default function ShowLocationConfirmationModal({
  controller,
}: {
  controller: LocationsController;
}) {
  const location = controller.selectedShownLocation;

  if (!controller.isShowLocationConfirmationModalOpen || !location) {
    return null;
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;

    if (
      controller.isRowActionPending ||
      event.key !== "Enter" ||
      event.shiftKey ||
      (target instanceof HTMLElement &&
        target.closest('[data-minimal-map-dialog-ignore-enter="true"]'))
    ) {
      return;
    }

    event.preventDefault();
    void controller.onConfirmShowLocation();
  };

  return (
    <Modal
      title={__("Show location", "minimal-map")}
      onRequestClose={controller.onCloseShowLocationConfirmationModal}
      shouldCloseOnClickOutside={!controller.isRowActionPending}
      shouldCloseOnEsc={!controller.isRowActionPending}
      onKeyDown={handleKeyDown}
    >
      <div className="minimal-map-admin__collection-delete-dialog">
        <p className="minimal-map-admin__collection-delete-dialog-copy">
          {__("Show this location again?", "minimal-map")}
        </p>
        <p className="minimal-map-admin__collection-delete-dialog-title">
          {location.title}
        </p>
        <div className="minimal-map-admin__collection-delete-dialog-actions">
          <Button
            variant="tertiary"
            onClick={controller.onCloseShowLocationConfirmationModal}
            disabled={controller.isRowActionPending}
            data-minimal-map-dialog-ignore-enter="true"
          >
            {__("Cancel", "minimal-map")}
          </Button>
          <Button
            variant="primary"
            onClick={() => void controller.onConfirmShowLocation()}
            isBusy={controller.isRowActionPending}
            disabled={controller.isRowActionPending}
          >
            <span className="minimal-map-admin__location-dialog-button-content">
              <span>{__("Show location", "minimal-map")}</span>
              <Kbd variant="blue">Enter</Kbd>
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}

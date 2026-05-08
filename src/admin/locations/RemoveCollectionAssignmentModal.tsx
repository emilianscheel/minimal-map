import { Button, Modal } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import type { KeyboardEvent } from "react";
import Kbd from "../../components/Kbd";
import type { LocationsController } from "./types";

export default function RemoveCollectionAssignmentModal({
  controller,
}: {
  controller: LocationsController;
}) {
  if (
    !controller.isRemoveCollectionAssignmentModalOpen ||
    !controller.selectedRemovalLocation ||
    !controller.selectedRemovalCollection
  ) {
    return null;
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    const isHTMLElement = target instanceof HTMLElement;

    if (
      controller.isRemovingCollectionAssignment ||
      event.key !== "Enter" ||
      event.shiftKey ||
      (isHTMLElement &&
        target.closest("[data-minimal-map-dialog-ignore-enter='true']"))
    ) {
      return;
    }

    event.preventDefault();
    void controller.onRemoveCollectionAssignment();
  };

  return (
    <Modal
      className="minimal-map-admin__remove-collection-assignment-modal"
      contentLabel={__("Remove collection", "minimal-map")}
      focusOnMount={true}
      onKeyDown={handleKeyDown}
      onRequestClose={controller.onCloseRemoveCollectionAssignmentModal}
      shouldCloseOnClickOutside={!controller.isRemovingCollectionAssignment}
      shouldCloseOnEsc={!controller.isRemovingCollectionAssignment}
      title={__("Remove collection", "minimal-map")}
    >
      <div className="minimal-map-admin__remove-collection-assignment-dialog">
        <p className="minimal-map-admin__remove-collection-assignment-copy">
          {controller.selectedRemovalCollection.title}
        </p>
        <div className="minimal-map-admin__remove-collection-assignment-actions">
          <Button
            __next40pxDefaultSize
            variant="tertiary"
            onClick={controller.onCloseRemoveCollectionAssignmentModal}
            disabled={controller.isRemovingCollectionAssignment}
            data-minimal-map-dialog-ignore-enter="true"
          >
            {__("Cancel", "minimal-map")}
          </Button>
          <Button
            __next40pxDefaultSize
            variant="primary"
            isDestructive
            onClick={() => void controller.onRemoveCollectionAssignment()}
            disabled={controller.isRemovingCollectionAssignment}
            isBusy={controller.isRemovingCollectionAssignment}
          >
            <span className="minimal-map-admin__location-dialog-button-content">
              <span>{__("Confirm", "minimal-map")}</span>
              <Kbd variant="red">Enter</Kbd>
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}

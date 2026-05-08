import { Button, CheckboxControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useEffect, useRef, useState } from "@wordpress/element";
import type { KeyboardEvent } from "react";
import type { CollectionRecord } from "../../types";
import Kbd from "../../components/Kbd";
import { shouldHandleModalEnter } from "../../lib/locations/shouldHandleModalEnter";
import type { DeleteCollectionOptions } from "./types";

interface DeleteCollectionActionModalProps {
  closeModal?: () => void;
  collection: CollectionRecord;
  onActionPerformed?: (items: CollectionRecord[]) => void;
  onDelete: (
    collection: CollectionRecord,
    options: DeleteCollectionOptions,
  ) => Promise<void>;
}

export default function DeleteCollectionActionModal({
  closeModal,
  collection,
  onActionPerformed,
  onDelete,
}: DeleteCollectionActionModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setDeleting] = useState(false);
  const [deleteLocations, setDeleteLocations] = useState(false);
  const [skipSharedLocations, setSkipSharedLocations] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleDelete = async (): Promise<void> => {
    setDeleting(true);
    setErrorMessage(null);

    try {
      await onDelete(collection, {
        deleteLocations,
        skipSharedLocations,
      });
      onActionPerformed?.([collection]);
      closeModal?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : __("Collection could not be deleted.", "minimal-map"),
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="minimal-map-admin__collection-delete-dialog"
      tabIndex={0}
      style={{ outline: "none" }}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        const target = event.target;
        const isHTMLElement = target instanceof HTMLElement;

        if (
          isDeleting ||
          (target instanceof HTMLInputElement && target.type === "checkbox") ||
          (isHTMLElement &&
            target.closest('[data-minimal-map-dialog-ignore-enter="true"]')) ||
          !shouldHandleModalEnter(event)
        ) {
          return;
        }

        event.preventDefault();
        void handleDelete();
      }}
    >
      <p className="minimal-map-admin__collection-delete-dialog-copy">
        {__(
          "Delete this collection and remove its saved location assignments?",
          "minimal-map",
        )}
      </p>
      <p className="minimal-map-admin__collection-delete-dialog-title">
        {collection.title}
      </p>
      <div className="minimal-map-admin__collection-delete-dialog-options">
        <CheckboxControl
          __nextHasNoMarginBottom
          label={__("Delete locations", "minimal-map")}
          checked={deleteLocations}
          onChange={(checked) => {
            setDeleteLocations(checked);

            if (!checked) {
              setSkipSharedLocations(false);
            }
          }}
          disabled={isDeleting}
          data-minimal-map-dialog-ignore-enter="true"
        />
        {deleteLocations ? (
          <CheckboxControl
            __nextHasNoMarginBottom
            label={__("Skip shared locations", "minimal-map")}
            checked={skipSharedLocations}
            onChange={setSkipSharedLocations}
            disabled={isDeleting}
            data-minimal-map-dialog-ignore-enter="true"
          />
        ) : null}
      </div>
      {errorMessage ? (
        <p className="minimal-map-admin__collection-delete-dialog-error">
          {errorMessage}
        </p>
      ) : null}
      <div className="minimal-map-admin__collection-delete-dialog-actions">
        <Button
          variant="tertiary"
          onClick={closeModal}
          disabled={isDeleting}
          data-minimal-map-dialog-ignore-enter="true"
        >
          {__("Cancel", "minimal-map")}
        </Button>
        <Button
          variant="primary"
          isDestructive
          onClick={() => void handleDelete()}
          isBusy={isDeleting}
          disabled={isDeleting}
        >
          <span className="minimal-map-admin__location-dialog-button-content">
            <span>{__("Delete collection", "minimal-map")}</span>
            <Kbd variant="red">Enter</Kbd>
          </span>
        </Button>
      </div>
    </div>
  );
}

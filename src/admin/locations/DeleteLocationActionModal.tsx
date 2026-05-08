import { Button } from "@wordpress/components";
import { __, _n, sprintf } from "@wordpress/i18n";
import { useEffect, useRef, useState } from "@wordpress/element";
import type { KeyboardEvent } from "react";
import type { LocationRecord } from "../../types";
import Kbd from "../../components/Kbd";
import { shouldHandleModalEnter } from "../../lib/locations/shouldHandleModalEnter";

interface DeleteLocationActionModalProps {
  items: LocationRecord[];
  onDelete: (location: LocationRecord) => Promise<void>;
  onDeleteBulk?: (locations: LocationRecord[]) => Promise<void>;
  closeModal?: () => void;
  onActionPerformed?: (items: LocationRecord[]) => void;
}

export default function DeleteLocationActionModal({
  items,
  onDelete,
  onDeleteBulk,
  closeModal,
  onActionPerformed,
}: DeleteLocationActionModalProps) {
  const [isDeleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleDelete = async (): Promise<void> => {
    setDeleting(true);
    setError(null);

    try {
      if (items.length > 1 && onDeleteBulk) {
        await onDeleteBulk(items);
      } else if (items[0]) {
        await onDelete(items[0]);
      }
      onActionPerformed?.(items);
      closeModal?.();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : items.length > 1
          ? __("Locations could not be deleted.", "minimal-map")
          : __("Location could not be deleted.", "minimal-map"),
      );
    } finally {
      setDeleting(false);
    }
  };

  const isBulk = items.length > 1;

  return (
    <div
      ref={containerRef}
      className="minimal-map-admin__location-delete-dialog"
      tabIndex={0}
      style={{ outline: "none" }}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        const target = event.target;
        const isHTMLElement = target instanceof HTMLElement;

        if (
          isDeleting ||
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
        {isBulk
          ? sprintf(
              _n(
                "Are you sure you want to delete %d location? This action cannot be undone.",
                "Are you sure you want to delete %d locations? This action cannot be undone.",
                items.length,
                "minimal-map",
              ),
              items.length,
            )
          : __("Delete this location and remove its saved collection assignments?", "minimal-map")}
      </p>
      {!isBulk && items[0] && (
        <p className="minimal-map-admin__collection-delete-dialog-title">
          {items[0].title}
        </p>
      )}
      {error && (
        <p className="minimal-map-admin__location-delete-dialog-error">
          {error}
        </p>
      )}
      <div className="minimal-map-admin__location-delete-dialog-actions">
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
            <span>{__("Delete", "minimal-map")}</span>
            <Kbd variant="red">Enter</Kbd>
          </span>
        </Button>
      </div>
    </div>
  );
}

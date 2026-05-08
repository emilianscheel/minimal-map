import { Button, SelectControl, TextControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { Plus, Trash2 } from "lucide-react";
import type {
  LocationFormState,
  SocialMediaLink,
  SocialMediaPlatform,
} from "../../types";

interface SocialMediaStepProps {
  form: LocationFormState;
  onChange: (key: keyof LocationFormState, value: SocialMediaLink[]) => void;
}

const PLATFORMS: { label: string; value: SocialMediaPlatform }[] = [
  { label: __("Instagram", "minimal-map"), value: "instagram" },
  { label: __("X", "minimal-map"), value: "x" },
  { label: __("Facebook", "minimal-map"), value: "facebook" },
  { label: __("Threads", "minimal-map"), value: "threads" },
  { label: __("YouTube", "minimal-map"), value: "youtube" },
  { label: __("Telegram", "minimal-map"), value: "telegram" },
];

export default function SocialMediaStep({
  form,
  onChange,
}: SocialMediaStepProps) {
  const socialMedia = form.social_media || [];

  const onAddPlatform = () => {
    onChange("social_media", [
      ...socialMedia,
      { platform: "instagram", url: "" },
    ]);
  };

  const onRemovePlatform = (index: number) => {
    const nextSocialMedia = [...socialMedia];
    nextSocialMedia.splice(index, 1);
    onChange("social_media", nextSocialMedia);
  };

  const onChangePlatform = (index: number, platform: SocialMediaPlatform) => {
    const nextSocialMedia = [...socialMedia];
    nextSocialMedia[index] = { ...nextSocialMedia[index], platform };
    onChange("social_media", nextSocialMedia);
  };

  const onChangeUrl = (index: number, url: string) => {
    const nextSocialMedia = [...socialMedia];
    nextSocialMedia[index] = { ...nextSocialMedia[index], url };
    onChange("social_media", nextSocialMedia);
  };

  return (
    <div className="minimal-map-admin__social-media-step">
      <div className="minimal-map-admin__social-media-rows">
        {socialMedia.map((link, index) => (
          <div key={index} className="minimal-map-admin__social-media-row">
            <div className="minimal-map-admin__social-media-row-platform">
              <SelectControl
                __next40pxDefaultSize
                __nextHasNoMarginBottom
                label={index === 0 ? __("Platform", "minimal-map") : undefined}
                hideLabelFromVision={index !== 0}
                options={PLATFORMS}
                value={link.platform}
                onChange={(value) =>
                  onChangePlatform(index, value as SocialMediaPlatform)
                }
              />
            </div>
            <div className="minimal-map-admin__social-media-row-url">
              <TextControl
                __next40pxDefaultSize
                __nextHasNoMarginBottom
                label={index === 0 ? __("URL", "minimal-map") : undefined}
                hideLabelFromVision={index !== 0}
                placeholder={__("https://...", "minimal-map")}
                value={link.url}
                onChange={(value) => onChangeUrl(index, value)}
              />
            </div>
            <div className="minimal-map-admin__social-media-row-actions">
              <Button
                __next40pxDefaultSize
                variant="tertiary"
                isDestructive
                icon={<Trash2 size={18} />}
                onClick={() => onRemovePlatform(index)}
                label={__("Remove platform", "minimal-map")}
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        __next40pxDefaultSize
        variant="secondary"
        className="minimal-map-admin__social-media-add-button"
        icon={<Plus size={18} />}
        onClick={onAddPlatform}
      >
        {__("Add platform", "minimal-map")}
      </Button>
    </div>
  );
}

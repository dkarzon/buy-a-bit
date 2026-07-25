import { Camera, ImagePlus, Link2, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import { fileToProductImageDataUrl } from "../lib/product-image";

export function ProductImageField({
  name = "imageUrl",
  defaultValue = "",
  error,
  disabled,
  onChange,
}: {
  name?: string;
  defaultValue?: string;
  error?: string;
  disabled?: boolean;
  onChange?: () => void;
}) {
  const fieldId = useId();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showUrl, setShowUrl] = useState(
    Boolean(defaultValue && !defaultValue.startsWith("data:image/")),
  );

  const displayError = error ?? localError ?? undefined;

  function updateValue(next: string) {
    setValue(next);
    setLocalError(null);
    onChange?.();
  }

  async function handleFile(file: File | undefined) {
    if (!file || disabled || busy) return;
    setBusy(true);
    setLocalError(null);
    try {
      const dataUrl = await fileToProductImageDataUrl(file);
      updateValue(dataUrl);
      setShowUrl(false);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Could not use that image.",
      );
    } finally {
      setBusy(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }

  return (
    <div className="product-image-field">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink" id={`${fieldId}-label`}>
          Product photo
        </span>
        {value && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted"
            disabled={disabled || busy}
            onClick={() => updateValue("")}
          >
            <Trash2 size={13} /> Remove
          </button>
        )}
      </div>

      <input type="hidden" name={name} value={value} />

      <div
        className={`product-image-preview ${displayError ? "is-invalid" : ""} ${value ? "has-image" : ""}`}
        aria-labelledby={`${fieldId}-label`}
      >
        {value ? (
          <img src={value} alt="Product preview" />
        ) : (
          <div className="product-image-empty">
            <ImagePlus size={22} />
            <p>Take a photo or upload one from your device</p>
          </div>
        )}
      </div>

      <div className="product-image-actions">
        <button
          type="button"
          className="button button-secondary button-sm"
          disabled={disabled || busy}
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera size={15} /> {busy ? "Processing…" : "Take photo"}
        </button>
        <button
          type="button"
          className="button button-secondary button-sm"
          disabled={disabled || busy}
          onClick={() => uploadInputRef.current?.click()}
        >
          <ImagePlus size={15} /> Upload
        </button>
        <button
          type="button"
          className="button button-ghost button-sm"
          disabled={disabled || busy}
          onClick={() => setShowUrl((open) => !open)}
        >
          <Link2 size={15} /> {showUrl ? "Hide URL" : "Use URL"}
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {showUrl && (
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          Image URL
          <input
            className={`field ${displayError ? "field-invalid" : ""}`}
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={value.startsWith("data:image/") ? "" : value}
            disabled={disabled || busy}
            onChange={(event) => updateValue(event.target.value.trim())}
          />
        </label>
      )}

      {displayError && (
        <span className="field-error" role="alert">
          {displayError}
        </span>
      )}
    </div>
  );
}

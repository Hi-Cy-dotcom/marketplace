"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { validateImageFile } from "@/lib/validation";
import { cn } from "@/lib/utils";

export interface SelectedPhoto {
  file: File;
  /** Object URL used for previews. The owner is responsible for revoking it. */
  url: string;
}

interface ImageDropzoneProps {
  photo: SelectedPhoto | null;
  onChange: (photo: SelectedPhoto | null) => void;
  error?: string;
  disabled?: boolean;
}

export function ImageDropzone({ photo, onChange, error, disabled }: ImageDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectFile = (candidate: File | undefined) => {
    if (!candidate) return;
    const validationError = validateImageFile(candidate);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);
    onChange({ file: candidate, url: URL.createObjectURL(candidate) });
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    selectFile(event.dataTransfer.files?.[0]);
  };

  const displayError = localError ?? error;

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">Photo</span>
      {photo ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
          <img
            src={photo.url}
            alt="Selected photo preview"
            className="h-full w-full object-contain"
          />
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            disabled={disabled}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow hover:bg-card disabled:opacity-50"
            aria-label="Remove photo"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="absolute bottom-2 left-2 max-w-[80%] truncate rounded bg-black/60 px-2 py-1 text-xs text-white">
            {photo.file.name} · {(photo.file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          aria-describedby={displayError ? `${inputId}-error` : undefined}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-card p-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isDragging ? "border-facebook bg-accent" : "border-input hover:bg-secondary",
            displayError && "border-destructive",
            disabled && "cursor-not-allowed opacity-60 pointer-events-none",
          )}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <ImagePlus className="h-6 w-6" aria-hidden />
          </span>
          <p className="font-semibold">Add photo</p>
          <p className="text-xs text-muted-foreground">
            or drag and drop · JPEG, PNG or WebP up to 5MB
          </p>
        </label>
      )}
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label="Upload photo"
        onChange={(e) => {
          selectFile(e.target.files?.[0]);
          e.target.value = "";
        }}
        disabled={disabled}
      />
      {displayError && (
        <p id={`${inputId}-error`} className="text-xs font-medium text-destructive">
          {displayError}
        </p>
      )}
    </div>
  );
}

import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export type PhotoFile = { file: File; previewUrl: string };

interface PhotoUploaderProps {
  photos: PhotoFile[];
  onChange: (photos: PhotoFile[]) => void;
  disabled?: boolean;
}

export const PhotoUploader = ({
  photos,
  onChange,
  disabled,
}: PhotoUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (incoming: FileList | File[]) => {
    setError(null);
    const arr = Array.from(incoming);
    const remaining = MAX_PHOTOS - photos.length;
    if (arr.length > remaining) {
      setError(`You can attach up to ${MAX_PHOTOS} photos.`);
    }
    const accepted: PhotoFile[] = [];
    for (const file of arr.slice(0, remaining)) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed.");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError("Each photo must be under 5MB.");
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (accepted.length) onChange([...photos, ...accepted]);
  };

  const remove = (idx: number) => {
    const next = [...photos];
    URL.revokeObjectURL(next[idx].previewUrl);
    next.splice(idx, 1);
    onChange(next);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30",
          disabled && "opacity-60 pointer-events-none"
        )}
      >
        <ImageIcon
          className="mx-auto mb-2 h-8 w-8 text-muted-foreground"
          aria-hidden
        />
        <p className="text-sm text-foreground">
          Add photos of the damage{" "}
          <span className="text-muted-foreground">(optional)</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Helps the technician give an accurate quote faster. Up to{" "}
          {MAX_PHOTOS} photos, 5MB each.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          disabled={disabled || photos.length >= MAX_PHOTOS}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" /> Choose photos
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-3">
          {photos.map((p, idx) => (
            <li
              key={p.previewUrl}
              className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
            >
              <img
                src={p.previewUrl}
                alt={`Damage photo ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                disabled={disabled}
                aria-label={`Remove photo ${idx + 1}`}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow hover:bg-background"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {(p.file.size / 1024 / 1024).toFixed(1)}MB
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

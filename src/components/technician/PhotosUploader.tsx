import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { X, Upload } from "lucide-react";

export function PhotosUploader({
  userId,
  urls,
  onChange,
}: {
  userId: string;
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    const next = [...urls];
    for (const file of Array.from(files)) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 8MB)`);
        continue;
      }
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error } = await supabase.storage.from("technician-photos").upload(path, file);
      if (error) {
        toast.error(error.message);
        continue;
      }
      const { data } = supabase.storage.from("technician-photos").getPublicUrl(path);
      next.push(data.publicUrl);
    }
    onChange(next);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = async (url: string) => {
    // Best-effort delete from storage
    const idx = url.indexOf(`/technician-photos/`);
    if (idx >= 0) {
      const path = url.slice(idx + `/technician-photos/`.length);
      await supabase.storage.from("technician-photos").remove([path]);
    }
    onChange(urls.filter((u) => u !== url));
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {urls.map((u) => (
          <div key={u} className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/30">
            <img src={u} alt="Equipment" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(u)}
              className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        className="mt-3 border-white/10 bg-white/5 hover:bg-white/10"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <Upload className="mr-2 h-4 w-4" />
        {busy ? "Uploading…" : "Add photos"}
      </Button>
    </div>
  );
}

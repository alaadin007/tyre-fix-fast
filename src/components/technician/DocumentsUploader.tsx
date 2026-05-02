import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileCheck2 } from "lucide-react";

export function DocumentsUploader({
  userId,
  label,
  field,
  currentUrl,
  onChange,
}: {
  userId: string;
  label: string;
  field: string;
  currentUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    setBusy(true);
    const path = `${userId}/${field}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("technician-docs").upload(path, file, {
      upsert: true,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChange(path); // store path; signed URL generated when ops views
    toast.success(`${label} uploaded`);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="flex items-center gap-2 text-sm">
        {currentUrl ? <FileCheck2 className="h-4 w-4 text-emerald-400" /> : <Upload className="h-4 w-4 text-white/40" />}
        <div>
          <div>{label}</div>
          <div className="text-xs text-white/40">{currentUrl ? "Uploaded" : "Not uploaded"}</div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => upload(e.target.files?.[0] || null)}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-white/10 bg-white/5 hover:bg-white/10"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {currentUrl ? "Replace" : "Upload"}
      </Button>
    </div>
  );
}

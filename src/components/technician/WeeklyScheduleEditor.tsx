import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export type DaySchedule = { start: string; end: string };
export type WeeklySchedule = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", DaySchedule>>;

const DAYS: Array<{ key: keyof WeeklySchedule; label: string }> = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

export function WeeklyScheduleEditor({
  value,
  onChange,
}: {
  value: WeeklySchedule;
  onChange: (v: WeeklySchedule) => void;
}) {
  const setDay = (day: keyof WeeklySchedule, patch: Partial<DaySchedule> | null) => {
    const next = { ...value };
    if (patch === null) {
      delete next[day];
    } else {
      next[day] = { start: "08:00", end: "18:00", ...(next[day] || {}), ...patch };
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {DAYS.map(({ key, label }) => {
        const day = value[key];
        const enabled = !!day;
        return (
          <div key={key} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 p-2">
            <div className="w-12 text-sm">{label}</div>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => setDay(key, v ? {} : null)}
            />
            {enabled ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  type="time"
                  value={day.start}
                  onChange={(e) => setDay(key, { start: e.target.value })}
                  className="bg-black/40 border-white/10 h-9"
                />
                <span className="text-white/40 text-sm">to</span>
                <Input
                  type="time"
                  value={day.end}
                  onChange={(e) => setDay(key, { end: e.target.value })}
                  className="bg-black/40 border-white/10 h-9"
                />
              </div>
            ) : (
              <div className="flex-1 text-sm text-white/40">Off</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

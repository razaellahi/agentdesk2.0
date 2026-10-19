import { useId, useState } from "react";
import { confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { RecordingRule } from "./api";
import { maskError } from "./mask";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const NEW_RULE: RecordingRule = {
  id: 0,
  ruleAction: "RECORD",
  ruleType: "Phone Number",
  mask: "",
  fromTime: "00:00",
  toTime: "23:59",
  screenCapture: false,
  screenCaptureUsage: 100,
};

export function RuleEditor({
  rule,
  busy,
  onSave,
  onClose,
}: {
  rule: RecordingRule | null;
  busy: boolean;
  onSave: (rule: RecordingRule) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(rule ?? NEW_RULE);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rule ?? NEW_RULE);
  const patch = (next: Partial<RecordingRule>) => setDraft((prev) => ({ ...prev, ...next }));
  const invalid = maskError(draft.mask ?? "");
  const timeInvalid = !draft.fromTime || !draft.toTime || draft.fromTime >= draft.toTime;
  const close = () => {
    if (busy) return;
    if (!dirty) onClose();
    else
      void confirm({ title: "Discard unsaved changes?", destructive: true }).then((ok) => {
        if (ok) onClose();
      });
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-auto">
        <DialogTitle>{rule ? "Edit recording rule" : "New recording rule"}</DialogTitle>
        <DialogDescription>
          Set the matching phone number, schedule, and recording behavior.
        </DialogDescription>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!invalid && !timeInvalid) onSave({ ...draft, mask: draft.mask?.trim() });
          }}
        >
          <fieldset disabled={busy} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor={`${id}-action`} className="grid gap-1 text-sm">
                Action
                <select
                  id={`${id}-action`}
                  className="rounded-md border bg-surface p-2"
                  value={draft.ruleAction}
                  onChange={(e) => patch({ ruleAction: e.target.value })}
                >
                  <option value="RECORD">Record</option>
                  <option value="NORECORD">Do not record</option>
                </select>
              </label>
              <label htmlFor={`${id}-type`} className="grid gap-1 text-sm">
                Rule type
                <select
                  id={`${id}-type`}
                  className="rounded-md border bg-surface p-2"
                  value={draft.ruleType}
                  onChange={(e) => patch({ ruleType: e.target.value })}
                >
                  <option>Phone Number</option>
                  {draft.ruleType && draft.ruleType !== "Phone Number" && <option>{draft.ruleType}</option>}
                </select>
              </label>
            </div>
            <label htmlFor={`${id}-mask`} className="grid gap-1 text-sm">
              Phone number mask
              <Input
                id={`${id}-mask`}
                value={draft.mask}
                onChange={(e) => patch({ mask: e.target.value })}
                required
                aria-invalid={Boolean(draft.mask && invalid)}
                aria-describedby={`${id}-mask-help`}
              />
            </label>
            <p id={`${id}-mask-help`} className="-mt-3 text-xs text-muted-foreground">
              Examples: *, 123*, *123*, 123??, &gt;2005, 2005=2006. Use one kind of special character.
            </p>
            {draft.mask && invalid && (
              <p role="alert" className="text-xs text-destructive">
                Enter a valid phone number mask.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor={`${id}-from`} className="grid gap-1 text-sm">
                From
                <Input
                  id={`${id}-from`}
                  type="time"
                  required
                  value={draft.fromTime}
                  onChange={(e) => patch({ fromTime: e.target.value })}
                />
              </label>
              <label htmlFor={`${id}-to`} className="grid gap-1 text-sm">
                To
                <Input
                  id={`${id}-to`}
                  type="time"
                  required
                  value={draft.toTime}
                  onChange={(e) => patch({ toTime: e.target.value })}
                />
              </label>
            </div>
            {timeInvalid && (
              <p role="alert" className="text-xs text-destructive">
                From time must be before To time.
              </p>
            )}
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={DAYS.every((day) => draft[day])}
                  onChange={(e) => patch(Object.fromEntries(DAYS.map((day) => [day, e.target.checked])))}
                />
                Every day
              </label>
              <div className="flex flex-wrap gap-3">
                {DAYS.map((day) => (
                  <label key={day} className="flex items-center gap-1 text-xs capitalize">
                    <input
                      type="checkbox"
                      checked={Boolean(draft[day])}
                      onChange={(e) => patch({ [day]: e.target.checked })}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(draft.screenCapture)}
                onChange={(e) => patch({ screenCapture: e.target.checked })}
              />
              Screen capture
            </label>
            <label htmlFor={`${id}-usage`} className="grid gap-1 text-sm">
              Screen capture usage (%)
              <Input
                id={`${id}-usage`}
                type="number"
                readOnly
                disabled
                value={draft.screenCaptureUsage ?? 100}
              />
            </label>
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || Boolean(invalid) || timeInvalid || !dirty}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

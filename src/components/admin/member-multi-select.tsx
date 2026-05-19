"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ProfilePublic } from "@/types/database";

type MemberMultiSelectProps = {
  users: ProfilePublic[];
  value: string[];
  onChange: (ids: string[]) => void;
};

export function MemberMultiSelect({
  users,
  value,
  onChange,
}: MemberMultiSelectProps) {
  function toggle(userId: string, checked: boolean) {
    if (checked) {
      onChange([...value, userId]);
    } else {
      onChange(value.filter((id) => id !== userId));
    }
  }

  if (users.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No active users available.
      </p>
    );
  }

  return (
    <div className="border-border max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
      {users.map((user) => {
        const checked = value.includes(user.id);
        return (
          <div key={user.id} className="flex items-center gap-2">
            <Checkbox
              id={`member-${user.id}`}
              checked={checked}
              onCheckedChange={(state) => toggle(user.id, state === true)}
            />
            <Label
              htmlFor={`member-${user.id}`}
              className="cursor-pointer font-normal"
            >
              {user.name}
              <span className="text-muted-foreground ml-1">({user.email})</span>
            </Label>
          </div>
        );
      })}
    </div>
  );
}

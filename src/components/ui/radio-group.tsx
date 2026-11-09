"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "@/lib/utils";

/** Base UI radio group; arrow keys move and select, Tab enters/leaves the group. */
function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive data-slot="radio-group" className={cn("grid", className)} {...props} />
  );
}

/** Round C04-style control: white fill and ink edge, selected ink with a white dot. */
function Radio({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio"
      className={cn(
        "inline-flex size-[17px] shrink-0 items-center justify-center rounded-full bg-white outline-none transition-colors [transition-duration:var(--gui-motion-small)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gui-focus)] data-checked:bg-[var(--gui-neutral-10)] data-disabled:pointer-events-none data-disabled:bg-[var(--gui-neutral-3)]",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-[7px] rounded-full bg-white" />
    </RadioPrimitive.Root>
  );
}

export { Radio, RadioGroup };

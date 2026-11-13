import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// modal={false}: el modo modal inyecta una etiqueta <style> (bloqueo de scroll) que la CSP estricta no permite.
export function DropdownMenu(props: ComponentProps<typeof Menu.Root>) {
  return <Menu.Root modal={false} {...props} />;
}
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuRadioGroup = Menu.RadioGroup;

export function DropdownMenuContent({ className, ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        align="end"
        sideOffset={8}
        className={cn("z-50 min-w-56 rounded-lg border-2 border-border bg-surface-raised p-2 text-text shadow-floating", className)}
        {...props}
      />
    </Menu.Portal>
  );
}

const itemClass = "flex min-h-touch cursor-pointer items-center gap-2 rounded-md px-3 text-base data-[highlighted]:bg-primary-soft";

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Menu.Item>) {
  return <Menu.Item className={cn(itemClass, className)} {...props} />;
}

export function DropdownMenuRadioItem({ className, children, ...props }: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem className={cn(itemClass, "pl-9 relative", className)} {...props}>
      <Menu.ItemIndicator className="absolute left-3">
        <Check aria-hidden="true" className="size-4" />
      </Menu.ItemIndicator>
      {children}
    </Menu.RadioItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn("px-3 py-2 text-sm font-semibold text-text-muted", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn("my-2 h-0.5 bg-border", className)} {...props} />;
}

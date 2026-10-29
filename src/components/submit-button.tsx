"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "./ui";

/** Disabled while its form's action is in flight, to stop double submits. */
export function SubmitButton({
  children,
  pendingLabel,
  variant,
  className,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} className={className} disabled={pending || disabled} aria-disabled={pending || disabled}>
      {pending ? (pendingLabel ?? "Saving…") : children}
    </Button>
  );
}

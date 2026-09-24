import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

const control =
  "w-full rounded-lg border bg-surface px-3 text-[14px] text-ink placeholder:text-ink-muted/70 transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";

type FieldShellProps = {
  /** Element id; defaults to `name`. Pass one when two forms on a page share a field name. */
  id?: string;
  name: string;
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function FieldShell({ id, name, label, help, error, required, className, children }: FieldShellProps) {
  const fieldId = id ?? name;
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-[12.5px] font-medium text-ink-soft">
        {label}
        {required && <span className="ml-0.5 text-warn-ink">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${fieldId}-error`} className="text-[12px] text-danger">
          {error}
        </p>
      ) : (
        help && <p className="text-[12px] text-ink-muted">{help}</p>
      )}
    </div>
  );
}

type InputFieldProps = Omit<ComponentProps<"input">, "name"> & Omit<FieldShellProps, "children"> & { name: string };

export function InputField({ id, name, label, help, error, required, className, ...props }: InputFieldProps) {
  return (
    <FieldShell id={id} name={name} label={label} help={help} error={error} required={required} className={className}>
      <input
        id={id ?? name}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id ?? name}-error` : undefined}
        className={clsx(control, "h-10", error ? "border-danger" : "border-line-strong")}
        {...props}
      />
    </FieldShell>
  );
}

type TextareaFieldProps = Omit<ComponentProps<"textarea">, "name"> & Omit<FieldShellProps, "children"> & { name: string };

export function TextareaField({ id, name, label, help, error, required, className, rows = 3, ...props }: TextareaFieldProps) {
  return (
    <FieldShell id={id} name={name} label={label} help={help} error={error} required={required} className={className}>
      <textarea
        id={id ?? name}
        name={name}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id ?? name}-error` : undefined}
        className={clsx(control, "resize-y py-2 leading-relaxed", error ? "border-danger" : "border-line-strong")}
        {...props}
      />
    </FieldShell>
  );
}

import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
  fieldComponents: { Input },
  formComponents: { Button },
  fieldContext,
  formContext,
});

function TextField({
  label,
  disableErrors,
}: {
  label: string;
  disableErrors?: boolean;
}) {
  const field = useFieldContext<string>();

  return (
    <div className="space-y-2">
      <Label className="grid gap-2">
        <span className="font-bold">{label}:</span>
        <Input
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
        />
      </Label>
      {!disableErrors &&
        !field.state.meta.isValid &&
        field.state.meta.isBlurred && (
          <em className={"text-red-400"}>
            {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
            {field.state.meta.errors[0]?.message ?? "Invalid field"}
          </em>
        )}
    </div>
  );
}

export { useAppForm, TextField };

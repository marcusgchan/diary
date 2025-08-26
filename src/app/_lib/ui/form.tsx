import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { Button } from "./button";
import { Input } from "./input";

const { fieldContext, formContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
  fieldComponents: { Input },
  formComponents: { Button },
  fieldContext,
  formContext,
});

export { useAppForm };

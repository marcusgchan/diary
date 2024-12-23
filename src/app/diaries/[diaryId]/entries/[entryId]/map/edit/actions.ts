"use server";

import { z } from "zod";

export async function createPostAction(formData: FormData) {}

type Builder0<T, Schema extends z.ZodTypeAny | undefined> = Pick<
  _Builder<T, Schema>,
  "schema" | "middleware" | "action"
>;
type Builder1<T, Schema extends z.ZodTypeAny | undefined> = Pick<
  _Builder<T, Schema>,
  "middleware" | "action"
>;
type Builder2<T, Schema extends z.ZodTypeAny | undefined> = Pick<
  _Builder<T, Schema>,
  "middleware" | "action"
>;

class _Builder<Context, Schema extends z.ZodTypeAny | undefined> {
  private contextFn: (() => Context) | undefined;
  private dataSchema: z.ZodTypeAny | undefined;

  constructor(props?: { context?: () => Context }) {
    this.contextFn = props?.context;
  }

  schema<NewSchema extends z.ZodTypeAny>(
    schema: NewSchema,
  ): Builder1<Context, NewSchema> {
    this.dataSchema = schema;
    return this as unknown as _Builder<Context, NewSchema>;
  }

  middleware(): Builder2<Context, Schema> {
    return this as _Builder<Context, Schema>;
  }

  action(
    callback: Schema extends z.ZodTypeAny
      ? (data: z.infer<Schema>) => Promise<unknown>
      : () => Promise<unknown>,
  ) {
    return async (formData: FormData) => {
      if (this.dataSchema) {
        const parsed = this.dataSchema.safeParse(formData);
        if (!parsed.success) {
          return new Error("Invalid format");
        }
        return callback(parsed);
      }
      return callback(undefined);
    };
  }
}

const Builder: new <
  T,
  Schema extends z.ZodTypeAny | undefined = undefined,
>(props?: {
  context?: () => T;
}) => Builder0<T, Schema> = _Builder;

const b = new Builder();

b.schema(z.object({ name: z.string(), age: z.number() }))
  .middleware()
  .action(async (data) => {});

b.action(async () => {});

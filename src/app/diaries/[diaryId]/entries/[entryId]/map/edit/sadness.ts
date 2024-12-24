import { Session } from "next-auth";
import { z } from "zod";
import { getServerAuthSession } from "~/server/auth";

type NarrowedContext<OldContext, NewContext> = NewContext extends {}
  ? OldContext & NewContext
  : OldContext;

type ActionBuilder0<T, Schema extends z.ZodTypeAny | undefined> = Pick<
  _ActionBuilder<T, Schema>,
  "schema" | "middleware" | "action"
>;
type ActionBuilder1<T, Schema extends z.ZodTypeAny | undefined> = Pick<
  _ActionBuilder<T, Schema>,
  "middleware" | "action"
>;
type ActionBuilder2<T, Schema extends z.ZodTypeAny | undefined> = Pick<
  _ActionBuilder<T, Schema>,
  "middleware" | "action"
>;

class _ActionBuilder<Context, Schema extends z.ZodTypeAny | undefined> {
  private contextFn: () => Context;
  private dataSchema: z.ZodTypeAny | undefined;
  private middlewares: Array<
    (params: {
      ctx: Context;
      next: <NewContext>(
        newContext: NewContext,
      ) => NarrowedContext<Context, NewContext>;
    }) => void
  > = [];

  constructor(props: { context: () => Context }) {
    this.contextFn = props.context;
  }

  schema<NewSchema extends z.ZodTypeAny>(
    schema: NewSchema,
  ): ActionBuilder1<Context, NewSchema> {
    this.dataSchema = schema;
    return this as unknown as _ActionBuilder<Context, NewSchema>;
  }

  middleware<NewContext>(
    callback: ({
      ctx,
      next,
    }: {
      ctx: Context;
      next: <NextContext>(
        newContext: NextContext,
      ) => NarrowedContext<Context, NextContext>;
    }) => NarrowedContext<Context, NewContext>,
  ): ActionBuilder2<NarrowedContext<Context, NewContext>, Schema> {
    // Add middleware to the chain
    this.middlewares.push(({ ctx, next }) => {
      const newCtx = callback({ ctx, next });
      next(newCtx);
    });

    return this as unknown as _ActionBuilder<
      NarrowedContext<Context, NewContext>,
      Schema
    >;
  }

  action(
    callback: Schema extends z.ZodTypeAny
      ? ({
          data,
          ctx,
        }: {
          data: z.infer<Schema>;
          ctx: Context;
        }) => Promise<unknown>
      : ({ ctx }: { ctx: Context }) => Promise<unknown>,
  ) {
    return async (formData: FormData) => {
      const fields = Object.fromEntries(formData);
      if (this.dataSchema) {
        const parsed = this.dataSchema.safeParse(fields);
        if (!parsed.success) {
          return new Error("Invalid format");
        }
        return callback({ ctx: this.contextFn(), data: parsed.data });
      }
      return callback({ ctx: this.contextFn(), data: undefined });
    };
  }
}

const Builder: new <
  T,
  Schema extends z.ZodTypeAny | undefined = undefined,
>(props: {
  context: () => T;
}) => ActionBuilder0<T, Schema> = _ActionBuilder;

interface InnerContext {
  session: Session | null;
}

async function createContext() {
  const session = await getServerAuthSession();
  return createInnerContext({ session });
}

function createInnerContext(opts: InnerContext) {
  return {
    session: opts.session,
  };
}

const b = new Builder({
  context: () =>
    createInnerContext({ session: { user: { id: "123" }, expires: "123" } }),
});

const action1 = b
  .schema(z.object({ name: z.string(), age: z.number() }))
  .middleware(({ ctx, next }) => {
    return {};
  })
  .action(async (data) => {});

b.action(async ({ ctx }) => {
  ctx.session?.user.id;
});

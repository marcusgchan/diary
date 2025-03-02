/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import {
  initTRPC,
  TRPCError,
  type inferRouterInputs,
  type inferRouterOutputs,
} from "@trpc/server";
import { type Session } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";
import { trace } from "@opentelemetry/api";

import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db";
import { AppRouter } from "~/server/api/root";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */

interface CreateContextOptions {
  session: Session | null;
}

/**
 * This helper generates the "internals" for a tRPC context. If you need to use it, you can export
 * it from here.
 *
 * Examples of things you may need it for:
 * - testing, so we don't have to mock Next.js' req/res
 * - tRPC's `createSSGHelpers`, where we don't have req/res
 *
 * @see https://create.t3.gg/en/usage/trpc#-serverapitrpcts
 */
const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    db,
  };
};

/**
 * This is the actual context you will use in your router. It will be used to process every request
 * that goes through your tRPC endpoint.
 *
 * @see https://trpc.io/docs/context
 */

export type TRPCContext = ReturnType<typeof createInnerTRPCContext>;
export const createTRPCContext = async () => {
  // Get the session from the server using the getServerSession wrapper function
  const session = await getServerAuthSession();

  return createInnerTRPCContext({
    session,
  });
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure;

export const createCallerFactory = t.createCallerFactory;

/** Reusable middleware that enforces users are logged in before running the procedure. */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  const user = ctx.session?.user;
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const log = (
    name: string,
    level: string,
    message: string,
    opts?: { [key: string]: string | number | string[] | number[] },
  ) => {
    let ops: Record<string, string | number | string[] | number[]> = {};
    if (opts) {
      for (const [key, value] of Object.entries(opts)) {
        if (Array.isArray(value)) {
          ops[key] = `[${value.join(",")}]`;
        } else {
          ops[key] = value;
        }
      }
    }
    const tracer = trace.getTracer("api");
    const span = tracer.startSpan(name);
    span.setAttributes({
      function: name,
      // ["highlight.session_id"]: "abc123",
      // ["highlight.trace_id"]: "def456",
      user_id: user.id,
      ...ops,
    });

    span.addEvent(
      "log",
      {
        ["log.severity"]: level,
        ["log.message"]: message,
      },
      new Date(),
    );
    span.end();
  };

  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: user, log },
    },
  });
});

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

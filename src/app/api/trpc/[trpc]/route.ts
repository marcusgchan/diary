import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/server/root";
import { createTRPCContext } from "~/server/trpc";
import util from "util";

const handler = (req: Request) =>
  fetchRequestHandler({
    onError: (opts) => {
      const { error } = opts;
      console.error(util.inspect(error, { depth: null }));
    },
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext(),
  });

export { handler as GET, handler as POST };

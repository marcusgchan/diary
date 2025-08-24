import { type ProtectedContext } from "~/server/trpc";
import { TRPCError } from "@trpc/server";
import { EntryService } from "../repositories/entry";
import { type GetEntryDayInput } from "../schema";

export async function getEntryDayHandler(
  ctx: ProtectedContext,
  input: GetEntryDayInput,
): Promise<string> {
  const entryService = new EntryService(ctx);
  const [day] = await entryService.getEntryDay(input.entryId);

  if (day === undefined) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return day.day;
}

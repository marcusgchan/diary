import { type db } from "~/server/db";
import { type Users } from "~/server/db/schema";
import { type ProtectedContext } from "~/server/trpc";

export class ImageService {
  private userId: Users["id"];
  private db: typeof db;
  private ctx: ProtectedContext;

  constructor(context: ProtectedContext) {
    this.userId = context.session.user.id;
    this.db = context.db;
    this.ctx = context;
  }
}

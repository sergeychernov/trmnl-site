import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(
  _req: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await context.params;
  const db = await getDb();
  const accounts = db.collection("accounts");
  const res = await accounts.deleteOne({
    provider,
    userId: new ObjectId((session.user as any).id),
  });

  return NextResponse.json({ ok: true, deleted: res.deletedCount ?? 0 });
}



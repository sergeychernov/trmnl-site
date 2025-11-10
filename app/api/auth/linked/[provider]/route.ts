import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  _req: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const session = await auth();
  const { provider } = await context.params;

  if (!session?.user?.id) {
    return NextResponse.json({ linked: false });
  }

  const db = await getDb();
  const accounts = db.collection("accounts");
  const doc = await accounts.findOne({
    provider,
    userId: new ObjectId((session.user as any).id),
  });

  return NextResponse.json({ linked: !!doc });
}



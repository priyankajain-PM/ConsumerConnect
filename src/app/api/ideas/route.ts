import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/session";
import { saveIdea } from "@/lib/booking-service";

// Submit an idea without booking a call (valid terminal state per OQ1)
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { ideaText } = await req.json();

  const idea = await saveIdea({
    customerId: user.id,
    ideaText: ideaText?.trim() ?? "",
    submittedWithoutBooking: true,
  });

  return NextResponse.json({ ideaId: idea.id }, { status: 201 });
}

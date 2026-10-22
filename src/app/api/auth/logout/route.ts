import { NextResponse } from "next/server";
import { detruireSession } from "@/lib/session";

export async function POST() {
  await detruireSession();
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"));
}

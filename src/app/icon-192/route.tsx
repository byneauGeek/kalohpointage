import { ImageResponse } from "next/og";
import { blasonIcone } from "@/lib/pwaIcon";

export async function GET() {
  return new ImageResponse(blasonIcone(192), { width: 192, height: 192 });
}

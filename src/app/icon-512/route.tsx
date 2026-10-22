import { ImageResponse } from "next/og";
import { blasonIcone } from "@/lib/pwaIcon";

export async function GET() {
  return new ImageResponse(blasonIcone(512), { width: 512, height: 512 });
}

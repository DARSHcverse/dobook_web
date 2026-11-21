import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildWidgetInfo } from "@/lib/widgetInfo";

export async function GET(_request, context) {
  const params = await context.params;
  const { status, body } = await buildWidgetInfo(supabaseAdmin(), params?.businessId);
  return NextResponse.json(body, { status });
}

import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const categories = Array.isArray(body?.categories) ? body.categories : [];
  if (!categories.length) {
    return NextResponse.json({ detail: "No categories to import" }, { status: 400 });
  }

  const businessId = auth.business.id;
  const sb = auth.supabase;

  // Load existing sort_order bases
  const [existingCatsRes, existingPkgsRes] = await Promise.all([
    sb.from("package_categories").select("id,sort_order").eq("business_id", businessId),
    sb.from("packages").select("id,sort_order").eq("business_id", businessId),
  ]);
  const catBase = (existingCatsRes.data || []).reduce(
    (m, r) => Math.max(m, Number(r.sort_order || 0)),
    -1,
  );
  const pkgBase = (existingPkgsRes.data || []).reduce(
    (m, r) => Math.max(m, Number(r.sort_order || 0)),
    -1,
  );

  let createdCats = 0;
  let createdPkgs = 0;
  let pkgSort = pkgBase + 1;

  for (let ci = 0; ci < categories.length; ci += 1) {
    const cat = categories[ci];
    const catName = String(cat?.name || "").trim();
    if (!catName) continue;
    const pkgs = Array.isArray(cat?.packages) ? cat.packages.filter((p) => p?.include !== false) : [];
    if (!pkgs.length) continue;

    const { data: catRow, error: catErr } = await sb
      .from("package_categories")
      .insert({
        business_id: businessId,
        name: catName,
        description: "",
        image_url: "",
        is_active: true,
        sort_order: catBase + 1 + ci,
      })
      .select("id")
      .maybeSingle();

    if (catErr || !catRow?.id) {
      console.error("[import-confirm] category insert failed:", catErr?.message);
      continue;
    }
    createdCats += 1;

    const rows = pkgs
      .map((p) => {
        const name = String(p?.name || "").trim();
        if (!name) return null;
        const features = Array.isArray(p?.features)
          ? p.features.map((f) => String(f || "").trim()).filter(Boolean)
          : [];
        return {
          business_id: businessId,
          category_id: catRow.id,
          name,
          description: "",
          price: Number(p?.price || 0),
          duration_hours: Number(p?.duration_hours || 0),
          image_url: "",
          features,
          is_active: true,
          sort_order: pkgSort++,
        };
      })
      .filter(Boolean);

    if (!rows.length) continue;

    const { data: pkgRows, error: pkgErr } = await sb
      .from("packages")
      .insert(rows)
      .select("id");

    if (pkgErr) {
      console.error("[import-confirm] packages insert failed:", pkgErr?.message);
      continue;
    }
    createdPkgs += pkgRows?.length || 0;
  }

  if (createdPkgs === 0) {
    return NextResponse.json({ detail: "No packages could be imported" }, { status: 500 });
  }

  return NextResponse.json({ categories_created: createdCats, packages_created: createdPkgs });
}

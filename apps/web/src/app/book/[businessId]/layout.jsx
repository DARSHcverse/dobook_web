import { buildBusinessMetadata, getPublicBusinessMeta } from "@/lib/publicBusinessMeta";

export async function generateMetadata({ params }) {
  const { businessId } = await params;
  const business = await getPublicBusinessMeta(businessId);
  return buildBusinessMetadata(business, { kind: "booking", path: `/book/${businessId}` });
}

export default function BookLayout({ children }) {
  return (
    <div
      style={{
        fontFamily: "'Manrope', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
        background: "#f4f4f5",
        minHeight: "100vh",
      }}
    >
      {children}
    </div>
  );
}

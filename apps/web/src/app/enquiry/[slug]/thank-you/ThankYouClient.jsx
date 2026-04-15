"use client";

export default function ThankYouClient({ business, refId, email, name }) {
  const brand = business.brand_color || "#E8193C";
  const logo = business.brand_logo_url || business.logo_url || "";
  const confirmMsg =
    business.enquiry_confirmation_message ||
    "Check your inbox — your personalised quote is waiting for you!";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAFAFA",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        fontFamily:
          "'Inter', 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif",
        color: "#18181b",
      }}
    >
      <div style={{ maxWidth: "540px", width: "100%", textAlign: "center" }}>
        {logo ? (
          <img
            src={logo}
            alt={business.business_name}
            style={{ maxHeight: "64px", maxWidth: "200px", objectFit: "contain", marginBottom: "24px" }}
          />
        ) : null}

        <div
          style={{
            width: "96px",
            height: "96px",
            borderRadius: "999px",
            background: brand,
            margin: "0 auto 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pop 500ms ease",
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={{ fontSize: "32px", fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
          Enquiry Received! 🎉
        </h1>
        <p style={{ fontSize: "15px", color: "#52525b", margin: "0 0 8px" }}>
          {name ? `Hi ${name}, ` : ""}we've sent your quote to {email || "your inbox"}.
        </p>
        <p style={{ fontSize: "15px", color: "#52525b", margin: "0 0 24px" }}>{confirmMsg}</p>

        {refId ? (
          <div
            style={{
              display: "inline-block",
              background: "#fff",
              border: "1px solid #e4e4e7",
              borderRadius: "999px",
              padding: "8px 14px",
              fontSize: "13px",
              color: "#52525b",
              marginBottom: "24px",
            }}
          >
            Booking reference: <strong style={{ color: "#18181b" }}>#{refId}</strong>
          </div>
        ) : null}

        <div
          style={{
            background: "#fff",
            border: "1px solid #e4e4e7",
            borderRadius: "20px",
            padding: "20px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            textAlign: "left",
            marginBottom: "20px",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
            Contact {business.business_name}
          </div>
          {business.email ? <div style={{ fontSize: "14px", marginBottom: "4px" }}>✉️ {business.email}</div> : null}
          {business.phone ? <div style={{ fontSize: "14px", marginBottom: "4px" }}>📞 {business.phone}</div> : null}
          {business.business_address ? <div style={{ fontSize: "14px", color: "#52525b" }}>📍 {business.business_address}</div> : null}
        </div>

        {business.public_website ? (
          <a
            href={business.public_website}
            style={{
              display: "inline-block",
              background: brand,
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "12px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            Back to {business.business_name}
          </a>
        ) : null}
      </div>

      <style>{`
        @keyframes pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>

      <div style={{ marginTop: "32px", fontSize: "12px", color: "#a1a1aa" }}>
        Powered by{" "}
        <a href="https://do-book.com" style={{ color: "#71717a", textDecoration: "underline" }}>
          DoBook
        </a>
      </div>
    </div>
  );
}

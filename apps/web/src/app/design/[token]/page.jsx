import DesignApprovalClient from "./approval-client";

export const metadata = {
  title: "Your design — DoBook",
  // A private, tokenised page: keep it out of search results.
  robots: { index: false, follow: false },
};

export default async function DesignApprovalPage({ params }) {
  const { token } = await params;
  return <DesignApprovalClient token={token} />;
}

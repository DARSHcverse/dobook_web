import BusinessProfileClient from "./profile-client";

export default function BusinessProfilePage({ params }) {
  return <BusinessProfileClient businessId={params?.businessId} />;
}


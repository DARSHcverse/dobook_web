import ReviewInviteClient from "./review-client";

export default function ReviewInvitePage({ params }) {
  return <ReviewInviteClient token={params?.token} />;
}


// This is a page component for the Next.js Pages Router.
// It should NOT be an async function.
import ManageUsersPage from "@/components/admin/users";

export default function UsersPage() {
  return (
    // The ManageUsersPage component already contains the full page layout,
    // so we can render it directly.
    <ManageUsersPage />
  );
}

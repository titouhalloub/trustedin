import Link from "next/link";
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { GetServerSidePropsContext } from 'next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import VerificationsManagementPage from "@/components/admin/verifications";

export default function AdminDashboard() {
  return (
    <div className="p-16">
      <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-gray-600 mb-4">Welcome back, Admin! Here’s what’s happening.</p>

      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="verifications">Verifications</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <h2 className="text-xl font-semibold mb-2">User Management</h2>
          <p>View and manage all user profiles. <Link href="/admin/users" className="text-blue-600 hover:underline">Manage Users</Link></p>
        </TabsContent>

        <TabsContent value="subscriptions">
          <h2 className="text-xl font-semibold mb-2">Subscription Management</h2>
          <p>Manually activate user subscriptions. <Link href="/admin/subscriptions" className="text-blue-600 hover:underline">Manage Subscriptions</Link></p>
        </TabsContent>

        <TabsContent value="verifications">
          <VerificationsManagementPage />
        </TabsContent>

        <TabsContent value="posts">
          <h2 className="text-xl font-semibold mb-2">Post Management</h2>
          <p>Post management content goes here.{" "}
            <Link href="/admin/posts" className="text-green-600 hover:underline">
              Manage Posts
            </Link>
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/auth', permanent: false } };
  }

  // Role-based access control
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return { notFound: true };
  }

  return { props: {} };
};
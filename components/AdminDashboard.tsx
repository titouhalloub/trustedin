
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Activity, CreditCard, CheckCircle } from "lucide-react";
import VerificationsManagementPage from "./admin/verifications";

// Placeholder components for new admin sections
const UserManagementTab = () => (
  <div>
    User management content goes here.{" "}
    <Link href="/admin/users" className="text-primary underline">
      Manage Users
    </Link>
  </div>
);
const SubscriptionsTab = () => <div>Subscriptions management content goes here.</div>;
const LogsTab = () => <div>Recruiter usage logs content goes here.</div>;

const AdminDashboard = () => {
  const supabase = useSupabaseClient();
  const [stats, setStats] = useState({
    totalUsers: 0,
    userChange: 0,
    totalPosts: 0,
    postChange: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState("");

  // Set the time only on the client side to avoid hydration mismatch
  useEffect(() => {
    setLastCheckTime(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    const fetchAdminStats = async () => {
      setLoading(true);
      try {
        // 1. Get total user count
        const { count: totalUsers, error: totalUsersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (totalUsersError) throw totalUsersError;

        // 2. Get new users in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: newUsers, error: newUsersError } = await supabase
          .from('profiles')
          // Using 'created_at' as per the database schema to filter for new users.
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (newUsersError) throw newUsersError;

        // 3. Get total post count
        const { count: totalPosts, error: totalPostsError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true });

        if (totalPostsError) throw totalPostsError;

        // 4. Get new posts in the last 30 days
        const { count: newPosts, error: newPostsError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (newPostsError) throw newPostsError;

        // 5. Calculate percentage changes
        const previousUsers = (totalUsers || 0) - (newUsers || 0);
        let userChange = 0;
        if (previousUsers > 0) {
          userChange = ((newUsers || 0) / previousUsers) * 100;
        } else if ((newUsers || 0) > 0) {
          userChange = 100; // If there were 0 users before, and now there are some, it's a 100% increase from a baseline of new users.
        }

        const previousPosts = (totalPosts || 0) - (newPosts || 0);
        let postChange = 0;
        if (previousPosts > 0) {
          postChange = ((newPosts || 0) / previousPosts) * 100;
        } else if ((newPosts || 0) > 0) {
          postChange = 100;
        }

        setStats({
          totalUsers: totalUsers || 0,
          userChange,
          totalPosts: totalPosts || 0,
          postChange,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        // You could set an error state here to show in the UI
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-md text-gray-600">
            Welcome back, Admin! Here’s what’s happening.
          </p>
        </header>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" /> Users</TabsTrigger>
            <TabsTrigger value="subscriptions"><CreditCard className="mr-2 h-4 w-4" /> Subscriptions</TabsTrigger>
            <TabsTrigger value="verifications"><CheckCircle className="mr-2 h-4 w-4" /> Verifications</TabsTrigger>
            <TabsTrigger value="logs"><Activity className="mr-2 h-4 w-4" /> Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-6">
            <Card><CardHeader><CardTitle>User Management</CardTitle></CardHeader><CardContent><UserManagementTab /></CardContent></Card>
          </TabsContent>
          <TabsContent value="subscriptions" className="mt-6">
            <Card><CardHeader><CardTitle>Subscription Management</CardTitle></CardHeader><CardContent><SubscriptionsTab /></CardContent></Card>
          </TabsContent>
          <TabsContent value="verifications" className="mt-6">
            <VerificationsManagementPage />
          </TabsContent>
          <TabsContent value="logs" className="mt-6">
            <Card><CardHeader><CardTitle>Recruiter Usage Logs</CardTitle></CardHeader><CardContent><LogsTab /></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
};

export default AdminDashboard;
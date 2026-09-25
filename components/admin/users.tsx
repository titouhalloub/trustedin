import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { EditUserDialog } from "@/components/EditUserDialog";

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string | null;
  created_at: string;
}

export default function ManageUsersPage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${res.status}`);
      }

      const data: UserProfile[] = await res.json();
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message || "Unknown error");
      console.error("Error fetching users:", err);

      // redirect if auth issue
      if (err.message.includes("Forbidden") || err.message.includes("Not authenticated")) {
        router.replace("/admin/login?error=permission-denied");
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    if (user) {
      fetchUsers();
    } else if (user === null) {
      router.replace("/admin/login");
    }
  }, [user, fetchUsers, router]);

  const handleUserUpdate = () => {
    setEditingUser(null);
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <EditUserDialog
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onUserUpdate={handleUserUpdate}
      />

      <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                <Link href="/admin">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Manage Users
                </h1>
                <p className="mt-1 text-md text-gray-600">
                  View and manage all users on the platform.
                </p>
              </div>
            </div>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                A list of all registered users. Found {users.length} users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-red-500 text-center py-10">
                  Error loading users: {error}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.full_name || "N/A"}
                        </TableCell>
                        <TableCell>{u.username || "N/A"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={u.role === "admin" ? "destructive" : "secondary"}
                          >
                            {u.role || "user"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditingUser(u)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            disabled
                            title="Delete requires server-side implementation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

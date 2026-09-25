"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/router";
import Link from "next/link";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Loader2, ArrowLeft } from "lucide-react";

// Define the types for our data
interface Post {
  id: number;
  content: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    username: string | null;
  }[] | null;
}

const PostsManagementPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Security check: Redirect if not an admin
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      const isSuperAdmin = user?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
      if (!user || (role !== "admin" && !isSuperAdmin)) {
        router.replace("/auth");
      }
    }
  }, [user, role, authLoading, roleLoading, router]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/posts");
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setPosts(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isSuperAdmin = user?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
    if (user && (role === "admin" || isSuperAdmin)) {
      fetchPosts();
    }
  }, [user, role, fetchPosts]);

  if (authLoading || roleLoading || !user || role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Verifying access...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                <Link href="/admin">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Posts Management
                </h1>
                <p className="mt-1 text-md text-gray-600">
                  View, edit, and manage all user posts.
                </p>
              </div>
            </div>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>All Posts</CardTitle>
            <CardDescription>
              A list of all posts in the system. Found {posts.length} posts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-red-500 text-center py-10">
                Error loading posts: {error}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium max-w-sm truncate">
                        {post.content}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{post.profiles?.[0]?.full_name || "N/A"}</span>
                          <span className="text-xs text-muted-foreground">
                            @{post.profiles?.[0]?.username || "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(post.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
  );
};

export default PostsManagementPage;

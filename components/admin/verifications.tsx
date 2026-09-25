// components/admin/verifications.tsx
import { useEffect, useState, useCallback } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";

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
import { Loader2, Eye, CheckCircle, XCircle } from "lucide-react";

// Matches the shape from the API route
interface VerificationSubmission {
  id: string;
  created_at: string;
  verification_type: 'identity' | 'experience' | 'education';
  target_entity_id: string | null;
  document_url: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    username: string | null;
  } | null;
}

const VerificationsManagementPage = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<VerificationSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ADMIN CHECK (uses SUPER_ADMIN_EMAIL env var)
// ---------- ADMIN CHECK (BYPASS WITH NO REDIRECTS) ----------
useEffect(() => {
  const checkAdmin = async () => {
    if (user === undefined) return; // still loading
    if (user === null) {
      console.warn("User not logged in — but bypassing.");
      return;
    }

    const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "";
    let userEmail: string | null = (user as any)?.email ?? null;

    if (!userEmail) {
      const { data } = await supabase.auth.getSession();
      userEmail = data?.session?.user?.email ?? null;
    }

    const isSuperAdmin =
      userEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    if (isSuperAdmin) {
      console.log("✅ Super admin detected — bypass granted");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    if (!isAdmin) {
      console.warn("⛔ Access denied — would normally redirect, but bypassing.");
      return;
    }
  };

  checkAdmin();
}, [user, supabase]);
// ----------------------------------------------------------------

  // --------------------------------------------------------------------------------------------

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const res = await fetch("/api/admin/verifications", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${res.status}`);
      }

      const data: VerificationSubmission[] = await res.json();
      setSubmissions(data || []);
    } catch (err: any) {
      setError(err.message || "Unknown error");
      console.error("Error fetching submissions:", err);
      if (err.message.includes("Forbidden") || err.message.includes("Not authenticated")) {
        router.replace("/admin/login?error=permission-denied");
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    if (user) {
      fetchSubmissions();
    } else if (user === null) {
      router.replace("/admin/login");
    }
  }, [user, fetchSubmissions, router]);

  const handleApprove = async (submissionId: string, userId: string) => {
    setUpdatingId(submissionId);
    try {
      const response = await fetch('/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', submission_id: submissionId, user_id: userId }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        let errorMsg = `Approval failed: ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.error || errorMsg;
        } catch (e) { /* Not a JSON response, use statusText */ }
        throw new Error(errorMsg);
      }
      // Refetch submissions to get the updated list
      await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'earn_verification',
          verification_id: submissionId,
          verified_user_id: userId,
        }),
      }).catch(creditError => {
        // Log credit error but don't block the UI flow
        console.error('Failed to award credits:', creditError);
      });
      await fetchSubmissions();
    } catch (error) {
      console.error('Approval failed:', error);
      // You could show an error toast here
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = async (submissionId: string, userId: string) => {
    const notes = window.prompt("Reason for rejection (optional):");
    if (notes === null) return; // User cancelled the prompt

    setUpdatingId(submissionId);
    try {
      const response = await fetch('/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', submission_id: submissionId, user_id: userId, notes }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        let errorMsg = `Rejection failed: ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.error || errorMsg;
        } catch (e) { /* Not a JSON response, use statusText */ }
        throw new Error(errorMsg);
      }
      // Refetch submissions to get the updated list
      await fetchSubmissions();
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Verifications</CardTitle>
        <CardDescription>
          Review and approve or reject user-submitted documents. Found {submissions.length} pending submissions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-red-500 text-center py-10">
            Error loading submissions: {error}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Submitted On</TableHead>
                <TableHead>Document</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    <div className="font-medium">{sub.profiles?.full_name || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">
                      @{sub.profiles?.username || 'user'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{sub.verification_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(sub.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <a
                      href={supabase.storage.from('verification-documents').getPublicUrl(sub.document_url).data.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" /> View
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="icon" variant="outline" onClick={() => handleApprove(sub.id, sub.user_id)} disabled={!!updatingId}>
                        {updatingId === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => handleReject(sub.id, sub.user_id)} disabled={!!updatingId}>
                        {updatingId === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default VerificationsManagementPage;

// pages/test/github-data.tsx

import { GetServerSidePropsContext } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define the shape of the data we expect from the GitHub API
interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
}

interface GitHubDataPageProps {
  repos: GitHubRepo[] | null;
  error: string | null;
}

export default function GitHubDataPage({ repos, error }: GitHubDataPageProps) {
  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">An Error Occurred</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            {error.includes("not connected") && (
              <Button asChild className="mt-4">
                <Link href="/profile/edit">Connect your GitHub account</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Your GitHub Repositories</h1>
      {repos && repos.length > 0 ? (
        <ul className="space-y-4">
          {repos.map((repo) => (
            <li key={repo.id}>
              <Card>
                <CardHeader>
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                    {repo.full_name}
                  </a>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mt-1">{repo.description}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-3">
                    <span>⭐ {repo.stargazers_count} Stars</span>
                    <span>👁️ {repo.watchers_count} Watchers</span>
                    <span>🍴 {repo.forks_count} Forks</span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No public repositories found for your connected GitHub account.</p>
            <p className="text-xs mt-2">If you've recently created repositories, it might take a moment to sync.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const supabase = createPagesServerClient(ctx);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { redirect: { destination: "/login", permanent: false } };

  const { data: githubProfile, error: profileError } = await supabase
    .from("github_profiles")
    .select("token")
    .eq("id", session.user.id)
    .single();

  if (profileError || !githubProfile?.token) {
    return { props: { repos: null, error: "GitHub account not connected or token is missing." } };
  }

  const reposResp = await fetch("https://api.github.com/user/repos?type=owner&sort=updated", {
    headers: { Authorization: `Bearer ${githubProfile.token}` },
  });

  if (!reposResp.ok) return { props: { repos: null, error: "Failed to fetch data from GitHub. The token might be expired or invalid." } };

  const repos: GitHubRepo[] = await reposResp.json();
  return { props: { repos, error: null, initialSession: session } };
}
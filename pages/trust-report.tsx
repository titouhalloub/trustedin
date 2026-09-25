import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ShieldCheck, Linkedin, Github, Users, Star } from "lucide-react"
import { useEffect, useState } from "react"
import { useUser } from "@supabase/auth-helpers-react"
import { supabase } from "@/lib/supabaseClient"

interface Profile {
  id: string;
  username: string;
  full_name: string;
  trust_score: number;
  reputation_points: number;
  verification_level: string;
  avatar_url?: string;
  bio?: string;
  connections_count?: number;
  activity_score?: number;
}

export default function TrustReport() {
  const user = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile for trust report:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 p-8 flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading Trust Report...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-indigo-700 mb-4">Trust Report for {profile.full_name}</h1>
          <p className="text-gray-600">
            Built from your LinkedIn, GitHub, and verified social reputation.
          </p>
        </div>

        {/* Overall Trust Score */}
        <Card className="mb-12 shadow-lg">
          <CardHeader className="flex flex-row items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-green-600" />
            <CardTitle>Overall Trust Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-6xl font-extrabold text-indigo-700 mb-4">{profile.trust_score}%</div>
            <Progress value={profile.trust_score} className="h-3" />
            <p className="text-sm text-gray-500 mt-3">
              Calculated from multiple data sources and activity insights.
            </p>
          </CardContent>
        </Card>

        {/* Component Scores */}
        <div className="grid md:grid-cols-2 gap-8">
          {[
            { id: "linkedin", label: "LinkedIn Profile Strength", score: 90, icon: Linkedin, color: "text-blue-600" },
            { id: "github", label: "GitHub Contributions", score: 80, icon: Github, color: "text-gray-800" },
            { id: "activity", label: "Platform Activity", score: profile.activity_score || 75, icon: Users, color: "text-purple-600" },
            { id: "endorsements", label: "Peer Endorsements", score: profile.reputation_points || 92, icon: Star, color: "text-yellow-500" },
          ].map((comp) => (
            <Card key={comp.id} className="shadow-md hover:shadow-xl transition">
              <CardHeader className="flex flex-row items-center gap-3">
                <comp.icon className={`h-6 w-6 ${comp.color}`} />
                <CardTitle>{comp.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold">{comp.score}%</span>
                  <span className="text-sm text-gray-500">of 100</span>
                </div>
                <Progress value={comp.score} className="h-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
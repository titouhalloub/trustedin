"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AnalyticsData {
  total_applicants: number;
  open_jobs: number;
  total_hired: number;
  applicants_per_month: { name: string; applicants: number }[];
  pipeline_stats: { [key: string]: number };
}


export const AnalyticsDashboard = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { toast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: analyticsData, error } = await supabase
        .rpc('get_recruiter_analytics', { p_recruiter_id: user.id })
        .single();

      if (error) throw error;

      setData(analyticsData as AnalyticsData);
    } catch (error: any) {
      toast({
        title: 'Error fetching analytics',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <p>Could not load analytics data.</p>;
  }

  const pipelineData = [
    { name: 'Applied', count: data.pipeline_stats.applied || 0 },
    { name: 'Screening', count: data.pipeline_stats.screening || 0 },
    { name: 'Interview', count: data.pipeline_stats.interview || 0 },
    { name: 'Offer', count: data.pipeline_stats.offer || 0 },
    { name: 'Hired', count: data.pipeline_stats.hired || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Applicants</CardTitle>
          </CardHeader>
          <CardContent><div className="text-4xl font-bold">{data.total_applicants}</div></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open Jobs</CardTitle>
          </CardHeader>
          <CardContent><div className="text-4xl font-bold">{data.open_jobs}</div></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Hires</CardTitle>
          </CardHeader>
          <CardContent><div className="text-4xl font-bold">{data.total_hired}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applicants per Month</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.applicants_per_month}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="applicants" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hiring Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

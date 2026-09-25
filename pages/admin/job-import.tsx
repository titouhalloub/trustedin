import { useState, FormEvent, useRef } from 'react';
import { GetServerSidePropsContext } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UploadCloud } from 'lucide-react';
import { Layout } from '@/components/Layout';

export default function JobImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select a CSV file to upload.',
      });
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('jobsCsv', file);

    try {
      const response = await fetch('/api/admin/import-from-csv', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred.');
      }

      toast({
        title: 'Import Successful',
        description: `${result.importedCount} jobs were successfully imported.`,
      });
      setFile(null); // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the file input element
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Import Jobs from CSV</CardTitle>
            <CardDescription>
              Upload a CSV file to bulk-add jobs. The jobs will be posted on behalf of the system user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="csv-upload">CSV File</Label>
                <Input id="csv-upload" type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} />
                <p className="text-xs text-muted-foreground">
                  Required columns: title, location, description, employment_type, application_url
                </p>
              </div>
              <Button type="submit" disabled={isLoading || !file} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isLoading ? 'Importing...' : 'Upload and Import Jobs'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/auth', permanent: false } };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();

  // Protect this page: only allow users with the 'admin' role.
  if (profile?.role !== 'admin') {
    return { notFound: true }; // Or redirect to a 'not authorized' page
  }

  return { props: {} };
};
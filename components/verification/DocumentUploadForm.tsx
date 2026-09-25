// components/verification/DocumentUploadForm.tsx
import { useState } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud } from 'lucide-react';

interface DocumentUploadFormProps {
  onSubmission: () => void;
}

export default function DocumentUploadForm({ onSubmission }: DocumentUploadFormProps) {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !user) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Upload the file to a private Supabase Storage bucket
      // Using crypto.randomUUID() for a more unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, file);

      if (uploadError) {
        // The storage client can throw errors that are not of type `Error`.
        // It's good practice to ensure we have a string message.
        const errorMessage = typeof uploadError === 'object' && uploadError !== null && 'message' in uploadError ? uploadError.message : 'Failed to upload document.';
        throw new Error(`Storage Error: ${errorMessage}`);
      }

      // 2. Call our API to create the submission record
      // getSession() will return the current session, refreshing it if necessary.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found.');
      }

      const res = await fetch('/api/verifications/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          verification_type: 'identity',
          document_url: filePath,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to create submission record.');
      }

      // Notify parent component of successful submission
      onSubmission();

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Your Document</CardTitle>
        <CardDescription>
          Please upload a government-issued ID (e.g., Driver's License, Passport) to verify your identity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="file" onChange={handleFileChange} required accept="image/png, image/jpeg, application/pdf" />
          {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
          <Button type="submit" disabled={!file || loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4 mr-2" />
            )}
            Submit for Verification
          </Button>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
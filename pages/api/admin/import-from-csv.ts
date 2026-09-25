import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import Papa from 'papaparse';

// Disable Next.js body parser for this route to allow formidable to handle the file stream
export const config = {
  api: {
    bodyParser: false,
  },
};

// Define the expected structure of a row in the CSV.
// Adjust this to match your CSV file's column headers exactly.
interface CsvJobRow {
  [key: string]: string | undefined; // Allow string indexing
  title: string;
  location: string;
  description: string;
  employment_type: string; // e.g., 'Full-time'
  application_url: string;
  seniority_level?: string;
  salary_min?: string;
  salary_max?: string;
  salary_currency?: string;
  salary_type?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = createPagesServerClient({ req, res });

  // 1. Check for user session and admin role
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (userProfile?.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // 2. Find the target user to post on behalf of
  const posterId = process.env.CSV_IMPORT_POSTER_ID;
  if (!posterId) {
    return res.status(500).json({ error: 'CSV_IMPORT_POSTER_ID not configured' });
  }

  // 3. Parse the uploaded file
  const form = formidable({});
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to parse form data.' });
    }

    const file = files.jobsCsv?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No CSV file uploaded.' });
    }

    try {
      const fileContent = fs.readFileSync(file.filepath, 'utf8');
      const { data: parsedRows, meta } = Papa.parse<CsvJobRow>(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      // Add validation for required columns
      const requiredColumns = ['title', 'location', 'description', 'employment_type', 'application_url', 'seniority_level', 'salary_min', 'salary_max', 'salary_currency', 'salary_type'];
      const actualHeaders = meta.fields || [];
      const headerMap: { [key: string]: string } = {};
      actualHeaders.forEach(h => {
        headerMap[h.trim().toLowerCase()] = h;
      });

      const missingColumns = requiredColumns.filter(col => col.endsWith('_url') || col.endsWith('_type') || ['title', 'location', 'description'].includes(col)).filter(col => !headerMap[col]);

      if (missingColumns.length > 0) {
        return res.status(400).json({
          error: `Missing required columns in CSV: ${missingColumns.join(', ')}`,
        });
      }

      if (parsedRows.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty or contains no data rows.' });
      }

      // 4. Transform data and insert into the database
            const jobsToInsert = parsedRows.map(row => {
        const salaryMin = row[headerMap['salary_min']];
        const salaryMax = row[headerMap['salary_max']];
        return {
          recruiter_id: posterId, // Corrected from posterId
          title: row[headerMap['title']],
          location: row[headerMap['location']],
          description: row[headerMap['description']],
          employment_type: row[headerMap['employment_type']],
          application_contact: row[headerMap['application_url']],
          application_method: 'url' as const, // Assuming all are URL applications
          seniority_level: row[headerMap['seniority_level']],
          salary_min: salaryMin ? parseInt(salaryMin, 10) : null,
          salary_max: salaryMax ? parseInt(salaryMax, 10) : null,
          salary_currency: row[headerMap['salary_currency']],
          salary_type: row[headerMap['salary_type']],
        };
      });

      const { error: insertError } = await supabase.from('jobs').insert(jobsToInsert);

      if (insertError) {
        throw insertError;
      }

      res.status(200).json({ message: 'Import successful', importedCount: jobsToInsert.length });
    } catch (error: any) {
      console.error('CSV Import Error:', error);
      res.status(500).json({ error: `Failed to process CSV: ${error.message}` });
    }
  });
}
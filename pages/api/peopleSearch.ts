import type { NextApiRequest, NextApiResponse } from 'next';

// Define a type for the expected request body from the frontend.
type SearchRequestBody = {
  query: string;
};

// Define a type for the successful response from our API route.
type EnrichedData = {
  type: 'person' | 'organization';
  data: any;
};

type ErrorResponse = {
  error: string;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EnrichedData | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    console.error('Apollo API key is not configured on the server.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const { query }: SearchRequestBody = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'A query (email or domain) is required.' });
  }

  const isEmail = query.includes('@');
  const endpoint = isEmail
    ? 'https://api.apollo.io/v1/people/match'
    : 'https://api.apollo.io/v1/organizations/enrich';

  const requestBody = isEmail ? { email: query } : { domain: query };

  try {
    const apolloResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await apolloResponse.json();

    if (!apolloResponse.ok) {
      return res.status(apolloResponse.status).json({
        error: 'Failed to fetch from Apollo',
        message: responseData.error_message || responseData.error || 'An unknown error occurred',
      });
    }

    if (isEmail) {
      if (responseData.person) {
        return res.status(200).json({ type: 'person', data: responseData.person });
      }
      return res.status(404).json({ error: 'No person found for this email.' });
    } else {
      if (responseData.organization) {
        return res.status(200).json({ type: 'organization', data: responseData.organization });
      }
      return res.status(404).json({ error: 'No organization found for this domain.' });
    }
  } catch (error) {
    console.error('Error calling Apollo Enrichment API:', error);
    res.status(500).json({ error: 'Internal Server Error', message: (error as Error).message });
  }
}
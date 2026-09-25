import type { NextApiRequest, NextApiResponse } from 'next';

// A simplified type for the Apollo Person data we expect.
// You can expand this based on the fields you need.
type ApolloPerson = {
  name: string;
  title: string;
  linkedin_url: string;
  organization: {
    name:string;
  };
};

type EnrichApiResponse = {
  person: ApolloPerson | null;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApolloPerson | ErrorResponse>
) {
  // Ensure this is a GET request
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Get and validate the email from the query parameters
  const { email } = req.query;
  if (typeof email !== 'string' || !email) {
    return res.status(400).json({ error: 'An email address is required.' });
  }

  // Securely access the API key from environment variables
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    console.error('Apollo API key is not configured on the server.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    // Call the Apollo API using a POST request as required by their docs
    const apolloResponse = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        email,
      }),
    });

    if (!apolloResponse.ok) {
      throw new Error(`Apollo API responded with status: ${apolloResponse.status}`);
    }

    const data: EnrichApiResponse = await apolloResponse.json();

    // Check if a person was found and return the appropriate response
    if (data.person) {
      return res.status(200).json(data.person);
    } else {
      return res.status(404).json({ error: 'No match found for this email.' });
    }
  } catch (error) {
    console.error('Error calling Apollo Enrichment API:', error);
    return res.status(500).json({ error: 'Failed to fetch data from Apollo.' });
  }
}
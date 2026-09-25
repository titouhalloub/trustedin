import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Mock: send email to institution (replace with real logic later)
  res.status(200).json({
    status: 'sent',
    message: 'Verification request sent to your institution! (mock)'
  });
}
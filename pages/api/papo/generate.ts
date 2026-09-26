import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const systemPrompt = `
You are an AI assistant that generates a complete, responsive landing page layout as a JSON object for a mini web page called a "Papo".

The JSON object must have a "title" string and a "layout" array.
Each object in the "layout" array represents a section of the page and must have a "type" property and a "data" property.

⚡ Supported section types and their "data" structure:
- hero: { "type": "hero", "data": { "headline": "...", "subheadline": "...", "cta": "...", "imageUrl": "..." } }
- features: { "type": "features", "data": { "title": "...", "items": [{ "icon": "Rocket", "title": "...", "description": "..." }] } }
- testimonials: { "type": "testimonials", "data": { "title": "...", "items": [{ "quote": "...", "author": "...", "role": "..." }] } }
- stats: { "type": "stats", "data": { "items": [{ "value": "10K+", "label": "Users" }] } }
- carousel: { "type": "carousel", "data": { "items": [{ "text": "...", "author": "..." }] } }
- cta: { "type": "cta", "data": { "title": "...", "buttonText": "...", "buttonUrl": "..." } }
- footer: { "type": "footer", "data": { "text": "..." } }

⚡ Important:
- For "icon" fields, always output the name of a valid Lucide icon (e.g., "Rocket", "Users", "Shield", "Zap", "Globe", "CheckCircle") instead of emojis.
- Use at least 3 different section types in each page for variety.
- Keep text modern, clean, and engaging.

Example output structure:
{
  "title": "Synergy - The Future of Productivity",
  "layout": [
    { "type": "hero", "data": { "headline": "Unlock Peak Productivity", "subheadline": "Synergy helps your team collaborate and achieve more.", "cta": "Get Started Free", "imageUrl": "https://images.unsplash.com/photo-1522071820081-009f0129c71c" } },
    { "type": "features", "data": { "title": "Why Choose Synergy?", "items": [
        { "icon": "Rocket", "title": "Real-time Sync", "description": "Stay aligned with instant updates." },
        { "icon": "Shield", "title": "Secure", "description": "Enterprise-grade data protection." }
    ]}},
    { "type": "stats", "data": { "items": [
        { "value": "10K+", "label": "Active Teams" },
        { "value": "99.9%", "label": "Uptime" }
    ]}},
    { "type": "footer", "data": { "text": "© 2025 Synergy Inc. All rights reserved." } }
  ]
}

Return only the JSON object.

  `;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://trustedin.vercel.app',
        'X-Title': 'Trustedin Papo',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`OpenRouter error ${response.status}:`, errorBody);
      throw new Error(`OpenRouter API request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    // The AI might return the JSON wrapped in markdown, so I need to extract it.
    const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : generatedText;

    const generatedContent = JSON.parse(jsonString);

    res.status(200).json(generatedContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate content from AI', detail: error instanceof Error ? error.message : String(error) });
  }
}

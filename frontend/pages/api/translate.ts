import type { NextApiRequest, NextApiResponse } from 'next';

type ErrorBody = { error: string };
type TranslateBody = { translatedText: string };

const DEFAULT_SOURCE = 'en';
const DEFAULT_TARGET = 'pt';

const getLibreTranslateUrl = () => {
  const base = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.de';
  return base.replace(/\/$/, '');
};

const protectLatex = (text: string) => {
  const placeholders: string[] = [];
  const regex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  const protectedText = text.replace(regex, (match) => {
    const token = `[[[MATH_${placeholders.length}]]]`;
    placeholders.push(match);
    return token;
  });
  return { protectedText, placeholders };
};

const restoreLatex = (text: string, placeholders: string[]) => {
  let restored = text;
  placeholders.forEach((value, index) => {
    const token = `[[[MATH_${index}]]]`;
    restored = restored.split(token).join(value);
  });
  return restored;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranslateBody | ErrorBody>
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let payload: { text?: string; source?: string; target?: string } = {};
  if (req.method === 'GET') {
    payload = {
      text: typeof req.query.text === 'string' ? req.query.text : '',
      source: typeof req.query.source === 'string' ? req.query.source : undefined,
      target: typeof req.query.target === 'string' ? req.query.target : undefined
    };
  } else if (typeof req.body === 'string') {
    try {
      payload = JSON.parse(req.body);
    } catch {
      payload = {};
    }
  } else {
    payload = req.body || {};
  }

  const text = typeof payload?.text === 'string' ? payload.text : '';
  if (!text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  const source = typeof payload?.source === 'string' ? payload.source : DEFAULT_SOURCE;
  const target = typeof payload?.target === 'string' ? payload.target : DEFAULT_TARGET;
  const apiKey = process.env.LIBRETRANSLATE_API_KEY || '';

  const { protectedText, placeholders } = protectLatex(text);

  const response = await fetch(`${getLibreTranslateUrl()}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: protectedText,
      source,
      target,
      format: 'text',
      api_key: apiKey || undefined
    })
  });

  if (!response.ok) {
    const body = await response.text();
    return res.status(response.status).json({ error: body || 'Translate failed' });
  }

  const data = (await response.json()) as { translatedText?: string };
  if (!data.translatedText) {
    return res.status(502).json({ error: 'Invalid translate response' });
  }

  const translatedText = restoreLatex(data.translatedText, placeholders);
  return res.status(200).json({ translatedText });
}

import type { NextApiRequest, NextApiResponse } from 'next';

type DailyType = 'derivatives' | 'integrals' | 'limits';

type ErrorBody = { error: string };

const DEFAULT_DAY = 108;

const getQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
};

const getHost = () => {
  const host = process.env.SUPABASE_HOST || 'btulehndzikuesmrzmhd.supabase.co';
  return host.replace(/^https?:\/\//, '');
};

const buildPath = (type: DailyType) => {
  if (type === 'derivatives') return 'daily_derivatives';
  if (type === 'integrals') return 'daily_integrals';
  return 'daily_limits';
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<unknown | ErrorBody>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const type = getQueryValue(req.query.type) as DailyType;
  const difficultyParam = getQueryValue(req.query.difficulty).toUpperCase();
  const dayParam = getQueryValue(req.query.day);

  if (!type || !['derivatives', 'integrals', 'limits'].includes(type)) {
    return res
      .status(400)
      .json({ error: 'type must be derivatives, integrals, or limits' });
  }

  const parsedDay = Number(dayParam || DEFAULT_DAY);
  if (!Number.isFinite(parsedDay)) {
    return res.status(400).json({ error: 'day must be a number' });
  }

  let difficulty = difficultyParam;
  if (type === 'limits') {
    if (difficulty && difficulty !== 'LIMIT') {
      return res.status(400).json({ error: 'difficulty for limits must be LIMIT' });
    }
    difficulty = 'LIMIT';
  } else if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
    return res.status(400).json({ error: 'difficulty must be EASY, MEDIUM, or HARD' });
  }

  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) {
    return res.status(500).json({
      error: 'SUPABASE_ANON_KEY is required to fetch daily puzzles.'
    });
  }

  const params = new URLSearchParams({
    select: 'day,difficulty,puzzle_data',
    difficulty: `eq.${difficulty}`,
    day: `eq.${parsedDay}`
  });

  const url = `https://${getHost()}/rest/v1/${buildPath(type)}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    return res.status(response.status).send(text);
  }

  const data = await response.json();
  return res.status(200).json(data);
}

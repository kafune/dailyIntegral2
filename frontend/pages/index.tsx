import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BlockMath } from 'react-katex';

type DailyType = 'derivatives' | 'integrals' | 'limits';

type PuzzleData = {
  day: number;
  slug: string;
  hints: string[];
  latex: string;
  title: string;
  difficulty: string;
  answerPretty?: string;
  solutionMarkdown?: string;
};

type DailyEntry = {
  day: number;
  difficulty: string;
  puzzle_data: PuzzleData;
};

type ResultState = {
  data: DailyEntry | null;
  error: string | null;
};

const DEFAULT_DAY = 108;
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
const BASE_DAY = 108;
const BASE_DATE_UTC = new Date(Date.UTC(2025, 11, 31));

const formatDate = (date: Date) => {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const toISODate = (date: Date) => {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${year}-${month}-${day}`;
};

const dateFromDay = (dayNumber: number) => {
  const date = new Date(BASE_DATE_UTC.getTime());
  date.setUTCDate(date.getUTCDate() + (dayNumber - BASE_DAY));
  return date;
};

const dayFromISODate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - BASE_DATE_UTC.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return BASE_DAY + diffDays;
};

export default function Home() {
  const [day, setDay] = useState(DEFAULT_DAY);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, ResultState>>({});
  const [isoDate, setIsoDate] = useState(toISODate(dateFromDay(DEFAULT_DAY)));

  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
  }, []);

  const computedDate = useMemo(() => {
    return formatDate(dateFromDay(day));
  }, [day]);

  const handleDayChange = (value: number) => {
    if (!Number.isFinite(value)) return;
    setDay(value);
    setIsoDate(toISODate(dateFromDay(value)));
  };

  const handleDateChange = (value: string) => {
    setIsoDate(value);
    const nextDay = dayFromISODate(value);
    if (nextDay !== null) {
      setDay(nextDay);
    }
  };

  const fetchDaily = async (type: DailyType, difficulty: string): Promise<ResultState> => {
    const url = new URL('/api/daily', apiBase);
    url.searchParams.set('type', type);
    url.searchParams.set('difficulty', difficulty);
    url.searchParams.set('day', String(day));

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        const text = await response.text();
        return { data: null, error: text || `Erro ${response.status}` };
      }
      const payload = (await response.json()) as DailyEntry[];
      return { data: payload[0] || null, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erro de rede' };
    }
  };

  const loadAll = async () => {
    setLoading(true);
    const next: Record<string, ResultState> = {};

    const derivativeTasks = DIFFICULTIES.map(async (difficulty) => {
      const key = `derivatives-${difficulty}`;
      next[key] = await fetchDaily('derivatives', difficulty);
    });

    const integralTasks = DIFFICULTIES.map(async (difficulty) => {
      const key = `integrals-${difficulty}`;
      next[key] = await fetchDaily('integrals', difficulty);
    });

    const limitKey = 'limits-LIMIT';
    const limitTask = fetchDaily('limits', 'LIMIT').then((result) => {
      next[limitKey] = result;
    });

    await Promise.all([...derivativeTasks, ...integralTasks, limitTask]);
    setResults(next);
    setLoading(false);
  };

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Daily Integralforme</p>
          <h1>Resolva. Compartilhe. Compare.</h1>
          <p className="subtitle">
            Viewer para integrais, derivadas e limites diários. Sem distrações, só a questão.
          </p>
        </div>
        <div className="controls">
          <label className="field">
            <span>Data</span>
            <input
              type="date"
              value={isoDate}
              onChange={(event) => handleDateChange(event.target.value)}
            />
          </label>
          <button className="primary" onClick={loadAll} disabled={loading}>
            {loading ? 'Carregando...' : 'Carregar desafios'}
          </button>
          <p className="hint">Dia atual usado no site: 108</p>
          <p className="hint">Data equivalente: {computedDate}</p>
        </div>
      </header>

      <section className="grid">
        <div className="column">
          <h2>Derivadas</h2>
          {DIFFICULTIES.map((difficulty) => {
            const key = `derivatives-${difficulty}`;
            const state = results[key];
            return (
              <PuzzleCard
                key={key}
                title={`Dificuldade ${difficulty}`}
                state={state}
                href={`/puzzle?type=derivatives&difficulty=${difficulty}&day=${day}`}
              />
            );
          })}
        </div>

        <div className="column">
          <h2>Integrais</h2>
          {DIFFICULTIES.map((difficulty) => {
            const key = `integrals-${difficulty}`;
            const state = results[key];
            return (
              <PuzzleCard
                key={key}
                title={`Dificuldade ${difficulty}`}
                state={state}
                href={`/puzzle?type=integrals&difficulty=${difficulty}&day=${day}`}
              />
            );
          })}
        </div>

        <div className="column">
          <h2>Limite</h2>
          <PuzzleCard
            title="Daily limit"
            state={results['limits-LIMIT']}
            href={`/puzzle?type=limits&difficulty=LIMIT&day=${day}`}
          />
        </div>
      </section>
    </main>
  );
}

function PuzzleCard({
  title,
  state,
  href
}: {
  title: string;
  state?: ResultState;
  href: string;
}) {
  return (
    <Link className="card-link" href={href}>
      <article className="card card-clickable">
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      {!state && <p className="muted">Clique em carregar para ver o desafio.</p>}
      {state?.error && <p className="error">{state.error}</p>}
      {state?.data && (
        <div className="puzzle">
          <BlockMath math={state.data.puzzle_data.latex} />
        </div>
      )}
      {state && !state.data && !state.error && (
        <p className="muted">Nenhum resultado encontrado.</p>
      )}
      <div className="card-footer">Ver detalhes →</div>
      </article>
    </Link>
  );
}

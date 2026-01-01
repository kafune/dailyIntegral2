import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  const [results, setResults] = useState<Record<string, ResultState>>({});
  const [loadingByKey, setLoadingByKey] = useState<Record<string, boolean>>({});
  const [isoDate, setIsoDate] = useState(toISODate(dateFromDay(DEFAULT_DAY)));

  const computedDate = useMemo(() => {
    return formatDate(dateFromDay(day));
  }, [day]);

  const buildApiUrl = (params: URLSearchParams) => {
    const base = process.env.NEXT_PUBLIC_API_BASE || '';
    if (!base) {
      return `/api/daily?${params.toString()}`;
    }
    const url = new URL('/api/daily', base);
    params.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  };

  const handleDateChange = (value: string) => {
    setIsoDate(value);
    const nextDay = dayFromISODate(value);
    if (nextDay !== null) {
      setDay(nextDay);
    }
  };

  useEffect(() => {
    setResults({});
    setLoadingByKey({});
  }, [day]);

  const fetchDaily = async (type: DailyType, difficulty: string): Promise<ResultState> => {
    const params = new URLSearchParams({
      type,
      difficulty,
      day: String(day)
    });
    const url = buildApiUrl(params);

    try {
      const response = await fetch(url);
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

  const loadOne = async (key: string, type: DailyType, difficulty: string) => {
    setLoadingByKey((prev) => ({ ...prev, [key]: true }));
    const result = await fetchDaily(type, difficulty);
    setResults((prev) => ({ ...prev, [key]: result }));
    setLoadingByKey((prev) => ({ ...prev, [key]: false }));
  };

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Integralforme Diário</p>
          <h1>Resolva. Compartilhe. Compare.</h1>
          <p className="subtitle">
            Visualizador de integrais, derivadas e limites diários. Sem distrações, só a questão.
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
          <p className="hint">Dia no sistema: {day}</p>
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
                loading={loadingByKey[key]}
                onClick={() => loadOne(key, 'derivatives', difficulty)}
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
                loading={loadingByKey[key]}
                onClick={() => loadOne(key, 'integrals', difficulty)}
                href={`/puzzle?type=integrals&difficulty=${difficulty}&day=${day}`}
              />
            );
          })}
        </div>

        <div className="column">
          <h2>Limite</h2>
          <PuzzleCard
            title="Limite diário"
            state={results['limits-LIMIT']}
            loading={loadingByKey['limits-LIMIT']}
            onClick={() => loadOne('limits-LIMIT', 'limits', 'LIMIT')}
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
  href,
  loading,
  onClick
}: {
  title: string;
  state?: ResultState;
  href: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <article
      className="card card-clickable"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      {!state && !loading && <p className="muted">Clique para carregar o desafio.</p>}
      {loading && <p className="muted">Carregando...</p>}
      {state?.error && <p className="error">{state.error}</p>}
      {state?.data && (
        <div className="puzzle">
          <BlockMath math={state.data.puzzle_data.latex} />
        </div>
      )}
      {state && !state.data && !state.error && !loading && (
        <p className="muted">Nenhum resultado encontrado.</p>
      )}
      <div className="card-footer">
        <Link
          className="card-link"
          href={href}
          onClick={(event) => event.stopPropagation()}
        >
          Ver detalhes →
        </Link>
      </div>
    </article>
  );
}

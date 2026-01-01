import Link from 'next/link';
import { useMemo, useState } from 'react';

type DailyType = 'derivatives' | 'integrals' | 'limits';

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
  const [isoDate, setIsoDate] = useState(toISODate(dateFromDay(DEFAULT_DAY)));

  const computedDate = useMemo(() => {
    return formatDate(dateFromDay(day));
  }, [day]);

  const handleDateChange = (value: string) => {
    setIsoDate(value);
    const nextDay = dayFromISODate(value);
    if (nextDay !== null) {
      setDay(nextDay);
    }
  };

  const buildHref = (type: DailyType, difficulty: string) => {
    return `/puzzle?type=${type}&difficulty=${difficulty}&day=${day}`;
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
            return (
              <PuzzleCard
                key={key}
                title={`Dificuldade ${difficulty}`}
                href={buildHref('derivatives', difficulty)}
              />
            );
          })}
        </div>

        <div className="column">
          <h2>Integrais</h2>
          {DIFFICULTIES.map((difficulty) => {
            const key = `integrals-${difficulty}`;
            return (
              <PuzzleCard
                key={key}
                title={`Dificuldade ${difficulty}`}
                href={buildHref('integrals', difficulty)}
              />
            );
          })}
        </div>

        <div className="column">
          <h2>Limite</h2>
          <PuzzleCard
            title="Limite diário"
            href={buildHref('limits', 'LIMIT')}
          />
        </div>
      </section>
    </main>
  );
}

function PuzzleCard({
  title,
  href
}: {
  title: string;
  href: string;
}) {
  return (
    <Link className="card-link" href={href}>
      <article className="card card-clickable">
        <div className="card-header">
          <h3>{title}</h3>
        </div>
        <p className="muted">Clique para ver o desafio.</p>
        <div className="card-footer">Ver detalhes →</div>
      </article>
    </Link>
  );
}

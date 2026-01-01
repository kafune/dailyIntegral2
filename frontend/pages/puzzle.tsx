import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { BlockMath } from 'react-katex';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

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

export default function PuzzlePage() {
  const router = useRouter();
  const [state, setState] = useState<ResultState>({ data: null, error: null });
  const [loading, setLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [translatedSolution, setTranslatedSolution] = useState<string | null>(null);
  const [useTranslation, setUseTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const buildApiUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || '';
    return (params: URLSearchParams) => {
      if (!base) {
        return `/api/daily?${params.toString()}`;
      }
      const url = new URL('/api/daily', base);
      params.forEach((value, key) => url.searchParams.set(key, value));
      return url.toString();
    };
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const type = String(router.query.type || '');
    const difficulty = String(router.query.difficulty || '');
    const day = String(router.query.day || '');

    setShowAnswer(false);
    setShowSolution(false);
    setShowHints(false);
    setTranslatedSolution(null);
    setUseTranslation(false);
    setTranslating(false);
    setTranslateError(null);

    if (!type || !difficulty || !day) {
      setState({ data: null, error: 'Parâmetros inválidos.' });
      return;
    }

    const fetchPuzzle = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        type,
        difficulty,
        day
      });
      const url = buildApiUrl(params);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          const text = await response.text();
          setState({ data: null, error: text || `Erro ${response.status}` });
          return;
        }
        const payload = (await response.json()) as DailyEntry[];
        setState({ data: payload[0] || null, error: null });
      } catch (err) {
        setState({ data: null, error: err instanceof Error ? err.message : 'Erro de rede' });
      } finally {
        setLoading(false);
      }
    };

    fetchPuzzle();
  }, [buildApiUrl, router.isReady, router.query]);

  const translateSolution = async () => {
    if (translating || !state.data?.puzzle_data.solutionMarkdown) return;

    if (translatedSolution) {
      setUseTranslation((value) => !value);
      return;
    }

    setTranslating(true);
    setTranslateError(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: state.data.puzzle_data.solutionMarkdown, source: 'en', target: 'pt' })
      });

      if (!response.ok) {
        const text = await response.text();
        setTranslateError(text || 'Falha ao traduzir.');
        return;
      }

      const payload = (await response.json()) as { translatedText?: string };
      if (!payload.translatedText) {
        setTranslateError('Resposta inválida da tradução.');
        return;
      }

      setTranslatedSolution(payload.translatedText);
      setUseTranslation(true);
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'Falha ao traduzir.');
    } finally {
      setTranslating(false);
    }
  };

  const solutionLabel = () => {
    if (translating) return 'Traduzindo...';
    if (!translatedSolution) return 'Traduzir para PT-BR';
    return useTranslation ? 'Ver original' : 'Ver tradução';
  };

  return (
    <main className="page">
      <header className="detail-header">
        <div>
          <p className="eyebrow">Integralforme Diário</p>
          <h1>Detalhe do desafio</h1>
          <p className="subtitle">Abra o enunciado completo e compartilhe a solução.</p>
        </div>
        <div className="controls">
          <Link className="primary" href="/">
            Voltar
          </Link>
        </div>
      </header>

      {loading && <p className="muted">Carregando desafio...</p>}
      {state.error && <p className="error">{state.error}</p>}

      {state.data && (
        <section className="detail-card">
          <div className="detail-title">
            <h2>{state.data.puzzle_data.title}</h2>
            <p className="muted">
              Dia {state.data.day} • {state.data.puzzle_data.difficulty}
            </p>
          </div>

          <div className="puzzle">
            <BlockMath math={state.data.puzzle_data.latex} />
          </div>

          {state.data.puzzle_data.hints?.length ? (
            <div className="detail-section">
              <h3>Dicas</h3>
              <button
                className="secondary"
                type="button"
                onClick={() => setShowHints((value) => !value)}
              >
                {showHints ? 'Esconder dicas' : 'Mostrar dicas'}
              </button>
              {showHints && (
                <ul>
                  {state.data.puzzle_data.hints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {state.data.puzzle_data.answerPretty ? (
            <div className="detail-section">
              <h3>Resposta</h3>
              <button
                className="secondary"
                type="button"
                onClick={() => setShowAnswer((value) => !value)}
              >
                {showAnswer ? 'Esconder resposta' : 'Mostrar resposta'}
              </button>
              {showAnswer && <p className="answer">{state.data.puzzle_data.answerPretty}</p>}
            </div>
          ) : null}

          {state.data.puzzle_data.solutionMarkdown ? (
            <div className="detail-section">
              <h3>Solução</h3>
              <div className="toggle-row">
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setShowSolution((value) => !value)}
                >
                  {showSolution ? 'Esconder solução' : 'Mostrar solução'}
                </button>
                {showSolution && (
                  <button
                    className="secondary"
                    type="button"
                    onClick={translateSolution}
                    disabled={translating}
                  >
                    {solutionLabel()}
                  </button>
                )}
              </div>
              {translateError && <p className="error">{translateError}</p>}
              {showSolution && (
                <div className="solution markdown">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {useTranslation && translatedSolution
                      ? translatedSolution
                      : state.data.puzzle_data.solutionMarkdown}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}

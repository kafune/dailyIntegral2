import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type DailyType = 'derivatives' | 'integrals' | 'limits';

export type PuzzleData = {
  day: number;
  slug: string;
  hints: string[];
  latex: string;
  title: string;
  difficulty: string;
  answerPretty?: string;
  solutionMarkdown?: string;
};

export type DailyEntry = {
  day: number;
  difficulty: string;
  puzzle_data: PuzzleData;
};

@Injectable()
export class DailyService {
  private cachedAnonKey: string | null = null;

  private getHost(): string {
    const host = process.env.SUPABASE_HOST || 'btulehndzikuesmrzmhd.supabase.co';
    return host.replace(/^https?:\/\//, '');
  }

  private getAnonKey(): string | null {
    if (process.env.SUPABASE_ANON_KEY) {
      return process.env.SUPABASE_ANON_KEY;
    }
    if (this.cachedAnonKey !== null) {
      return this.cachedAnonKey;
    }

    const requestsPath = path.resolve(__dirname, '..', '..', 'requests');
    try {
      const content = fs.readFileSync(requestsPath, 'utf-8');
      const match = content.match(/Authorization:\s*Bearer\s+([A-Za-z0-9._-]+)/);
      if (match?.[1]) {
        this.cachedAnonKey = match[1];
        return this.cachedAnonKey;
      }
    } catch {
      // No local requests file or unreadable.
    }

    this.cachedAnonKey = '';
    return null;
  }

  private buildPath(type: DailyType): string {
    if (type === 'derivatives') return 'daily_derivatives';
    if (type === 'integrals') return 'daily_integrals';
    return 'daily_limits';
  }

  private buildUrl(type: DailyType, difficulty: string, day: number): string {
    const path = this.buildPath(type);
    const params = new URLSearchParams({
      select: 'day,difficulty,puzzle_data',
      difficulty: `eq.${difficulty}`,
      day: `eq.${day}`
    });
    return `https://${this.getHost()}/rest/v1/${path}?${params.toString()}`;
  }

  async fetchDaily(type: DailyType, difficulty: string, day: number): Promise<DailyEntry[]> {
    const url = this.buildUrl(type, difficulty, day);
    const headers: Record<string, string> = {
      Accept: 'application/json'
    };

    const anonKey = this.getAnonKey();
    if (anonKey) {
      headers.apikey = anonKey;
      headers.Authorization = `Bearer ${anonKey}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase error ${response.status}: ${text}`);
    }

    return response.json();
  }
}

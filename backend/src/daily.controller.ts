import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { DailyService, DailyType } from './daily.service';

@Controller('api/daily')
export class DailyController {
  constructor(private readonly dailyService: DailyService) {}

  @Get()
  async getDaily(
    @Query('type') type: DailyType,
    @Query('difficulty') difficulty: string,
    @Query('day') day: string
  ) {
    if (!type || !['derivatives', 'integrals', 'limits'].includes(type)) {
      throw new BadRequestException('type must be derivatives, integrals, or limits');
    }

    const parsedDay = Number(day || '108');
    if (!Number.isFinite(parsedDay)) {
      throw new BadRequestException('day must be a number');
    }

    const normalizedDifficulty = (difficulty || '').toUpperCase();
    if (type === 'limits') {
      if (normalizedDifficulty && normalizedDifficulty !== 'LIMIT') {
        throw new BadRequestException('difficulty for limits must be LIMIT');
      }
      return this.dailyService.fetchDaily(type, 'LIMIT', parsedDay);
    }

    if (!['EASY', 'MEDIUM', 'HARD'].includes(normalizedDifficulty)) {
      throw new BadRequestException('difficulty must be EASY, MEDIUM, or HARD');
    }

    return this.dailyService.fetchDaily(type, normalizedDifficulty, parsedDay);
  }
}

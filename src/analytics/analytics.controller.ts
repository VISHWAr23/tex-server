import { Controller, Get, Query, Res } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type { Response } from 'express';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('salary')
  async getSalaryAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('workerId') workerId?: string,
  ) {
    const workerIdNum = workerId ? parseInt(workerId, 10) : undefined;
    return this.analyticsService.getSalaryAnalytics(startDate, endDate, workerIdNum);
  }

  @Get('revenue')
  async getRevenueAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('companyId') companyId?: string,
  ) {
    const companyIdNum = companyId ? parseInt(companyId, 10) : undefined;
    return this.analyticsService.getRevenueAnalytics(startDate, endDate, companyIdNum);
  }

  @Get('financial-overview')
  async getFinancialOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getFinancialOverview(startDate, endDate);
  }

  @Get('worker-productivity')
  async getWorkerProductivity(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getWorkerProductivity(startDate, endDate);
  }

  @Get('profit-margin')
  async getProfitMarginAnalysis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getProfitMarginAnalysis(startDate, endDate);
  }

  @Get('worker/:workerId/salary')
  async getWorkerSalaryBreakdown(
    @Query('workerId') workerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const workerIdNum = parseInt(workerId, 10);
    return this.analyticsService.getWorkerSalaryBreakdown(workerIdNum, startDate, endDate);
  }

  @Get('export')
  async exportAnalyticsReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('reportType') reportType: string,
    @Res() res: Response,
  ) {
    const buffer = await this.analyticsService.exportAnalyticsReport(startDate, endDate, reportType);
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${reportType}-report-${startDate}-to-${endDate}.xlsx"`,
      'Content-Length': buffer.length,
    });
    
    res.end(buffer);
  }
}
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSalaryAnalytics(startDate?: string, endDate?: string, workerId?: number) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    
    // Get work-based salary data
    const workData = await this.prisma.work.findMany({
      where: {
        date: dateFilter,
        userId: workerId || undefined,
      },
      include: {
        user: true,
        description: true,
      },
    });

    // Get actual salary payments
    const salaryPayments = await this.prisma.salaryPayment.findMany({
      where: {
        date: dateFilter,
        userId: workerId || undefined,
      },
      include: {
        user: true,
      },
    });

    // Calculate total earned from work
    const totalFromWork = workData.reduce((sum, work) => sum + work.totalAmount, 0);
    const totalSalaryPaid = salaryPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Worker breakdown
    const workerMap = new Map();
    
    // Process work data
    workData.forEach(work => {
      const userId = work.userId;
      if (!workerMap.has(userId)) {
        workerMap.set(userId, {
          id: userId,
          name: work.user.name,
          totalEarned: 0,
          totalPaid: 0,
          workDays: 0,
          totalQuantity: 0,
          workEntries: [],
        });
      }
      
      const worker = workerMap.get(userId);
      worker.totalEarned += work.totalAmount;
      worker.totalQuantity += work.quantity;
      worker.workEntries.push(work);
      
      // Count unique work days
      const workDates = new Set(worker.workEntries.map(w => w.date.toDateString()));
      worker.workDays = workDates.size;
    });

    // Process salary payments
    salaryPayments.forEach(payment => {
      const userId = payment.userId;
      if (!workerMap.has(userId)) {
        workerMap.set(userId, {
          id: userId,
          name: payment.user.name,
          totalEarned: 0,
          totalPaid: 0,
          workDays: 0,
          totalQuantity: 0,
          workEntries: [],
        });
      }
      
      const worker = workerMap.get(userId);
      worker.totalPaid += payment.amount;
    });

    // Calculate metrics for each worker
    const workerBreakdown = Array.from(workerMap.values()).map(worker => ({
      id: worker.id,
      name: worker.name,
      totalEarned: worker.totalEarned,
      totalSalary: worker.totalPaid,
      workDays: worker.workDays,
      avgPerDay: worker.workDays > 0 ? worker.totalEarned / worker.workDays : 0,
      efficiency: worker.totalEarned > 0 ? (worker.totalPaid / worker.totalEarned) * 100 : 0,
      totalQuantity: worker.totalQuantity,
    }));

    const activeWorkers = workerBreakdown.length;
    
    return {
      total: {
        earned: totalFromWork,
        paid: totalSalaryPaid,
        amount: totalSalaryPaid, // For backward compatibility
        workers: activeWorkers,
      },
      average: {
        perWorker: activeWorkers > 0 ? totalSalaryPaid / activeWorkers : 0,
        earnedPerWorker: activeWorkers > 0 ? totalFromWork / activeWorkers : 0,
      },
      workerBreakdown: workerBreakdown.sort((a, b) => b.totalSalary - a.totalSalary),
    };
  }

  async getRevenueAnalytics(startDate?: string, endDate?: string, companyId?: number) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    
    const exports = await this.prisma.export.findMany({
      where: {
        date: dateFilter,
        companyId: companyId || undefined,
      },
      include: {
        company: true,
        description: true,
      },
    });

    const totalRevenue = exports.reduce((sum, exp) => sum + exp.totalAmount, 0);
    const totalQuantity = exports.reduce((sum, exp) => sum + exp.quantity, 0);
    
    // Company breakdown
    const companyMap = new Map();
    exports.forEach(exp => {
      const companyId = exp.companyId;
      if (!companyMap.has(companyId)) {
        companyMap.set(companyId, {
          id: companyId,
          name: exp.company.name,
          totalRevenue: 0,
          totalQuantity: 0,
          exportCount: 0,
        });
      }
      
      const company = companyMap.get(companyId);
      company.totalRevenue += exp.totalAmount;
      company.totalQuantity += exp.quantity;
      company.exportCount += 1;
    });

    const companyBreakdown = Array.from(companyMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    return {
      total: {
        amount: totalRevenue,
        quantity: totalQuantity,
        exports: exports.length,
        companies: companyBreakdown.length,
      },
      average: {
        pricePerUnit: totalQuantity > 0 ? totalRevenue / totalQuantity : 0,
        revenuePerExport: exports.length > 0 ? totalRevenue / exports.length : 0,
        revenuePerCompany: companyBreakdown.length > 0 ? totalRevenue / companyBreakdown.length : 0,
      },
      companyBreakdown,
    };
  }

  async getFinancialOverview(startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    
    // Get revenue data
    const revenueData = await this.getRevenueAnalytics(startDate, endDate);
    
    // Get expense data
    const workExpenses = await this.prisma.work.findMany({
      where: { date: dateFilter },
    });
    
    const salaryExpenses = await this.prisma.salaryPayment.findMany({
      where: { date: dateFilter },
    });
    
    const companyExpenses = await this.prisma.expense.findMany({
      where: {
        type: 'COMPANY',
        date: dateFilter,
      },
    });
    
    const homeExpenses = await this.prisma.expense.findMany({
      where: {
        type: 'HOME',
        date: dateFilter,
      },
    });

    const totalWorkExpenses = workExpenses.reduce((sum, work) => sum + work.totalAmount, 0);
    const totalSalaryPayments = salaryExpenses.reduce((sum, payment) => sum + payment.amount, 0);
    const totalCompanyExpenses = companyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalHomeExpenses = homeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    const totalRevenue = revenueData.total.amount;
    // Use the higher of work-based or payment-based salary (not both to avoid double counting)
    const actualSalaryExpense = Math.max(totalWorkExpenses, totalSalaryPayments);
    const totalExpenses = actualSalaryExpense + totalCompanyExpenses;
    const netProfit = totalRevenue - totalExpenses;
    
    // Get worker count
    const activeWorkers = await this.prisma.user.count({
      where: { role: 'WORKER' },
    });
    
    return {
      revenue: {
        total: totalRevenue,
        exports: totalRevenue, // All revenue is from exports currently
        other: 0,
      },
      expenses: {
        total: totalExpenses,
        salary: actualSalaryExpense, // Use the calculated actual expense (not both)
        operating: totalCompanyExpenses,
        materials: 0, // TODO: Add material costs when available
        home: totalHomeExpenses,
      },
      profit: {
        gross: totalRevenue,
        operating: totalRevenue - totalCompanyExpenses,
        net: netProfit,
      },
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      roi: totalExpenses > 0 ? (netProfit / totalExpenses) * 100 : 0,
      ratios: {
        grossMargin: totalRevenue > 0 ? ((totalRevenue - totalWorkExpenses) / totalRevenue) * 100 : 0,
        operatingMargin: totalRevenue > 0 ? ((totalRevenue - totalCompanyExpenses) / totalRevenue) * 100 : 0,
        laborCostRatio: totalRevenue > 0 ? (totalWorkExpenses / totalRevenue) * 100 : 0,
      },
      kpis: {
        revenuePerWorker: activeWorkers > 0 ? totalRevenue / activeWorkers : 0,
        profitPerWorker: activeWorkers > 0 ? netProfit / activeWorkers : 0,
        avgDailyOutput: revenueData.total.quantity / this.getDaysBetweenDates(startDate, endDate),
      },
    };
  }

  async getWorkerProductivity(startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    
    const workData = await this.prisma.work.findMany({
      where: { date: dateFilter },
      include: { user: true },
    });

    const attendanceData = await this.prisma.attendance.findMany({
      where: { date: dateFilter },
      include: { user: true },
    });

    const workerMap = new Map();
    
    // Process work data
    workData.forEach(work => {
      const userId = work.userId;
      if (!workerMap.has(userId)) {
        workerMap.set(userId, {
          id: userId,
          name: work.user.name,
          totalOutput: 0,
          workDays: new Set(),
          totalEarnings: 0,
        });
      }
      
      const worker = workerMap.get(userId);
      worker.totalOutput += work.quantity;
      worker.totalEarnings += work.totalAmount;
      worker.workDays.add(work.date.toDateString());
    });

    // Process attendance for efficiency calculation
    const attendanceMap = new Map();
    attendanceData.forEach(att => {
      const userId = att.userId;
      if (!attendanceMap.has(userId)) {
        attendanceMap.set(userId, { present: 0, total: 0 });
      }
      
      const attendance = attendanceMap.get(userId);
      attendance.total += 1;
      if (att.status === 'PRESENT') {
        attendance.present += 1;
      }
    });

    const productivity = Array.from(workerMap.values()).map(worker => {
      const workDays = worker.workDays.size;
      const attendance = attendanceMap.get(worker.id) || { present: 0, total: 1 };
      
      return {
        id: worker.id,
        name: worker.name,
        totalOutput: worker.totalOutput,
        workDays,
        productivity: workDays > 0 ? worker.totalOutput / workDays : 0,
        efficiency: attendance.total > 0 ? (attendance.present / attendance.total) * 100 : 0,
        totalEarnings: worker.totalEarnings,
      };
    });

    const totalOutput = productivity.reduce((sum, p) => sum + p.totalOutput, 0);
    const avgProductivity = productivity.length > 0 
      ? productivity.reduce((sum, p) => sum + p.productivity, 0) / productivity.length 
      : 0;
    const avgEfficiency = productivity.length > 0
      ? productivity.reduce((sum, p) => sum + p.efficiency, 0) / productivity.length
      : 0;

    return {
      total: {
        output: totalOutput,
        workers: productivity.length,
      },
      average: {
        productivity: avgProductivity,
        efficiency: avgEfficiency,
      },
      topPerformers: productivity
        .sort((a, b) => b.totalOutput - a.totalOutput)
        .slice(0, 10),
    };
  }

  async getProfitMarginAnalysis(startDate?: string, endDate?: string) {
    const financialData = await this.getFinancialOverview(startDate, endDate);
    
    const revenue = financialData.revenue.total;
    const expenses = financialData.expenses;
    
    // Fixed costs (salaries, operating expenses)
    const fixedCosts = expenses.salary + expenses.operating;
    // Variable costs (materials - when available)
    const variableCosts = expenses.materials;
    
    const grossProfit = revenue - variableCosts;
    const operatingProfit = grossProfit - fixedCosts;
    const netProfit = financialData.profit.net;
    
    // Break-even analysis
    const breakEvenUnits = variableCosts > 0 && revenue > 0 
      ? (fixedCosts / ((revenue - variableCosts) / this.getDaysBetweenDates(startDate, endDate)))
      : 0;
    const breakEvenRevenue = fixedCosts + variableCosts;

    // Get previous period for comparison
    const daysDiff = this.getDaysBetweenDates(startDate, endDate);
    const prevStartDate = this.addDays(-daysDiff, startDate);
    const prevEndDate = startDate;
    
    const prevFinancialData = await this.getFinancialOverview(
      prevStartDate?.toISOString().split('T')[0],
      prevEndDate ? new Date(prevEndDate).toISOString().split('T')[0] : undefined
    );

    const revenueGrowth = prevFinancialData.revenue.total > 0
      ? ((revenue - prevFinancialData.revenue.total) / prevFinancialData.revenue.total) * 100
      : 0;
    
    const profitGrowth = prevFinancialData.profit.net !== 0
      ? ((netProfit - prevFinancialData.profit.net) / Math.abs(prevFinancialData.profit.net)) * 100
      : 0;

    return {
      gross: {
        amount: grossProfit,
        margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      },
      operating: {
        amount: operatingProfit,
        margin: revenue > 0 ? (operatingProfit / revenue) * 100 : 0,
      },
      net: {
        amount: netProfit,
        margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      },
      breakEven: {
        units: breakEvenUnits,
        revenue: breakEvenRevenue,
      },
      trends: {
        mom: {
          revenue: revenueGrowth,
          profit: profitGrowth,
        },
        yoy: {
          revenue: 0, // TODO: Implement year-over-year when we have historical data
          profit: 0,
        },
      },
    };
  }

  async getWorkerSalaryBreakdown(workerId: number, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    
    const worker = await this.prisma.user.findUnique({
      where: { id: workerId },
    });

    if (!worker) {
      throw new Error('Worker not found');
    }

    const workData = await this.prisma.work.findMany({
      where: {
        userId: workerId,
        date: dateFilter,
      },
      include: {
        description: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    const salaryPayments = await this.prisma.salaryPayment.findMany({
      where: {
        userId: workerId,
        date: dateFilter,
      },
      orderBy: {
        date: 'desc',
      },
    });

    const totalEarned = workData.reduce((sum, work) => sum + work.totalAmount, 0);
    const totalPaid = salaryPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    return {
      worker: {
        id: worker.id,
        name: worker.name,
        email: worker.email,
      },
      summary: {
        totalEarned,
        totalPaid,
        balance: totalEarned - totalPaid,
        workDays: new Set(workData.map(w => w.date.toDateString())).size,
      },
      workHistory: workData.map(work => ({
        id: work.id,
        date: work.date,
        description: work.description.text,
        quantity: work.quantity,
        pricePerUnit: work.pricePerUnit,
        totalAmount: work.totalAmount,
      })),
      paymentHistory: salaryPayments.map(payment => ({
        id: payment.id,
        date: payment.date,
        amount: payment.amount,
        note: payment.note,
      })),
    };
  }

  async exportAnalyticsReport(startDate: string, endDate: string, reportType: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    switch (reportType) {
      case 'financial-overview':
        await this.generateFinancialOverviewReport(workbook, startDate, endDate);
        break;
      case 'salary':
        await this.generateSalaryReport(workbook, startDate, endDate);
        break;
      case 'revenue':
        await this.generateRevenueReport(workbook, startDate, endDate);
        break;
      case 'profit-margin':
        await this.generateProfitMarginReport(workbook, startDate, endDate);
        break;
      default:
        await this.generateFinancialOverviewReport(workbook, startDate, endDate);
    }
    
    return await workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  private async generateFinancialOverviewReport(workbook: ExcelJS.Workbook, startDate: string, endDate: string) {
    const data = await this.getFinancialOverview(startDate, endDate);
    const worksheet = workbook.addWorksheet('Financial Overview');
    
    // Header
    worksheet.addRow(['StitchHub Financial Overview Report']);
    worksheet.addRow([`Period: ${startDate} to ${endDate}`]);
    worksheet.addRow([]);
    
    // Revenue section
    worksheet.addRow(['REVENUE']);
    worksheet.addRow(['Total Revenue', data.revenue.total]);
    worksheet.addRow(['Export Revenue', data.revenue.exports]);
    worksheet.addRow([]);
    
    // Expenses section
    worksheet.addRow(['EXPENSES']);
    worksheet.addRow(['Total Expenses', data.expenses.total]);
    worksheet.addRow(['Salary Expenses', data.expenses.salary]);
    worksheet.addRow(['Operating Expenses', data.expenses.operating]);
    worksheet.addRow([]);
    
    // Profit section
    worksheet.addRow(['PROFIT & LOSS']);
    worksheet.addRow(['Gross Profit', data.profit.gross]);
    worksheet.addRow(['Operating Profit', data.profit.operating]);
    worksheet.addRow(['Net Profit', data.profit.net]);
    worksheet.addRow(['Profit Margin %', data.profitMargin]);
    worksheet.addRow(['ROI %', data.roi]);
    
    // Styling
    worksheet.getColumn(1).width = 25;
    worksheet.getColumn(2).width = 20;
  }

  private async generateSalaryReport(workbook: ExcelJS.Workbook, startDate: string, endDate: string) {
    const data = await this.getSalaryAnalytics(startDate, endDate);
    const worksheet = workbook.addWorksheet('Salary Analysis');
    
    // Header
    worksheet.addRow(['StitchHub Salary Analysis Report']);
    worksheet.addRow([`Period: ${startDate} to ${endDate}`]);
    worksheet.addRow([]);
    
    // Summary
    worksheet.addRow(['SUMMARY']);
    worksheet.addRow(['Total Salary Paid', data.total.amount]);
    worksheet.addRow(['Total Workers', data.total.workers]);
    worksheet.addRow(['Average per Worker', data.average.perWorker]);
    worksheet.addRow([]);
    
    // Worker breakdown
    worksheet.addRow(['WORKER BREAKDOWN']);
    worksheet.addRow(['Worker Name', 'Total Salary', 'Work Days', 'Avg per Day', 'Efficiency %']);
    
    data.workerBreakdown.forEach(worker => {
      worksheet.addRow([
        worker.name,
        worker.totalSalary,
        worker.workDays,
        worker.avgPerDay,
        worker.efficiency,
      ]);
    });
  }

  private async generateRevenueReport(workbook: ExcelJS.Workbook, startDate: string, endDate: string) {
    const data = await this.getRevenueAnalytics(startDate, endDate);
    const worksheet = workbook.addWorksheet('Revenue Analysis');
    
    // Header
    worksheet.addRow(['StitchHub Revenue Analysis Report']);
    worksheet.addRow([`Period: ${startDate} to ${endDate}`]);
    worksheet.addRow([]);
    
    // Summary
    worksheet.addRow(['SUMMARY']);
    worksheet.addRow(['Total Revenue', data.total.amount]);
    worksheet.addRow(['Total Exports', data.total.exports]);
    worksheet.addRow(['Total Quantity', data.total.quantity]);
    worksheet.addRow(['Average Price per Unit', data.average.pricePerUnit]);
    worksheet.addRow([]);
    
    // Company breakdown
    worksheet.addRow(['COMPANY BREAKDOWN']);
    worksheet.addRow(['Company Name', 'Total Revenue', 'Total Quantity', 'Export Count']);
    
    data.companyBreakdown.forEach(company => {
      worksheet.addRow([
        company.name,
        company.totalRevenue,
        company.totalQuantity,
        company.exportCount,
      ]);
    });
  }

  private async generateProfitMarginReport(workbook: ExcelJS.Workbook, startDate: string, endDate: string) {
    const data = await this.getProfitMarginAnalysis(startDate, endDate);
    const worksheet = workbook.addWorksheet('Profit Analysis');
    
    // Header
    worksheet.addRow(['StitchHub Profit Margin Analysis Report']);
    worksheet.addRow([`Period: ${startDate} to ${endDate}`]);
    worksheet.addRow([]);
    
    // Profit breakdown
    worksheet.addRow(['PROFIT BREAKDOWN']);
    worksheet.addRow(['Gross Profit', data.gross.amount, 'Margin %', data.gross.margin]);
    worksheet.addRow(['Operating Profit', data.operating.amount, 'Margin %', data.operating.margin]);
    worksheet.addRow(['Net Profit', data.net.amount, 'Margin %', data.net.margin]);
    worksheet.addRow([]);
    
    // Break-even analysis
    worksheet.addRow(['BREAK-EVEN ANALYSIS']);
    worksheet.addRow(['Break-even Units', data.breakEven.units]);
    worksheet.addRow(['Break-even Revenue', data.breakEven.revenue]);
  }

  private buildDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return undefined;
    
    const filter: any = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) filter.lte = new Date(endDate);
    
    return filter;
  }

  private getDaysBetweenDates(startDate?: string, endDate?: string): number {
    if (!startDate || !endDate) return 30; // Default to 30 days
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  }

  private addDays(days: number, dateString?: string): Date | undefined {
    if (!dateString) return undefined;
    
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date;
  }
}
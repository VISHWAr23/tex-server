import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExportDto, UpdateExportDto, ExportQueryDto } from './dto/export.dto';

/**
 * Exports Service
 * Handles export tracking for company sales/shipments
 * Uses shared WorkDescription model and Company model
 * Follows international standards for date handling (ISO 8601)
 */
@Injectable()
export class ExportsService {
  constructor(private prisma: PrismaService) {}

  // ==================== COMPANIES ====================

  /**
   * Get or create company by name
   */
  async getOrCreateCompany(name: string) {
    const existing = await this.prisma.company.findUnique({
      where: { name },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.company.create({
      data: { name },
    });
  }

  /**
   * Get all companies
   */
  async getCompanies() {
    const companies = await this.prisma.company.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: {
          select: { exports: true },
        },
      },
    });

    return companies;
  }

  // ==================== WORK DESCRIPTIONS (SHARED) ====================

  /**
   * Get all work descriptions (shared with Work module)
   */
  async getAllDescriptions() {
    return this.prisma.workDescription.findMany({
      orderBy: { text: 'asc' },
      select: {
        id: true,
        text: true,
        pricePerUnit: true,
        _count: {
          select: { 
            works: true,
            exports: true,
          },
        },
      },
    });
  }

  /**
   * Get or create description by text and optional descriptionId
   */
  async getOrCreateDescription(text?: string, descriptionId?: number) {
    if (descriptionId) {
      const existing = await this.prisma.workDescription.findUnique({
        where: { id: descriptionId },
      });
      if (existing) {
        return descriptionId;
      }
    }

    if (text) {
      const existing = await this.prisma.workDescription.findUnique({
        where: { text },
      });

      if (existing) {
        return existing.id;
      }

      const created = await this.prisma.workDescription.create({
        data: { text },
      });
      return created.id;
    }

    throw new BadRequestException('Description text or ID is required');
  }

  // ==================== EXPORT RECORDS ====================

  /**
   * Normalize date to start of day in UTC
   */
  private normalizeDate(dateStr: string): Date {
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Create a new export entry
   */
  async createExport(dto: CreateExportDto) {
    const normalizedDate = this.normalizeDate(dto.date);

    // Get or create description
    const descriptionId = await this.getOrCreateDescription(dto.description, dto.descriptionId);

    // Update description price if requested and price is provided
    if (dto.updateDescriptionPrice && descriptionId && dto.pricePerUnit) {
      await this.prisma.workDescription.update({
        where: { id: descriptionId },
        data: { pricePerUnit: dto.pricePerUnit },
      });
    }

    // Get or create company
    const company = await this.getOrCreateCompany(dto.companyName);

    // Calculate total amount
    const totalAmount = dto.quantity * dto.pricePerUnit;

    // Create export entry
    const exportEntry = await this.prisma.export.create({
      data: {
        date: normalizedDate,
        companyId: company.id,
        quantity: dto.quantity,
        pricePerUnit: dto.pricePerUnit,
        totalAmount,
        descriptionId,
      },
      include: {
        description: true,
        company: true,
      },
    });

    return exportEntry;
  }

  /**
   * Get all exports with optional filters
   */
  async getAllExports(query: ExportQueryDto) {
    const where: any = {};

    if (query.companyName) {
      where.company = {
        name: {
          contains: query.companyName,
          mode: 'insensitive',
        },
      };
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = this.normalizeDate(query.startDate);
      }
      if (query.endDate) {
        const endDate = this.normalizeDate(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    if (query.description) {
      where.description = {
        text: {
          contains: query.description,
          mode: 'insensitive',
        },
      };
    }

    const exports = await this.prisma.export.findMany({
      where,
      include: {
        description: true,
        company: true,
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return exports;
  }

  /**
   * Get export by ID
   */
  async getExportById(id: number) {
    const exportEntry = await this.prisma.export.findUnique({
      where: { id },
      include: {
        description: true,
        company: true,
      },
    });

    if (!exportEntry) {
      throw new NotFoundException(`Export with ID ${id} not found`);
    }

    return exportEntry;
  }

  /**
   * Update an export entry
   */
  async updateExport(id: number, dto: UpdateExportDto) {
    // Check if export exists
    const existing = await this.getExportById(id);

    const data: any = {};

    if (dto.date) {
      data.date = this.normalizeDate(dto.date);
    }

    if (dto.companyName) {
      const company = await this.getOrCreateCompany(dto.companyName);
      data.companyId = company.id;
    }

    if (dto.quantity !== undefined) {
      data.quantity = dto.quantity;
    }

    if (dto.pricePerUnit !== undefined) {
      data.pricePerUnit = dto.pricePerUnit;
    }

    // Handle description
    if (dto.description || dto.descriptionId) {
      const descriptionId = await this.getOrCreateDescription(dto.description, dto.descriptionId);
      data.descriptionId = descriptionId;

      // Update description price if requested
      if (dto.updateDescriptionPrice && dto.pricePerUnit) {
        await this.prisma.workDescription.update({
          where: { id: descriptionId },
          data: { pricePerUnit: dto.pricePerUnit },
        });
      }
    }

    // Recalculate total if quantity or price changed
    if (dto.quantity !== undefined || dto.pricePerUnit !== undefined) {
      const quantity = dto.quantity ?? existing.quantity;
      const pricePerUnit = dto.pricePerUnit ?? existing.pricePerUnit;
      data.totalAmount = quantity * pricePerUnit;
    }

    return this.prisma.export.update({
      where: { id },
      data,
      include: {
        description: true,
        company: true,
      },
    });
  }

  /**
   * Delete an export entry
   */
  async deleteExport(id: number) {
    // Check if export exists
    await this.getExportById(id);

    await this.prisma.export.delete({
      where: { id },
    });

    return { message: 'Export deleted successfully' };
  }

  /**
   * Get export statistics
   */
  async getStatistics(query: ExportQueryDto) {
    const where: any = {};

    if (query.companyName) {
      where.company = {
        name: {
          contains: query.companyName,
          mode: 'insensitive',
        },
      };
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = this.normalizeDate(query.startDate);
      }
      if (query.endDate) {
        const endDate = this.normalizeDate(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    // Get aggregate statistics
    const aggregate = await this.prisma.export.aggregate({
      where,
      _sum: {
        totalAmount: true,
        quantity: true,
      },
      _count: { id: true },
      _avg: {
        totalAmount: true,
        pricePerUnit: true,
      },
    });

    // Get by company
    const byCompany = await this.prisma.export.groupBy({
      by: ['companyId'],
      where,
      _sum: {
        totalAmount: true,
        quantity: true,
      },
      _count: { id: true },
      orderBy: {
        _sum: {
          totalAmount: 'desc',
        },
      },
    });

    // Get company details
    const companies = await this.prisma.company.findMany({
      where: {
        id: {
          in: byCompany.map((c) => c.companyId),
        },
      },
    });

    const companyMap = new Map(companies.map((c) => [c.id, c.name]));

    // Get by description
    const byDescription = await this.prisma.export.groupBy({
      by: ['descriptionId'],
      where,
      _sum: {
        totalAmount: true,
        quantity: true,
      },
      _count: { id: true },
      orderBy: {
        _sum: {
          totalAmount: 'desc',
        },
      },
    });

    // Get description details
    const descriptions = await this.prisma.workDescription.findMany({
      where: {
        id: {
          in: byDescription.map((d) => d.descriptionId),
        },
      },
    });

    const descriptionMap = new Map(descriptions.map((d) => [d.id, d.text]));

    return {
      summary: {
        totalRevenue: aggregate._sum.totalAmount || 0,
        totalQuantity: aggregate._sum.quantity || 0,
        totalExports: aggregate._count.id || 0,
        averageRevenue: aggregate._avg.totalAmount || 0,
        averagePrice: aggregate._avg.pricePerUnit || 0,
      },
      byCompany: byCompany.map((c) => ({
        company: companyMap.get(c.companyId) || 'Unknown',
        totalRevenue: c._sum.totalAmount || 0,
        totalQuantity: c._sum.quantity || 0,
        count: c._count.id || 0,
      })),
      byDescription: byDescription.map((d) => ({
        description: descriptionMap.get(d.descriptionId) || 'Unknown',
        totalRevenue: d._sum.totalAmount || 0,
        totalQuantity: d._sum.quantity || 0,
        count: d._count.id || 0,
      })),
    };
  }
}

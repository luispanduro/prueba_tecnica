import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../guards/permissions.guard';
import { AuditLog, AuditLogDocument } from '../../../domain/schemas/audit-log.schema';

interface LogsFilter {
  page?: string;
  limit?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  eventType?: string;
  service?: string;
  status?: string;
}

@Controller('audit/logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('audit:read')
export class AuditController {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  @Get()
  async getLogs(@Query() query: LogsFilter) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.max(1, Number(query.limit ?? 20));

    const filter: Record<string, unknown> = {};
    if (query.userId) filter['userId'] = query.userId;
    if (query.eventType) filter['eventType'] = query.eventType;
    if (query.service) filter['service'] = query.service;
    if (query.status) filter['status'] = query.status;
    if (query.startDate || query.endDate) {
      const range: Record<string, Date> = {};
      if (query.startDate) range['$gte'] = new Date(query.startDate);
      if (query.endDate) range['$lte'] = new Date(query.endDate);
      filter['timestamp'] = range;
    }

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  @Get('stats')
  async getStats() {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const stats = await this.auditLogModel
      .aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .exec();

    return stats.map((s: { _id: string; count: number }) => ({
      eventType: s._id,
      count: s.count,
    }));
  }

  @Get('user/:userId')
  async getByUser(
    @Param('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find({ userId })
        .sort({ timestamp: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments({ userId }).exec(),
    ]);

    return { items, total, page: p, limit: l };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const log = await this.auditLogModel.findById(id).lean().exec();
    if (!log) {
      throw new NotFoundException(`Audit log ${id} not found`);
    }
    return log;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IMetricRepository,
  QueryMetricData,
} from '../../../domain/repositories/metric.repository.interface';
import { QueryMetricTypeormEntity } from './entities/query-metric.typeorm-entity';

@Injectable()
export class MetricRepository implements IMetricRepository {
  constructor(
    @InjectRepository(QueryMetricTypeormEntity)
    private readonly repo: Repository<QueryMetricTypeormEntity>,
  ) {}

  async save(metric: QueryMetricData): Promise<void> {
    await this.repo.save(metric);
  }

  async findAll(limit: number): Promise<QueryMetricData[]> {
    return this.repo.find({
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async findById(queryId: string): Promise<QueryMetricData | null> {
    return this.repo.findOne({ where: { queryId } });
  }
}

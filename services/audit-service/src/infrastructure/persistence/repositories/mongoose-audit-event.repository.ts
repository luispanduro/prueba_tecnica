import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditEvent } from '../../../domain/entities/audit-event.entity';
import { IAuditEventRepository, AuditEventRecord } from '../../../domain/repositories/audit-event.repository';
import { AuditEventDocument } from '../schemas/audit-event.schema';

@Injectable()
export class MongooseAuditEventRepository implements IAuditEventRepository {
  constructor(
    @InjectModel(AuditEventDocument.name)
    private readonly model: Model<AuditEventDocument>,
  ) {}

  async save(event: AuditEvent): Promise<void> {
    const doc = new this.model({
      event_type: event.eventType,
      actor_id: event.actorId,
      actor_username: event.actorUsername,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      action: event.action,
      details: event.details,
      ip_address: event.ipAddress,
      correlation_id: event.correlationId,
      timestamp: event.timestamp,
      service_origin: event.serviceOrigin,
    });

    await doc.save();
  }

  async findRecent(limit: number): Promise<AuditEventRecord[]> {
    const docs = await this.model
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();

    return docs.map((doc) => ({
      id: doc._id.toString(),
      eventType: doc.event_type,
      actorId: doc.actor_id,
      actorUsername: doc.actor_username,
      resourceType: doc.resource_type,
      resourceId: doc.resource_id,
      action: doc.action,
      details: doc.details as Record<string, unknown>,
      ipAddress: doc.ip_address,
      correlationId: doc.correlation_id,
      timestamp: doc.timestamp,
      serviceOrigin: doc.service_origin,
    }));
  }
}

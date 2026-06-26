import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: false, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ required: true }) eventType!: string;
  @Prop({ required: true }) service!: string;
  @Prop({ type: String, default: null }) userId!: string | null;
  @Prop({ type: String, default: null }) actorEmail!: string | null;
  @Prop({ required: true }) resourceType!: string;
  @Prop({ type: String, default: null }) resourceId!: string | null;
  @Prop({ required: true }) action!: string;
  @Prop({ enum: ['success', 'failure'], required: true }) status!: string;
  @Prop({ type: Object, default: {} }) metadata!: Record<string, unknown>;
  @Prop({ required: true }) correlationId!: string;
  @Prop({ required: true }) eventId!: string;
  @Prop({ required: true }) timestamp!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ eventType: 1, timestamp: -1 });
AuditLogSchema.index({ service: 1, timestamp: -1 });
AuditLogSchema.index({ eventId: 1 }, { unique: true });

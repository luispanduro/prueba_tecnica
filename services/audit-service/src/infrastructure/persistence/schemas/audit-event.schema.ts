import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'audit_events', timestamps: false })
export class AuditEventDocument extends Document {
  @Prop({ required: true })
  event_type!: string;

  @Prop({ required: true })
  actor_id!: string;

  @Prop({ required: true })
  actor_username!: string;

  @Prop({ required: true })
  resource_type!: string;

  @Prop({ default: null })
  resource_id!: string | null;

  @Prop({ required: true })
  action!: string;

  @Prop({ type: Object, default: {} })
  details!: Record<string, unknown>;

  @Prop({ default: '' })
  ip_address!: string;

  @Prop({ default: '' })
  correlation_id!: string;

  @Prop({ required: true })
  timestamp!: string;

  @Prop({ required: true })
  service_origin!: string;
}

export const AuditEventSchema = SchemaFactory.createForClass(AuditEventDocument);

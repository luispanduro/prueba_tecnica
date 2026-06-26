import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('query_metrics')
export class QueryMetricTypeormEntity {
  @PrimaryColumn('uuid')
  queryId!: string;

  @CreateDateColumn()
  timestamp!: Date;

  @Column('int')
  latencyMs!: number;

  @Column('int')
  embeddingLatencyMs!: number;

  @Column('int')
  retrievalLatencyMs!: number;

  @Column('int')
  llmLatencyMs!: number;

  @Column('int')
  inputTokens!: number;

  @Column('int')
  outputTokens!: number;

  @Column('int')
  totalTokens!: number;

  @Column('float')
  estimatedCostUSD!: number;

  @Column('int')
  chunksRetrieved!: number;

  @Column('float')
  avgChunkScore!: number;

  @Column('simple-array', { default: '' })
  qualityFlags!: string[];
}

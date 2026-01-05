import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('closure')
@Index(['ancestor', 'descendant'], { unique: true })
@Index(['ancestor'])
@Index(['descendant'])
export class ClosureEntity {
  @PrimaryColumn({ type: 'uuid' })
  ancestor: string;

  @PrimaryColumn({ type: 'uuid' })
  descendant: string;

  @Column({ type: 'int' })
  depth: number;
}

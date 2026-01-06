import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MetricsService } from '@shared/metrics/metrics.service';
import { ClosureEntity, NodeEntity } from '@shared/organization-core/entities';
import { TracingService } from '@shared/tracing/tracing.service';
import { DataSource, Repository } from 'typeorm';
import { INodeHierarchy } from '../interfaces/node.interface';
import { NodesRepositoryInterface } from '../interfaces/repositories/node.repository.interface';

interface QueryResult {
  id: string;
  name: string;
  type: string;
  depth: number;
}

@Injectable()
export class NodesRepository implements NodesRepositoryInterface {
  constructor(
    @InjectRepository(NodeEntity)
    private readonly nodeRepository: Repository<NodeEntity>,
    @InjectRepository(ClosureEntity)
    private readonly closureRepository: Repository<ClosureEntity>,
    private readonly dataSource: DataSource,
    private readonly tracingService: TracingService,
    private readonly metricsService: MetricsService,
  ) {}

  async findNodeById(id: string): Promise<NodeEntity | null> {
    return this.tracingService.withSpan(
      'NodesRepository.findNodeById',
      async span => {
        span.setAttribute('node.id', id);
        const startTime = Date.now();

        const result = await this.nodeRepository.findOne({ where: { id } });

        const duration = (Date.now() - startTime) / 1000;
        this.metricsService.observeDbQueryDuration(duration, 'SELECT', 'node');

        return result;
      },
    );
  }

  async getAncestors(nodeId: string): Promise<INodeHierarchy[]> {
    return this.tracingService.withSpan(
      'NodesRepository.getAncestors',
      async span => {
        span.setAttribute('node.id', nodeId);
        const startTime = Date.now();

        const results: QueryResult[] = await this.dataSource.query(
          `
      SELECT n.id, n.name, n.type, c.depth
      FROM closure c
      INNER JOIN nodes n ON n.id = c.ancestor
      WHERE c.descendant = $1 AND c.depth >= 1
      ORDER BY c.depth ASC
      `,
          [nodeId],
        );

        const duration = (Date.now() - startTime) / 1000;
        this.metricsService.observeDbQueryDuration(
          duration,
          'SELECT',
          'ancestors',
        );

        span.setAttribute('ancestors.count', results.length);

        return results.map(r => ({
          id: r.id,
          name: r.name,
          depth: r.depth,
        }));
      },
    );
  }

  async getDescendants(nodeId: string): Promise<INodeHierarchy[]> {
    return this.tracingService.withSpan(
      'NodesRepository.getDescendants',
      async span => {
        span.setAttribute('node.id', nodeId);
        const startTime = Date.now();

        const results: QueryResult[] = await this.dataSource.query(
          `
      SELECT n.id, n.name, n.type, c.depth
      FROM closure c
      INNER JOIN nodes n ON n.id = c.descendant
      WHERE c.ancestor = $1 AND c.depth >= 1
      ORDER BY c.depth ASC
      `,
          [nodeId],
        );

        const duration = (Date.now() - startTime) / 1000;
        this.metricsService.observeDbQueryDuration(
          duration,
          'SELECT',
          'descendants',
        );

        span.setAttribute('descendants.count', results.length);

        return results.map(r => ({
          id: r.id,
          name: r.name,
          depth: r.depth,
        }));
      },
    );
  }
}

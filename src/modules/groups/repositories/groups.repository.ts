import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MetricsService } from '@shared/metrics/metrics.service';
import {
  ClosureEntity,
  NodeEntity,
  NodeType,
} from '@shared/organization-core/entities';
import { TracingService } from '@shared/tracing/tracing.service';
import { DataSource, Repository } from 'typeorm';
import { IGroup } from '../interfaces/group.interface';
import { GroupsRepositoryInterface } from '../interfaces/repositories/group.repository.interface';

@Injectable()
export class GroupsRepository implements GroupsRepositoryInterface {
  constructor(
    @InjectRepository(NodeEntity)
    private readonly nodeRepository: Repository<NodeEntity>,
    @InjectRepository(ClosureEntity)
    private readonly closureRepository: Repository<ClosureEntity>,
    private readonly dataSource: DataSource,
    private readonly tracingService: TracingService,
    private readonly metricsService: MetricsService,
  ) {}

  async createGroup(name: string): Promise<IGroup> {
    return this.tracingService.withSpan(
      'GroupsRepository.createGroup',
      async span => {
        span.setAttribute('group.name', name);
        const startTime = Date.now();

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const node = queryRunner.manager.create(NodeEntity, {
            type: NodeType.GROUP,
            name,
            email: null,
          });
          const savedNode = await queryRunner.manager.save(node);

          await queryRunner.manager.query(
            `INSERT INTO closure (ancestor, descendant, depth) VALUES ($1, $1, 0)`,
            [savedNode.id],
          );

          await queryRunner.commitTransaction();

          const duration = (Date.now() - startTime) / 1000;
          this.metricsService.observeDbQueryDuration(
            duration,
            'INSERT',
            'group',
          );
          this.metricsService.incrementGroupsCreated('success');

          span.addEvent('group_created', { 'group.id': savedNode.id });

          return {
            id: savedNode.id,
            type: savedNode.type,
            name: savedNode.name,
          };
        } catch (error) {
          await queryRunner.rollbackTransaction();
          this.metricsService.incrementGroupsCreated('failure');
          throw error;
        } finally {
          await queryRunner.release();
        }
      },
    );
  }

  async findGroupById(id: string): Promise<NodeEntity | null> {
    return this.tracingService.withSpan(
      'GroupsRepository.findGroupById',
      async span => {
        span.setAttribute('group.id', id);
        const startTime = Date.now();

        const result = await this.nodeRepository.findOne({
          where: { id, type: NodeType.GROUP },
        });

        const duration = (Date.now() - startTime) / 1000;
        this.metricsService.observeDbQueryDuration(duration, 'SELECT', 'group');

        return result;
      },
    );
  }

  async findNodeById(id: string): Promise<NodeEntity | null> {
    return this.tracingService.withSpan(
      'GroupsRepository.findNodeById',
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

  async checkCycle(childId: string, parentId: string): Promise<boolean> {
    return this.tracingService.withSpan(
      'GroupsRepository.checkCycle',
      async span => {
        span.setAttributes({
          'child.id': childId,
          'parent.id': parentId,
        });
        const startTime = Date.now();

        const result = await this.closureRepository
          .createQueryBuilder('c')
          .where('c.ancestor = :parent AND c.descendant = :child', {
            parent: parentId,
            child: childId,
          })
          .getOne();

        const duration = (Date.now() - startTime) / 1000;
        this.metricsService.observeDbQueryDuration(
          duration,
          'SELECT',
          'closure',
        );

        const hasCycle = !!result;
        span.setAttribute('has_cycle', hasCycle);

        return hasCycle;
      },
    );
  }

  async linkGroupToParent(groupId: string, parentId: string): Promise<void> {
    return this.tracingService.withSpan(
      'GroupsRepository.linkGroupToParent',
      async span => {
        span.setAttributes({
          'group.id': groupId,
          'parent.id': parentId,
        });
        const startTime = Date.now();

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          await queryRunner.manager.query(
            `
        INSERT INTO closure (ancestor, descendant, depth)
        SELECT a.ancestor, d.descendant, a.depth + 1 + d.depth
        FROM closure a
        CROSS JOIN closure d
        WHERE a.descendant = $1 AND d.ancestor = $2
        ON CONFLICT (ancestor, descendant)
        DO UPDATE SET depth = LEAST(closure.depth, EXCLUDED.depth)
        `,
            [parentId, groupId],
          );

          await queryRunner.commitTransaction();

          const duration = (Date.now() - startTime) / 1000;
          this.metricsService.observeDbQueryDuration(
            duration,
            'INSERT',
            'closure',
          );

          span.addEvent('group_linked_to_parent');
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      },
    );
  }
}

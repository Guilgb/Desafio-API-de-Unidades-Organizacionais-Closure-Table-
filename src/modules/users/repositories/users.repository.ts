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
import { UsersRepositoryInterface } from '../interfaces/repositories/user.repositories.interface';
import { IUser, IUserOrganization } from '../interfaces/user.interface';

@Injectable()
export class UsersRepository implements UsersRepositoryInterface {
  constructor(
    @InjectRepository(NodeEntity)
    private readonly nodeRepository: Repository<NodeEntity>,
    @InjectRepository(ClosureEntity)
    private readonly closureRepository: Repository<ClosureEntity>,
    private readonly dataSource: DataSource,
    private readonly tracingService: TracingService,
    private readonly metricsService: MetricsService,
  ) {}

  async createUser(name: string, email: string): Promise<IUser> {
    return this.tracingService.withSpan(
      'UsersRepository.createUser',
      async span => {
        span.setAttributes({ 'user.email': email, 'user.name': name });
        const startTime = Date.now();

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const node = queryRunner.manager.create(NodeEntity, {
            type: NodeType.USER,
            name,
            email,
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
            'user',
          );
          this.metricsService.incrementUsersCreated('success');

          span.addEvent('user_created', { 'user.id': savedNode.id });

          return {
            id: savedNode.id,
            type: savedNode.type,
            name: savedNode.name,
            email: savedNode.email,
          };
        } catch (error) {
          await queryRunner.rollbackTransaction();
          this.metricsService.incrementUsersCreated('failure');
          throw error;
        } finally {
          await queryRunner.release();
        }
      },
    );
  }

  async findUserById(id: string): Promise<NodeEntity | null> {
    return this.tracingService.withSpan(
      'UsersRepository.findUserById',
      async span => {
        span.setAttribute('user.id', id);
        const startTime = Date.now();

        const result = await this.nodeRepository.findOne({
          where: { id, type: NodeType.USER },
        });

        const duration = (Date.now() - startTime) / 1000;
        this.metricsService.observeDbQueryDuration(duration, 'SELECT', 'user');

        return result;
      },
    );
  }

  async findUserByEmail(email: string): Promise<NodeEntity | null> {
    return this.tracingService.withSpan(
      'UsersRepository.findUserByEmail',
      async span => {
        span.setAttribute('user.email', email);
        const startTime = Date.now();

        const result = await this.nodeRepository.findOne({
          where: { email, type: NodeType.USER },
        });

        const duration = (Date.now() - startTime) / 1000;
        this.metricsService.observeDbQueryDuration(duration, 'SELECT', 'user');

        return result;
      },
    );
  }

  async findNodeById(id: string): Promise<NodeEntity | null> {
    return this.nodeRepository.findOne({ where: { id } });
  }

  async checkCycle(childId: string, parentId: string): Promise<boolean> {
    const result = await this.closureRepository
      .createQueryBuilder('c')
      .where('c.ancestor = :parent AND c.descendant = :child', {
        parent: parentId,
        child: childId,
      })
      .getOne();

    return !!result;
  }

  async linkUserToGroup(userId: string, groupId: string): Promise<void> {
    return this.tracingService.withSpan(
      'UsersRepository.linkUserToGroup',
      async span => {
        span.setAttributes({
          'user.id': userId,
          'group.id': groupId,
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
            [groupId, userId],
          );

          await queryRunner.commitTransaction();

          const duration = (Date.now() - startTime) / 1000;
          this.metricsService.observeDbQueryDuration(
            duration,
            'INSERT',
            'closure',
          );
          this.metricsService.incrementUserGroupAssociation(
            'associate',
            'success',
          );

          span.addEvent('user_linked_to_group');
        } catch (error) {
          await queryRunner.rollbackTransaction();
          this.metricsService.incrementUserGroupAssociation(
            'associate',
            'failure',
          );
          throw error;
        } finally {
          await queryRunner.release();
        }
      },
    );
  }

  async getUserOrganizations(userId: string): Promise<IUserOrganization[]> {
    return this.tracingService.withSpan(
      'UsersRepository.getUserOrganizations',
      async span => {
        span.setAttribute('user.id', userId);
        const startTime = Date.now();

        const results = await this.dataSource.query(
          `
      SELECT DISTINCT ON (n.id) n.id, n.name, n.type, c.depth
      FROM closure c
      INNER JOIN nodes n ON n.id = c.ancestor
      WHERE c.descendant = $1
        AND c.depth >= 1
        AND n.type = 'GROUP'
      ORDER BY n.id, c.depth ASC
      `,
          [userId],
        );

        const duration = (Date.now() - startTime) / 1000;
        this.metricsService.observeDbQueryDuration(
          duration,
          'SELECT',
          'user_organizations',
        );

        span.setAttribute('organizations.count', results.length);

        return results
          .sort((a, b) => a.depth - b.depth)
          .map(r => ({
            id: r.id,
            name: r.name,
            depth: r.depth,
          }));
      },
    );
  }
}

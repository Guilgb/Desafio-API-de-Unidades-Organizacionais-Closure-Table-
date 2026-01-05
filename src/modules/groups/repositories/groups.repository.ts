import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ClosureEntity,
  NodeEntity,
  NodeType,
} from '@shared/organization-core/entities';
import { DataSource, Repository } from 'typeorm';
import { IGroup } from '../interfaces/group.interface';

@Injectable()
export class GroupsRepository {
  constructor(
    @InjectRepository(NodeEntity)
    private readonly nodeRepository: Repository<NodeEntity>,
    @InjectRepository(ClosureEntity)
    private readonly closureRepository: Repository<ClosureEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createGroup(name: string): Promise<IGroup> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create group node
      const node = queryRunner.manager.create(NodeEntity, {
        type: NodeType.GROUP,
        name,
        email: null,
      });
      const savedNode = await queryRunner.manager.save(node);

      // Insert self-link (depth = 0)
      await queryRunner.manager.query(
        `INSERT INTO closure (ancestor, descendant, depth) VALUES ($1, $1, 0)`,
        [savedNode.id],
      );

      await queryRunner.commitTransaction();

      return {
        id: savedNode.id,
        type: savedNode.type,
        name: savedNode.name,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findGroupById(id: string): Promise<NodeEntity | null> {
    return this.nodeRepository.findOne({
      where: { id, type: NodeType.GROUP },
    });
  }

  async findNodeById(id: string): Promise<NodeEntity | null> {
    return this.nodeRepository.findOne({ where: { id } });
  }

  async checkCycle(childId: string, parentId: string): Promise<boolean> {
    // Check if parent can reach child (which would create a cycle)
    const result = await this.closureRepository
      .createQueryBuilder('c')
      .where('c.ancestor = :parent AND c.descendant = :child', {
        parent: parentId,
        child: childId,
      })
      .getOne();

    return !!result;
  }

  async linkGroupToParent(groupId: string, parentId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Insert all combinations of ancestors of parent with descendants of group
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
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ClosureEntity,
  NodeEntity,
  NodeType,
} from '@shared/organization-core/entities';
import { DataSource, Repository } from 'typeorm';
import { IUser, IUserOrganization } from '../interfaces/user.interface';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(NodeEntity)
    private readonly nodeRepository: Repository<NodeEntity>,
    @InjectRepository(ClosureEntity)
    private readonly closureRepository: Repository<ClosureEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createUser(name: string, email: string): Promise<IUser> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create user node
      const node = queryRunner.manager.create(NodeEntity, {
        type: NodeType.USER,
        name,
        email,
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
        email: savedNode.email,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findUserById(id: string): Promise<NodeEntity | null> {
    return this.nodeRepository.findOne({
      where: { id, type: NodeType.USER },
    });
  }

  async findUserByEmail(email: string): Promise<NodeEntity | null> {
    return this.nodeRepository.findOne({
      where: { email, type: NodeType.USER },
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

  async linkUserToGroup(userId: string, groupId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Insert all combinations of ancestors of group with descendants of user
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
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getUserOrganizations(userId: string): Promise<IUserOrganization[]> {
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

    // Sort by depth ascending
    return results
      .sort((a, b) => a.depth - b.depth)
      .map(r => ({
        id: r.id,
        name: r.name,
        depth: r.depth,
      }));
  }
}

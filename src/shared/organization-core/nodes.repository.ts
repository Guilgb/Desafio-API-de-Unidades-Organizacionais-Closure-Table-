import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClosureEntity, NodeEntity, NodeType } from './entities';

export interface NodeWithDepth {
  id: string;
  name: string;
  type: NodeType;
  depth: number;
}

@Injectable()
export class NodesRepository {
  constructor(
    @InjectRepository(NodeEntity)
    private readonly nodeRepository: Repository<NodeEntity>,
    @InjectRepository(ClosureEntity)
    private readonly closureRepository: Repository<ClosureEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createNode(
    type: NodeType,
    name: string,
    email?: string,
  ): Promise<NodeEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create node
      const node = queryRunner.manager.create(NodeEntity, {
        type,
        name,
        email: email || null,
      });
      const savedNode = await queryRunner.manager.save(node);

      // Insert self-link (depth = 0)
      await queryRunner.manager.query(
        `INSERT INTO closure (ancestor, descendant, depth) VALUES ($1, $1, 0)`,
        [savedNode.id],
      );

      await queryRunner.commitTransaction();
      return savedNode;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findNodeById(id: string): Promise<NodeEntity | null> {
    return this.nodeRepository.findOne({ where: { id } });
  }

  async findNodeByEmail(email: string): Promise<NodeEntity | null> {
    return this.nodeRepository.findOne({ where: { email } });
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

  async linkNodes(childId: string, parentId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Insert all combinations of ancestors of parent with descendants of child
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
        [parentId, childId],
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getAncestors(nodeId: string): Promise<NodeWithDepth[]> {
    const results = await this.dataSource.query(
      `
      SELECT n.id, n.name, n.type, c.depth
      FROM closure c
      INNER JOIN nodes n ON n.id = c.ancestor
      WHERE c.descendant = $1 AND c.depth >= 1
      ORDER BY c.depth ASC
      `,
      [nodeId],
    );

    return results;
  }

  async getDescendants(nodeId: string): Promise<NodeWithDepth[]> {
    const results = await this.dataSource.query(
      `
      SELECT n.id, n.name, n.type, c.depth
      FROM closure c
      INNER JOIN nodes n ON n.id = c.descendant
      WHERE c.ancestor = $1 AND c.depth >= 1
      ORDER BY c.depth ASC
      `,
      [nodeId],
    );

    return results;
  }

  async getOrganizations(userId: string): Promise<NodeWithDepth[]> {
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
    return results.sort((a, b) => a.depth - b.depth);
  }
}

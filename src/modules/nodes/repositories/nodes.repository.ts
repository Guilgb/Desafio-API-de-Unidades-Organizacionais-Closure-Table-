import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClosureEntity, NodeEntity } from '@shared/organization-core/entities';
import { DataSource, Repository } from 'typeorm';
import { INodeHierarchy } from '../interfaces/node.interface';
import { NodesRepositoryInterface } from '../interfaces/repositories/node.repository.interface';

@Injectable()
export class NodesRepository implements NodesRepositoryInterface {
  constructor(
    @InjectRepository(NodeEntity)
    private readonly nodeRepository: Repository<NodeEntity>,
    @InjectRepository(ClosureEntity)
    private readonly closureRepository: Repository<ClosureEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findNodeById(id: string): Promise<NodeEntity | null> {
    return this.nodeRepository.findOne({ where: { id } });
  }

  async getAncestors(nodeId: string): Promise<INodeHierarchy[]> {
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

    return results.map(r => ({
      id: r.id,
      name: r.name,
      depth: r.depth,
    }));
  }

  async getDescendants(nodeId: string): Promise<INodeHierarchy[]> {
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

    return results.map(r => ({
      id: r.id,
      name: r.name,
      depth: r.depth,
    }));
  }
}

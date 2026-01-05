import { Injectable, NotFoundException } from '@nestjs/common';
import { WinstonLoggerService } from '@shared/modules/winston/winston-logger.service';
import { NodesRepositoryInterface } from '../interfaces/repositories/node.repository.interface';

@Injectable()
export class NodesService {
  constructor(
    private readonly nodesRepository: NodesRepositoryInterface,
    private readonly logger: WinstonLoggerService,
  ) {}

  async getNodeAncestors(nodeId: string) {
    this.logger.log('Getting node ancestors', undefined, { nodeId });

    const node = await this.nodesRepository.findNodeById(nodeId);
    if (!node) {
      this.logger.warn('Node not found', undefined, { nodeId });
      throw new NotFoundException({ message: 'Node not found' });
    }

    const ancestors = await this.nodesRepository.getAncestors(nodeId);

    this.logger.log('Retrieved node ancestors', undefined, {
      nodeId,
      count: ancestors.length,
    });

    return ancestors;
  }

  async getNodeDescendants(nodeId: string) {
    this.logger.log('Getting node descendants', undefined, { nodeId });

    const node = await this.nodesRepository.findNodeById(nodeId);
    if (!node) {
      this.logger.warn('Node not found', undefined, { nodeId });
      throw new NotFoundException({ message: 'Node not found' });
    }

    const descendants = await this.nodesRepository.getDescendants(nodeId);

    this.logger.log('Retrieved node descendants', undefined, {
      nodeId,
      count: descendants.length,
    });

    return descendants;
  }
}

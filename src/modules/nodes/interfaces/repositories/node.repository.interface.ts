import { NodeEntity } from '@shared/organization-core/entities';
import { INodeHierarchy } from '../node.interface';

export abstract class NodesRepositoryInterface {
  abstract findNodeById(id: string): Promise<NodeEntity | null>;
  abstract getAncestors(nodeId: string): Promise<INodeHierarchy[]>;
  abstract getDescendants(nodeId: string): Promise<INodeHierarchy[]>;
}

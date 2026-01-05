import { NodeEntity } from '@shared/organization-core/entities';
import { IGroup } from '../group.interface';

export abstract class GroupsRepositoryInterface {
  abstract createGroup(name: string): Promise<IGroup>;

  abstract findGroupById(id: string): Promise<NodeEntity | null>;

  abstract findNodeById(id: string): Promise<NodeEntity | null>;

  abstract checkCycle(childId: string, parentId: string): Promise<boolean>;

  abstract linkGroupToParent(groupId: string, parentId: string): Promise<void>;
}

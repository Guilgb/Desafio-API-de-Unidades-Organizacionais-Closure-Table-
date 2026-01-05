import { NodeEntity } from '@shared/organization-core/entities';
import { IUser, IUserOrganization } from '../user.interface';

export abstract class UsersRepositoryInterface {
  abstract createUser(name: string, email: string): Promise<IUser>;

  abstract findUserById(id: string): Promise<NodeEntity | null>;

  abstract findUserByEmail(email: string): Promise<NodeEntity | null>;

  abstract findNodeById(id: string): Promise<NodeEntity | null>;

  abstract checkCycle(childId: string, parentId: string): Promise<boolean>;

  abstract linkUserToGroup(userId: string, groupId: string): Promise<void>;

  abstract getUserOrganizations(userId: string): Promise<IUserOrganization[]>;
}

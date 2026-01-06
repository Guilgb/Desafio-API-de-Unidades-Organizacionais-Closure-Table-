import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  failure,
  NotFoundError,
  Result,
  success,
  ValidationError,
} from '@shared/types/result.type';
import { IUser } from '../interfaces/user.interface';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class UsersServiceWithEither {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(
    name: string,
    email: string,
  ): Promise<Result<ConflictError | ValidationError, IUser>> {
    if (!email.includes('@')) {
      return failure(new ValidationError('Email inválido'));
    }

    const existingUser = await this.usersRepository.findUserByEmail(email);
    if (existingUser) {
      return failure(new ConflictError(`Email ${email} já está em uso`));
    }

    try {
      const user = await this.usersRepository.createUser(name, email);
      return success(user);
    } catch (error) {
      return failure(new ValidationError(error.message));
    }
  }

  async getUserById(id: string): Promise<Result<NotFoundError, IUser>> {
    const user = await this.usersRepository.findUserById(id);

    if (!user) {
      return failure(new NotFoundError('User', id));
    }

    return success({
      id: user.id,
      type: user.type,
      name: user.name,
      email: user.email,
    });
  }

  async linkUserToGroup(
    userId: string,
    groupId: string,
  ): Promise<Result<NotFoundError | ConflictError, void>> {
    const user = await this.usersRepository.findUserById(userId);
    if (!user) {
      return failure(new NotFoundError('User', userId));
    }

    const group = await this.usersRepository.findNodeById(groupId);
    if (!group) {
      return failure(new NotFoundError('Group', groupId));
    }

    const hasCycle = await this.usersRepository.checkCycle(userId, groupId);
    if (hasCycle) {
      return failure(
        new ConflictError('Não é possível criar um ciclo na hierarquia'),
      );
    }

    try {
      await this.usersRepository.linkUserToGroup(userId, groupId);
      return success(undefined);
    } catch (error) {
      return failure(new ConflictError(error.message));
    }
  }
}

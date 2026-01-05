import { Test, TestingModule } from '@nestjs/testing';
import { NodeType } from '@shared/organization-core/entities';
import { UsersService } from '../services/users.service';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    createUser: jest.fn(),
    associateUserToGroup: jest.fn(),
    getUserOrganizations: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user', async () => {
      const createUserDto = { name: 'John Doe', email: 'john@test.com' };
      const mockUser = {
        id: 'user-id',
        type: NodeType.USER,
        name: 'John Doe',
        email: 'john@test.com',
      };

      mockUsersService.createUser.mockResolvedValue(mockUser);

      const result = await controller.createUser(createUserDto);

      expect(service.createUser).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('associateUserToGroup', () => {
    it('should associate user to group', async () => {
      const userId = 'user-id';
      const groupDto = { groupId: 'group-id' };

      mockUsersService.associateUserToGroup.mockResolvedValue(undefined);

      await controller.associateUserToGroup(userId, groupDto);

      expect(service.associateUserToGroup).toHaveBeenCalledWith(
        userId,
        'group-id',
      );
    });
  });

  describe('getUserOrganizations', () => {
    it('should return user organizations', async () => {
      const userId = 'user-id';
      const mockOrganizations = [
        { id: 'org-1', name: 'Team', depth: 1 },
        { id: 'org-2', name: 'Department', depth: 2 },
      ];

      mockUsersService.getUserOrganizations.mockResolvedValue(
        mockOrganizations,
      );

      const result = await controller.getUserOrganizations(userId);

      expect(service.getUserOrganizations).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockOrganizations);
    });
  });
});

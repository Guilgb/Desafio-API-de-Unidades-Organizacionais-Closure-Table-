import { Test, TestingModule } from '@nestjs/testing';
import { NodeType } from '@shared/organization-core/entities';
import { GroupsService } from '../services/groups.service';
import { GroupsController } from './groups.controller';

describe('GroupsController', () => {
  let controller: GroupsController;
  let service: GroupsService;

  const mockGroupsService = {
    createGroup: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [
        {
          provide: GroupsService,
          useValue: mockGroupsService,
        },
      ],
    }).compile();

    controller = module.get<GroupsController>(GroupsController);
    service = module.get<GroupsService>(GroupsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create a group without parent', async () => {
      const createGroupDto = { name: 'Engineering' };
      const mockGroup = {
        id: 'group-id',
        type: NodeType.GROUP,
        name: 'Engineering',
      };

      mockGroupsService.createGroup.mockResolvedValue(mockGroup);

      const result = await controller.createGroup(createGroupDto);

      expect(service.createGroup).toHaveBeenCalledWith(createGroupDto);
      expect(result).toEqual(mockGroup);
    });

    it('should create a group with parent', async () => {
      const createGroupDto = { name: 'Backend Team', parentId: 'parent-id' };
      const mockGroup = {
        id: 'group-id',
        type: NodeType.GROUP,
        name: 'Backend Team',
      };

      mockGroupsService.createGroup.mockResolvedValue(mockGroup);

      const result = await controller.createGroup(createGroupDto);

      expect(service.createGroup).toHaveBeenCalledWith(createGroupDto);
      expect(result).toEqual(mockGroup);
    });
  });
});

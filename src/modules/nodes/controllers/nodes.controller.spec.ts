import { Test, TestingModule } from '@nestjs/testing';
import { NodesService } from '../services/nodes.service';
import { NodesController } from './nodes.controller';

describe('NodesController', () => {
  let controller: NodesController;
  let service: NodesService;

  const mockNodesService = {
    getNodeAncestors: jest.fn(),
    getNodeDescendants: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NodesController],
      providers: [
        {
          provide: NodesService,
          useValue: mockNodesService,
        },
      ],
    }).compile();

    controller = module.get<NodesController>(NodesController);
    service = module.get<NodesService>(NodesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNodeAncestors', () => {
    it('should return node ancestors', async () => {
      const nodeId = 'node-id';
      const mockAncestors = [
        { id: 'anc-1', name: 'Parent', depth: 1 },
        { id: 'anc-2', name: 'Grandparent', depth: 2 },
      ];

      mockNodesService.getNodeAncestors.mockResolvedValue(mockAncestors);

      const result = await controller.getNodeAncestors(nodeId);

      expect(service.getNodeAncestors).toHaveBeenCalledWith(nodeId);
      expect(result).toEqual(mockAncestors);
    });
  });

  describe('getNodeDescendants', () => {
    it('should return node descendants', async () => {
      const nodeId = 'node-id';
      const mockDescendants = [
        { id: 'desc-1', name: 'Child', depth: 1 },
        { id: 'desc-2', name: 'Grandchild', depth: 2 },
      ];

      mockNodesService.getNodeDescendants.mockResolvedValue(mockDescendants);

      const result = await controller.getNodeDescendants(nodeId);

      expect(service.getNodeDescendants).toHaveBeenCalledWith(nodeId);
      expect(result).toEqual(mockDescendants);
    });
  });
});

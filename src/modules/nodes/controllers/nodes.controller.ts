import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NodesService } from '../services/nodes.service';

@ApiTags('Nodes')
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Get(':id/ancestors')
  @ApiOperation({ summary: 'Get ancestors of a node' })
  @ApiParam({ name: 'id', description: 'Node ID' })
  @ApiResponse({ status: 200, description: 'List of ancestors' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async getNodeAncestors(@Param('id') nodeId: string) {
    return this.nodesService.getNodeAncestors(nodeId);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'Get descendants of a node' })
  @ApiParam({ name: 'id', description: 'Node ID' })
  @ApiResponse({ status: 200, description: 'List of descendants' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async getNodeDescendants(@Param('id') nodeId: string) {
    return this.nodesService.getNodeDescendants(nodeId);
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from '@shared/modules/winston/winston.module';
import { NodesController } from './controllers/nodes.controller';
import { ClosureEntity, NodeEntity } from './entities';
import { NodesRepository } from './repositories/nodes.repository';
import { NodesService } from './services/nodes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NodeEntity, ClosureEntity]),
    WinstonModule,
  ],
  controllers: [NodesController],
  providers: [NodesService, NodesRepository],
  exports: [NodesService, NodesRepository],
})
export class OrganizationModule {}

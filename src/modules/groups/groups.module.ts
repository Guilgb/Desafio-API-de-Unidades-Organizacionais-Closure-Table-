import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from '@shared/modules/winston/winston.module';
import { ClosureEntity, NodeEntity } from '@shared/organization-core/entities';
import { NodesRepository } from '@shared/organization-core/nodes.repository';
import { GroupsController } from './controllers/groups.controller';
import { GroupsService } from './services/groups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NodeEntity, ClosureEntity]),
    WinstonModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService, NodesRepository],
  exports: [GroupsService],
})
export class GroupsModule {}

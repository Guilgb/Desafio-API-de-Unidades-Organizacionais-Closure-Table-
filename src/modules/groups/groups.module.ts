import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from '@shared/modules/winston/winston.module';
import { ClosureEntity, NodeEntity } from '@shared/organization-core/entities';
import { GroupsController } from './controllers/groups.controller';
import { GroupsRepository } from './repositories/groups.repository';
import { GroupsService } from './services/groups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NodeEntity, ClosureEntity]),
    WinstonModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository],
  exports: [GroupsService],
})
export class GroupsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from '@shared/modules/winston/winston.module';
import { ClosureEntity, NodeEntity } from '@shared/organization-core/entities';
import { NodesRepository } from '@shared/organization-core/nodes.repository';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NodeEntity, ClosureEntity]),
    WinstonModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, NodesRepository],
  exports: [UsersService],
})
export class UsersModule {}

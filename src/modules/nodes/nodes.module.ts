import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from '@shared/modules/winston/winston.module';
import { ClosureEntity, NodeEntity } from '@shared/organization-core/entities';
import { NodesController } from './controllers/nodes.controller';
import { NodesRepositoryInterface } from './interfaces/repositories/node.repository.interface';
import { NodesRepository } from './repositories/nodes.repository';
import { NodesService } from './services/nodes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NodeEntity, ClosureEntity]),
    WinstonModule,
  ],
  controllers: [NodesController],
  providers: [
    NodesService,
    { provide: NodesRepositoryInterface, useClass: NodesRepository },
  ],
  exports: [NodesService],
})
export class NodesModule {}

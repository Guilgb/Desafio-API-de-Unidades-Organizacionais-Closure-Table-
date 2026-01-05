import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from '@shared/modules/winston/winston.module';
import { ClosureEntity, NodeEntity } from '@shared/organization-core/entities';
import { UsersController } from './controllers/users.controller';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './services/users.service';
import { UsersRepositoryInterface } from './interfaces/repositories/user.repositories.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([NodeEntity, ClosureEntity]),
    WinstonModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: UsersRepositoryInterface, useClass: UsersRepository },
  ],
  exports: [UsersService],
})
export class UsersModule {}

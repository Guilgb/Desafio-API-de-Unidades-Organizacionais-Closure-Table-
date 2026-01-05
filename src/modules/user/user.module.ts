import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from '@shared/modules/winston/winston.module';

@Module({
  imports: [TypeOrmModule.forFeature(), WinstonModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class UserModule {}

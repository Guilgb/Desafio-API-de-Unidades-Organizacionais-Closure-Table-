import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmLogger } from '../winston/winston.service';
import * as entities from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST') || 'localhost',
        port: configService.get<number>('DATABASE_PORT') || 5432,
        username: configService.get<string>('DATABASE_USER') || 'postgres',
        password: configService.get<string>('DATABASE_PASSWORD') || 'password',
        database: configService.get<string>('DATABASE_NAME') || 'challenge_db',
        entities: Object.values(entities),
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        ssl: false,
        extra: {
          ssl: false,
        },
        logger: new TypeOrmLogger(),
        logging: ['query', 'error', 'schema', 'warn', 'info', 'log'],
        maxQueryExecutionTime: 1000,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}

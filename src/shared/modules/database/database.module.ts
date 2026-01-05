import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmLogger } from '../winston/winston.service';
import * as entities from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT) || 5432,
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'password',
        database: process.env.DATABASE_NAME || 'challenge_db',
        entities: Object.values(entities),
        synchronize: false,
        ssl: false,
        extra: {
          ssl: false,
        },
        logger: new TypeOrmLogger(),
        logging: ['query', 'error', 'schema', 'warn', 'info', 'log'],
        maxQueryExecutionTime: 1000,
      }),
    }),
  ],
})
export class DatabaseModule {}

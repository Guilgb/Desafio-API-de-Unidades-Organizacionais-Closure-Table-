import { DataSource, DataSourceOptions } from 'typeorm';
import { ClosureEntity } from '../src/shared/organization-core/entities/closure.entity';
import { NodeEntity } from '../src/shared/organization-core/entities/node.entity';

export const testDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.TEST_DATABASE_HOST || 'localhost',
  port: parseInt(process.env.TEST_DATABASE_PORT || '5433', 10),
  username: process.env.TEST_DATABASE_USER || 'test_user',
  password: process.env.TEST_DATABASE_PASSWORD || 'test_password',
  database: process.env.TEST_DATABASE_NAME || 'test_db',
  entities: [NodeEntity, ClosureEntity],
  synchronize: true, // Auto-create schema for tests
  dropSchema: true, // Drop schema before each test run
  logging: false,
};

export const testDataSource = new DataSource(testDataSourceOptions);

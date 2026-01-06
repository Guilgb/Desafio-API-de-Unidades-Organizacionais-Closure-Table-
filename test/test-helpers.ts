import { testDataSource } from './test-data-source';

/**
 * Setup function to initialize test database
 */
export async function setupTestDatabase() {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
  }
  return testDataSource;
}

/**
 * Teardown function to clean up test database
 */
export async function teardownTestDatabase() {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
}

/**
 * Clean all tables between tests
 */
export async function cleanDatabase() {
  const entities = testDataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = testDataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
  }
}

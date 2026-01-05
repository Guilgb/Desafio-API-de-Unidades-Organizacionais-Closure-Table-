import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClosureTableStructure1704412800000 implements MigrationInterface {
  name = 'CreateClosureTableStructure1704412800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create node_type enum
    await queryRunner.query(`
      CREATE TYPE "node_type_enum" AS ENUM('USER', 'GROUP')
    `);

    // Create nodes table
    await queryRunner.query(`
      CREATE TABLE "nodes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "node_type_enum" NOT NULL,
        "name" character varying(255) NOT NULL,
        "email" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_nodes_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_nodes_email" UNIQUE ("email")
      )
    `);

    // Create indexes for nodes table
    await queryRunner.query(`
      CREATE INDEX "IDX_nodes_type" ON "nodes" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_nodes_email" ON "nodes" ("email")
    `);

    // Create closure table
    await queryRunner.query(`
      CREATE TABLE "closure" (
        "ancestor" uuid NOT NULL,
        "descendant" uuid NOT NULL,
        "depth" integer NOT NULL,
        CONSTRAINT "PK_closure" PRIMARY KEY ("ancestor", "descendant")
      )
    `);

    // Create indexes for closure table
    await queryRunner.query(`
      CREATE INDEX "IDX_closure_ancestor" ON "closure" ("ancestor")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_closure_descendant" ON "closure" ("descendant")
    `);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "closure"
      ADD CONSTRAINT "FK_closure_ancestor"
      FOREIGN KEY ("ancestor") REFERENCES "nodes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "closure"
      ADD CONSTRAINT "FK_closure_descendant"
      FOREIGN KEY ("descendant") REFERENCES "nodes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "closure" DROP CONSTRAINT "FK_closure_descendant"
    `);

    await queryRunner.query(`
      ALTER TABLE "closure" DROP CONSTRAINT "FK_closure_ancestor"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_closure_descendant"`);
    await queryRunner.query(`DROP INDEX "IDX_closure_ancestor"`);
    await queryRunner.query(`DROP INDEX "IDX_nodes_email"`);
    await queryRunner.query(`DROP INDEX "IDX_nodes_type"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "closure"`);
    await queryRunner.query(`DROP TABLE "nodes"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE "node_type_enum"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClosureTableStructure1704412800000 implements MigrationInterface {
  name = 'CreateClosureTableStructure1704412800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TYPE "node_type_enum" AS ENUM('USER', 'GROUP')
    `);

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

    await queryRunner.query(`
      CREATE INDEX "IDX_nodes_type" ON "nodes" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_nodes_email" ON "nodes" ("email")
    `);

    await queryRunner.query(`
      CREATE TABLE "closure" (
        "ancestor" uuid NOT NULL,
        "descendant" uuid NOT NULL,
        "depth" integer NOT NULL,
        CONSTRAINT "PK_closure" PRIMARY KEY ("ancestor", "descendant")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_closure_ancestor" ON "closure" ("ancestor")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_closure_descendant" ON "closure" ("descendant")
    `);

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
    await queryRunner.query(`
      ALTER TABLE "closure" DROP CONSTRAINT "FK_closure_descendant"
    `);

    await queryRunner.query(`
      ALTER TABLE "closure" DROP CONSTRAINT "FK_closure_ancestor"
    `);

    await queryRunner.query(`DROP INDEX "IDX_closure_descendant"`);
    await queryRunner.query(`DROP INDEX "IDX_closure_ancestor"`);
    await queryRunner.query(`DROP INDEX "IDX_nodes_email"`);
    await queryRunner.query(`DROP INDEX "IDX_nodes_type"`);

    await queryRunner.query(`DROP TABLE "closure"`);
    await queryRunner.query(`DROP TABLE "nodes"`);

    await queryRunner.query(`DROP TYPE "node_type_enum"`);
  }
}

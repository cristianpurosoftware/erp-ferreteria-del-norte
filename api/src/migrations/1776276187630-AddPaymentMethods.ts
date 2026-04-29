import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentMethods1776276187630 implements MigrationInterface {
    name = 'AddPaymentMethods1776276187630'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "payment_methods" ("id" varchar(40) NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "metadata" jsonb, "name" character varying NOT NULL, "code" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "description" character varying, CONSTRAINT "UQ_f8aad3eab194dfdae604ca11125" UNIQUE ("code"), CONSTRAINT "PK_34f9b8c6dfb4ac3559f7e2820d1" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "payment_methods"`);
    }

}

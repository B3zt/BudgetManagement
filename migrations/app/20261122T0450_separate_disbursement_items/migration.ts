#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0ce070795edd5fe0e2198bb268ac746c54de88722895165c235bec8117317fbf/contract';
import startContract from '../../snapshots/0ce070795edd5fe0e2198bb268ac746c54de88722895165c235bec8117317fbf/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f30e50ae97df059b31193583735db15265ae49ed6af76d24f243cd290a87bd0d/contract';
import endContract from '../../snapshots/f30e50ae97df059b31193583735db15265ae49ed6af76d24f243cd290a87bd0d/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  rawSql,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      ...this.renameColumn({
        schema: 'public',
        table: 'Disbursement',
        column: 'accountId',
        to: 'itemId',
      }),
      ...this.renameColumn({
        schema: 'public',
        table: 'DisbursementEntry',
        column: 'accountId',
        to: 'itemId',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'Disbursement',
        constraint: 'Disbursement_itemId_fkey',
        kind: 'foreignKey',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'DisbursementEntry',
        constraint: 'DisbursementEntry_itemId_fkey',
        kind: 'foreignKey',
      }),
      this.dropIndex({
        schema: 'public',
        table: 'Disbursement',
        index: 'Disbursement_accountId_fiscalYear_month_key',
      }),
      this.dropIndex({
        schema: 'public',
        table: 'DisbursementEntry',
        index: 'DisbursementEntry_accountId_fiscalYear_month_idx',
      }),
      this.createTable({
        schema: 'public',
        table: 'DisbursementItem',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('level', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('parentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Disbursement',
        index: 'Disbursement_itemId_fiscalYear_month_key',
        columns: ['itemId', 'fiscalYear', 'month'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'DisbursementEntry',
        index: 'DisbursementEntry_itemId_fiscalYear_month_idx',
        columns: ['itemId', 'fiscalYear', 'month'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DisbursementItem',
        index: 'DisbursementItem_code_key',
        columns: ['code'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'DisbursementItem',
        index: 'DisbursementItem_parentId_idx',
        columns: ['parentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DisbursementItem',
        foreignKey: {
          name: 'DisbursementItem_parentId_fkey',
          columns: ['parentId'],
          references: { schema: 'public', table: 'DisbursementItem', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      // คัดลอกผังบัญชีเดิมเป็นรายการเบิกจ่าย โดยคง id เดิมไว้ เพื่อให้ข้อมูลเบิกจ่ายที่บันทึกแล้วยังชี้ถูกรายการ
      rawSql({
        id: 'data.copyChartOfAccountToDisbursementItem',
        label: 'Copy ChartOfAccount rows into DisbursementItem (same ids)',
        operationClass: 'data',
        target: {
          id: 'postgres',
          details: { schema: 'public', objectType: 'table', name: 'DisbursementItem' },
        },
        precheck: [],
        execute: [
          {
            description: 'copy chart of accounts into disbursement items',
            sql: 'INSERT INTO "public"."DisbursementItem" ("id", "code", "level", "name", "parentId", "isActive", "note", "createdAt", "updatedAt") SELECT "id", "code", "level", "nameOffice", "parentId", "isActive", "note", "createdAt", "updatedAt" FROM "public"."ChartOfAccount" ON CONFLICT ("id") DO NOTHING',
          },
        ],
        postcheck: [],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Disbursement',
        foreignKey: {
          name: 'Disbursement_itemId_fkey',
          columns: ['itemId'],
          references: { schema: 'public', table: 'DisbursementItem', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DisbursementEntry',
        foreignKey: {
          name: 'DisbursementEntry_itemId_fkey',
          columns: ['itemId'],
          references: { schema: 'public', table: 'DisbursementItem', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

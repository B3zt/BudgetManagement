#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0ce070795edd5fe0e2198bb268ac746c54de88722895165c235bec8117317fbf/contract';
import endContract from '../../snapshots/0ce070795edd5fe0e2198bb268ac746c54de88722895165c235bec8117317fbf/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'FundSource',
        members: ['BUDGET', 'COURT_FEE'],
      }),
      this.createTable({
        schema: 'public',
        table: 'BudgetTransfer',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('documentDate', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('documentNo', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fiscalYear', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('fromUnit', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('month', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('preparedBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('quarter', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('remark', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('toUnit', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('transferDate', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('transferSeq', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ChartOfAccount',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('gfmisCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('gfmisName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('level', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nameOffice', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('parentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Disbursement',
        columns: [
          col('accountId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('budgetAmount', 'numeric(15,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 15, scale: 2 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('fiscalYear', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('month', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('spentAmount', 'numeric(15,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 15, scale: 2 } },
          }),
          col('spentBudgetFund', 'numeric(15,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 15, scale: 2 } },
          }),
          col('spentCourtFee', 'numeric(15,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 15, scale: 2 } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'DisbursementEntry',
        columns: [
          col('accountId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('amount', 'numeric(15,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 15, scale: 2 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('entryDate', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('fiscalYear', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('fundSource', '"FundSource"', {
            notNull: true,
            default: lit('BUDGET'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'FundSource' } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('month', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'GfmisAccount',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'TransferItem',
        columns: [
          col('activity', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fiscalYear', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('investmentAmount', 'numeric(15,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 15, scale: 2 } },
          }),
          col('lineNo', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('managementAmount', 'numeric(15,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 15, scale: 2 } },
          }),
          col('personnelAmount', 'numeric(15,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 15, scale: 2 } },
          }),
          col('transferId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetTransfer',
        index: 'BudgetTransfer_documentNo_key',
        columns: ['documentNo'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetTransfer',
        index: 'BudgetTransfer_fiscalYear_quarter_idx',
        columns: ['fiscalYear', 'quarter'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChartOfAccount',
        index: 'ChartOfAccount_code_key',
        columns: ['code'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChartOfAccount',
        index: 'ChartOfAccount_gfmisCode_idx',
        columns: ['gfmisCode'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ChartOfAccount',
        index: 'ChartOfAccount_parentId_idx',
        columns: ['parentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Disbursement',
        index: 'Disbursement_accountId_fiscalYear_month_key',
        columns: ['accountId', 'fiscalYear', 'month'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Disbursement',
        index: 'Disbursement_fiscalYear_month_idx',
        columns: ['fiscalYear', 'month'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DisbursementEntry',
        index: 'DisbursementEntry_accountId_fiscalYear_month_idx',
        columns: ['accountId', 'fiscalYear', 'month'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DisbursementEntry',
        index: 'DisbursementEntry_fiscalYear_month_idx',
        columns: ['fiscalYear', 'month'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'GfmisAccount',
        index: 'GfmisAccount_code_key',
        columns: ['code'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'GfmisAccount',
        index: 'GfmisAccount_name_idx',
        columns: ['name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TransferItem',
        index: 'TransferItem_transferId_idx',
        columns: ['transferId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ChartOfAccount',
        foreignKey: {
          name: 'ChartOfAccount_parentId_fkey',
          columns: ['parentId'],
          references: { schema: 'public', table: 'ChartOfAccount', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Disbursement',
        foreignKey: {
          name: 'Disbursement_accountId_fkey',
          columns: ['accountId'],
          references: { schema: 'public', table: 'ChartOfAccount', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DisbursementEntry',
        foreignKey: {
          name: 'DisbursementEntry_accountId_fkey',
          columns: ['accountId'],
          references: { schema: 'public', table: 'ChartOfAccount', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TransferItem',
        foreignKey: {
          name: 'TransferItem_transferId_fkey',
          columns: ['transferId'],
          references: { schema: 'public', table: 'BudgetTransfer', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

// @ts-check
import nextjs from "@prisma/composer/nextjs";
import { compute } from "@prisma/composer-prisma-cloud";
import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
import courtBudgetSystemContractJson from "./src/prisma/contract.json" with { type: "json" };

/** @type {import('@prisma/composer-prisma-cloud/orm').PostgresContract<import('./src/prisma/contract').Contract>} */
const courtBudgetSystemContract = dataContract(courtBudgetSystemContractJson);

export default compute({
  name: "court-budget-system",
  deps: { db: postgres(courtBudgetSystemContract) },
  build: nextjs({ module: import.meta.url, appDir: "." }),
});

// @ts-check
import { module } from "@prisma/composer";
import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
import courtBudgetSystemContractJson from "./src/prisma/contract.json" with { type: "json" };
import courtBudgetSystemService from "./service.mjs";

export default module("prisma-postgres-celeste-car", ({ provision }) => {
  const database = provision(postgres({ name: "database", contract: dataContract(courtBudgetSystemContractJson), config: "./prisma.config.ts" }));
  provision(courtBudgetSystemService, { id: "courtbudgetsystem", deps: { db: database } });
});

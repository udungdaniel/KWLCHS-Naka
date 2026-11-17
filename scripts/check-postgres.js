const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE '_prisma%'
    ORDER BY tablename
  `;

  console.log("\nPOSTGRESQL DATABASE TABLES:");
  console.table(tables);

  console.log(`Total tables found: ${tables.length}`);
}

main()
  .catch((error) => {
    console.error("Database inspection failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

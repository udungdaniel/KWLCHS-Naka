const { PrismaClient: SQLiteClient } = require("../generated/sqlite-client");
const { PrismaClient: PostgreSQLClient } = require("@prisma/client");

const sqlite = new SQLiteClient();
const postgres = new PostgreSQLClient();

const models = [
  "setting",
  "department",
  "adminUser",
  "staff",
  "student",
  "application",
  "staffAttendance",
  "course",
  "result",
  "feeStructure",
  "payment",
  "announcement",
  "messageLog",
  "book",
  "timetable",
  "bookLoan"
];

async function main() {
  console.log("Reading records from SQLite...");

  const records = {};

  for (const model of models) {
    records[model] = await sqlite[model].findMany();
  }

  console.log("\nChecking PostgreSQL destination...");

  const destinationCounts = {};

  for (const model of models) {
    destinationCounts[model] = await postgres[model].count();
  }

  const existingRecords = Object.values(destinationCounts).reduce(
    (total, count) => total + count,
    0
  );

  if (existingRecords > 0) {
    throw new Error(
      `Migration stopped: PostgreSQL already contains ${existingRecords} records.`
    );
  }

  const sourceTotal = Object.values(records).reduce(
    (total, rows) => total + rows.length,
    0
  );

  console.log(`\nSQLite records found: ${sourceTotal}`);
  console.log("PostgreSQL is empty. Starting transfer...\n");

  await postgres.$transaction(
    async (tx) => {
      for (const model of models) {
        const rows = records[model];

        if (rows.length > 0) {
          await tx[model].createMany({
            data: rows,
            skipDuplicates: false
          });
        }

        console.log(`${model}: ${rows.length} records transferred`);
      }
    },
    {
      maxWait: 10000,
      timeout: 120000
    }
  );

  console.log("\nVerifying transferred records...\n");

  let destinationTotal = 0;

  for (const model of models) {
    const sourceCount = records[model].length;
    const destinationCount = await postgres[model].count();

    destinationTotal += destinationCount;

    const status =
      sourceCount === destinationCount ? "OK" : "MISMATCH";

    console.log(
      `${model}: SQLite=${sourceCount}, PostgreSQL=${destinationCount} [${status}]`
    );

    if (sourceCount !== destinationCount) {
      throw new Error(`Record count mismatch in ${model}`);
    }
  }

  if (sourceTotal !== destinationTotal) {
    throw new Error("Total record count verification failed.");
  }

  console.log("\n==================================");
  console.log("MIGRATION COMPLETED SUCCESSFULLY");
  console.log(`Total records transferred: ${destinationTotal}`);
  console.log("All record counts match.");
  console.log("==================================");
}

main()
  .catch((error) => {
    console.error("\nMIGRATION ERROR:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sqlite.$disconnect();
    await postgres.$disconnect();
  });

const { PrismaClient } = require("../generated/sqlite-client");

const prisma = new PrismaClient();

const models = [
  "setting",
  "department",
  "adminUser",
  "student",
  "application",
  "staff",
  "staffAttendance",
  "course",
  "result",
  "feeStructure",
  "payment",
  "announcement",
  "messageLog",
  "timetable",
  "book",
  "bookLoan"
];

async function main() {
  console.log("\nSQLITE DATABASE RECORD COUNTS:\n");

  for (const model of models) {
    const count = await prisma[model].count();
    console.log(`${model}: ${count}`);
  }
}

main()
  .catch((error) => {
    console.error("SQLite inspection failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

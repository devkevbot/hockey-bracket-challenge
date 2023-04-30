import { prisma } from "../src/server/db";

// eslint-disable-next-line @typescript-eslint/require-await
async function main() {
  console.log("Nothing to seed");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

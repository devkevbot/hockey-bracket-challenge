import { prisma } from "../src/server/db";
import { roundOneSeries } from "./roundOne";

async function main() {
  await prisma.prediction.deleteMany();
  await prisma.series.deleteMany();

  for await (const series of roundOneSeries) {
    await prisma.series.create(series);
  }
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

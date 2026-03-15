import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }) });
async function main() {
  const deleted = await prisma.booking.deleteMany({});
  const ideas = await prisma.idea.deleteMany({});
  console.log(`Deleted ${deleted.count} bookings, ${ideas.count} ideas`);
  await prisma.$disconnect();
}
main();

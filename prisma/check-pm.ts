import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const prisma = new PrismaClient({ adapter });

async function main() {
  const pms = await prisma.pM.findMany({
    select: { id: true, email: true, acceptBookings: true, calendarConnected: true, isActive: true },
  });
  console.log("PM records:", JSON.stringify(pms, null, 2));

  const tokens = await prisma.pMOAuthToken.findMany({
    select: { pmId: true, tokenExpiry: true },
  });
  console.log("OAuth tokens:", JSON.stringify(tokens, null, 2));

  await prisma.$disconnect();
}
main();

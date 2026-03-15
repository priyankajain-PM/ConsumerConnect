import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const pm = await prisma.pM.upsert({
    where: { email: "priyanka.jain@flobiz.in" },
    update: {},
    create: {
      name: "Priyanka Jain",
      email: "priyanka.jain@flobiz.in",
      expertiseTags: ["product", "growth", "onboarding"],
      maxCallsPerWeek: 5,
      minNoticeHours: 2,
      timezone: "Asia/Kolkata",
    },
  });
  console.log("PM created:", pm.id, pm.email);
}

main().then(() => prisma.$disconnect());

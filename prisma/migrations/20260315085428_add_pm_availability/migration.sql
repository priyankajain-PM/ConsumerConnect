-- CreateTable
CREATE TABLE "PMAvailability" (
    "id" TEXT NOT NULL,
    "pmId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "PMAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PMAvailability_pmId_idx" ON "PMAvailability"("pmId");

-- AddForeignKey
ALTER TABLE "PMAvailability" ADD CONSTRAINT "PMAvailability_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "PM"("id") ON DELETE CASCADE ON UPDATE CASCADE;

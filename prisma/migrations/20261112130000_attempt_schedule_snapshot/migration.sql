-- AlterTable
ALTER TABLE "attempt" ADD COLUMN     "prev_interval" INTEGER,
ADD COLUMN     "prev_status" "ProblemStatus";

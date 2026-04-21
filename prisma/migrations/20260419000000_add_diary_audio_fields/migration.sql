-- AlterTable
ALTER TABLE "DiaryEntry"
ADD COLUMN "audioDurationSec" INTEGER,
ADD COLUMN "audioMimeType" TEXT,
ADD COLUMN "audioName" TEXT,
ADD COLUMN "audioUrl" TEXT;

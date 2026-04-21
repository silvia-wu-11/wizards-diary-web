-- Align the live database schema with the current Prisma datamodel without losing existing user data.
CREATE EXTENSION IF NOT EXISTS "vector";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'username'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'accountId'
  ) THEN
    ALTER TABLE "User" RENAME COLUMN "username" TO "accountId";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'nickname'
  ) THEN
    ALTER TABLE "User" RENAME COLUMN "name" TO "nickname";
  END IF;
END $$;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "coreMemory" JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'User_username_key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'User_accountId_key'
  ) THEN
    ALTER INDEX "User_username_key" RENAME TO "User_accountId_key";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_accountId_key" ON "User"("accountId");

ALTER TABLE "DiaryEntry"
ADD COLUMN IF NOT EXISTS "vectorized" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "DiaryChunk" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "embedding" vector(1024) NOT NULL,

  CONSTRAINT "DiaryChunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DiaryChunk_entryId_idx" ON "DiaryChunk"("entryId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DiaryChunk_entryId_fkey'
  ) THEN
    ALTER TABLE "DiaryChunk"
    ADD CONSTRAINT "DiaryChunk_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "DiaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

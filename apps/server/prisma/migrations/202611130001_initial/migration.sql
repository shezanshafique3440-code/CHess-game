-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'ACTIVE', 'COMPLETED', 'ABORTED');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('WHITE_WIN', 'BLACK_WIN', 'DRAW');

-- CreateEnum
CREATE TYPE "ResultReason" AS ENUM ('CHECKMATE', 'STALEMATE', 'RESIGNATION', 'AGREEMENT', 'THREEFOLD_REPETITION', 'INSUFFICIENT_MATERIAL', 'FIFTY_MOVE_RULE', 'TIMEOUT', 'ABORTED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" VARCHAR(24) NOT NULL,
    "email" VARCHAR(254),
    "passwordHash" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "authVersion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" UUID NOT NULL,
    "whiteId" UUID NOT NULL,
    "blackId" UUID NOT NULL,
    "timeControl" VARCHAR(16) NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'WAITING',
    "result" "GameResult",
    "resultReason" "ResultReason",
    "pgn" TEXT NOT NULL DEFAULT '',
    "finalFen" TEXT,
    "whiteRatingBefore" INTEGER NOT NULL,
    "whiteRatingAfter" INTEGER,
    "blackRatingBefore" INTEGER NOT NULL,
    "blackRatingAfter" INTEGER,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Move" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "ply" INTEGER NOT NULL,
    "san" VARCHAR(16) NOT NULL,
    "fen" TEXT NOT NULL,
    "timeLeftMs" INTEGER NOT NULL,

    CONSTRAINT "Move_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isGuest_expiresAt_idx" ON "User"("isGuest", "expiresAt");

-- CreateIndex
CREATE INDEX "Game_whiteId_startedAt_idx" ON "Game"("whiteId", "startedAt");

-- CreateIndex
CREATE INDEX "Game_blackId_startedAt_idx" ON "Game"("blackId", "startedAt");

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Move_gameId_ply_key" ON "Move"("gameId", "ply");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_whiteId_fkey" FOREIGN KEY ("whiteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_blackId_fkey" FOREIGN KEY ("blackId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Move" ADD CONSTRAINT "Move_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;


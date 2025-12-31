-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'WORKER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "workId" INTEGER,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Attendance_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkDescription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Work" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "descriptionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Work_descriptionId_fkey" FOREIGN KEY ("descriptionId") REFERENCES "WorkDescription" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Work_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Material" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cost" REAL NOT NULL,
    "dateReceived" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "client" TEXT NOT NULL,
    "revenue" REAL
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_workId_key" ON "Attendance"("workId");

-- CreateIndex
CREATE INDEX "Attendance_userId_idx" ON "Attendance"("userId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_date_userId_key" ON "Attendance"("date", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkDescription_text_key" ON "WorkDescription"("text");

-- CreateIndex
CREATE INDEX "WorkDescription_text_idx" ON "WorkDescription"("text");

-- CreateIndex
CREATE INDEX "Work_userId_idx" ON "Work"("userId");

-- CreateIndex
CREATE INDEX "Work_date_idx" ON "Work"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Work_date_userId_key" ON "Work"("date", "userId");

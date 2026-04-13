-- CreateTable
CREATE TABLE "User" (
    "UserID" SERIAL NOT NULL,
    "UserNameFirst" TEXT NOT NULL,
    "UserNameLast" TEXT NOT NULL,
    "DOB" TIMESTAMP(3),
    "Gender" TEXT,
    "Mobile" TEXT,
    "Email" TEXT NOT NULL,
    "Password" TEXT,
    "Role" TEXT NOT NULL DEFAULT 'user',
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "LastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ProfileImageUrl" TEXT,
    "IsOnline" BOOLEAN NOT NULL DEFAULT false,
    "GoogleID" TEXT,
    "UpdateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("UserID")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_Mobile_key" ON "User"("Mobile");

-- CreateIndex
CREATE UNIQUE INDEX "User_Email_key" ON "User"("Email");

-- CreateIndex
CREATE UNIQUE INDEX "User_GoogleID_key" ON "User"("GoogleID");

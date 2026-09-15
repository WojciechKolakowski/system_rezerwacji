-- CreateEnum
CREATE TYPE "ChecklistPackageType" AS ENUM ('STANDARD', 'ADDITIONAL');

-- DropTable
DROP TABLE "checklist_template_items";

-- CreateTable
CREATE TABLE "checklist_task_catalog" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_task_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChecklistPackageType" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_package_items" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "checklist_package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_checklist_items" (
    "id" TEXT NOT NULL,
    "propertyAddressId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_package_items_packageId_taskId_key" ON "checklist_package_items"("packageId", "taskId");

-- CreateIndex
CREATE INDEX "property_checklist_items_propertyAddressId_idx" ON "property_checklist_items"("propertyAddressId");

-- AddForeignKey
ALTER TABLE "checklist_package_items" ADD CONSTRAINT "checklist_package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "checklist_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_package_items" ADD CONSTRAINT "checklist_package_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "checklist_task_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_checklist_items" ADD CONSTRAINT "property_checklist_items_propertyAddressId_fkey" FOREIGN KEY ("propertyAddressId") REFERENCES "property_addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;


CREATE INDEX "Inquiry_assignedToId_status_idx" ON "Inquiry"("assignedToId", "status");
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

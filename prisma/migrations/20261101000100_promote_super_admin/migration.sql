-- Ensure the platform has a Super Admin: promote the earliest active administrator if none exists.
-- (Separate migration because a new enum value cannot be used in the transaction that adds it.)
UPDATE "User" SET "role" = 'SUPER_ADMIN'
WHERE "id" = (SELECT "id" FROM "User" WHERE "role" = 'ADMIN' AND "disabledAt" IS NULL ORDER BY "createdAt" ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "role" = 'SUPER_ADMIN');

-- Default tenant accent (matches css/main.css --color-accent) when column was never set
UPDATE "organizations"
SET "primary_color" = '#ad2c4d'
WHERE "primary_color" IS NULL;

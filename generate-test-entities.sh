#!/bin/bash

# Reldens Storage - Generate Test Entities for All Drivers
# This script generates entity files for ObjectionJS, MikroORM, and Prisma drivers
# using the test database schema

set -e

echo "=== Reldens Storage - Test Entities Generator ==="
echo ""

# Database credentials from tests/.env.test
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="reldens"
DB_PASS="reldens"
DB_NAME="reldens_storage_test"

# Step 1: Setup database
echo "Step 1: Setting up test database..."
mysql -u ${DB_USER} -p${DB_PASS} -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME}"
echo "✓ Database created/verified"

echo "Step 2: Creating schema..."
mysql -u ${DB_USER} -p${DB_PASS} ${DB_NAME} < tests/fixtures/sql/test-schema.sql
echo "✓ Schema created"
echo ""

# Step 3: Generate for ObjectionJS
echo "Step 3: Generating entities for ObjectionJS..."
RELDENS_LOG_LEVEL=9 npx reldens-storage generateEntities \
  --host=${DB_HOST} \
  --port=${DB_PORT} \
  --user=${DB_USER} \
  --pass=${DB_PASS} \
  --database=${DB_NAME} \
  --driver=objection-js \
  --client=mysql2

if [ -d "generated-entities" ]; then
    echo "✓ ObjectionJS entities generated"
else
    echo "✗ Failed to generate ObjectionJS entities"
    exit 1
fi
echo ""

# Step 5: Generate for MikroORM
echo "Step 5: Generating entities for MikroORM..."
RELDENS_LOG_LEVEL=9 npx reldens-storage generateEntities \
  --host=${DB_HOST} \
  --port=${DB_PORT} \
  --user=${DB_USER} \
  --pass=${DB_PASS} \
  --database=${DB_NAME} \
  --driver=mikro-orm \
  --client=mysql

if [ -d "generated-entities" ]; then
    echo "✓ MikroORM entities generated"
else
    echo "✗ Failed to generate MikroORM entities"
    exit 1
fi
echo ""

# Step 7: Generate Prisma schema FIRST
echo "Step 7: Generating Prisma schema..."
RELDENS_LOG_LEVEL=9 npx reldens-storage-prisma \
  --host=${DB_HOST} \
  --port=${DB_PORT} \
  --user=${DB_USER} \
  --password=${DB_PASS} \
  --database=${DB_NAME} \
  --client=mysql

if [ -f "prisma/schema.prisma" ]; then
    echo "✓ Prisma schema generated"
else
    echo "✗ Failed to generate Prisma schema"
    exit 1
fi

# Step 8: Generate Prisma client
echo "Step 8: Generating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma

if [ -d "prisma/client" ]; then
    echo "✓ Prisma client generated"
else
    echo "✗ Failed to generate Prisma client"
    exit 1
fi

# Step 9: Generate Prisma entities
echo "Step 9: Generating entities for Prisma..."
RELDENS_LOG_LEVEL=9 npx reldens-storage generateEntities \
  --host=${DB_HOST} \
  --port=${DB_PORT} \
  --user=${DB_USER} \
  --pass=${DB_PASS} \
  --database=${DB_NAME} \
  --driver=prisma \
  --client=mysql

if [ -d "generated-entities" ]; then
    echo "✓ Prisma entities generated"
else
    echo "✗ Failed to generate Prisma entities"
    exit 1
fi
echo ""

# Cleanup prisma folder
if [ -d "prisma" ]; then
    echo "Cleaning up prisma folder..."
    rm -rf prisma
    echo "✓ Prisma folder removed"
fi

echo "=== All Done! ==="
echo ""
echo "Generated fixtures:"
echo "  - tests/fixtures/expected-entities-objection-js/"
echo "  - tests/fixtures/expected-entities-mikro-orm/"
echo "  - tests/fixtures/expected-entities-prisma/"
echo ""
echo "You can now run the integration tests with: npm test"

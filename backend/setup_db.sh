#!/bin/bash

# Variables for database and user
DB_NAME="buytogether"
DB_USER="buytogetheradm"

# Create a new database and user
createdb "$DB_NAME"
createuser -s "$DB_USER"

# Run schema file to set up the database structure
psql -U "$DB_USER" -d "$DB_NAME" -f schema.sql

echo "Database setup complete"

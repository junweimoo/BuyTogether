#!/bin/bash

# Variables for database and user
DB_NAME="buytogether"
DB_USER=""
ROLE="ubuntu"

# Drop the database
echo "Dropping database $DB_NAME..."
psql -U "$ROLE" -c "DROP DATABASE IF EXISTS $DB_NAME;"

# Drop the user
# echo "Dropping user $DB_USER..."
# psql -U "$ROLE" -c "DROP USER IF EXISTS $DB_USER;"

echo "Database deleted successfully"

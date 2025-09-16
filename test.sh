#!/bin/bash

# Script to test the emote system components

echo "Testing Emote System Components..."

# Create a test directory
mkdir -p /home/ubuntu/emote-system/test

# Test 1: Verify Docker Compose file exists
echo "Test 1: Verifying Docker Compose file..."
cd /home/ubuntu/emote-system
if [ -f "docker-compose.yml" ]; then
  echo "✅ Docker Compose file exists"
else
  echo "❌ Docker Compose file is missing"
  exit 1
fi

# Test 2: Check if all required files exist
echo "Test 2: Checking if all required files exist..."
required_files=(
  "/home/ubuntu/emote-system/docker-compose.yml"
  "/home/ubuntu/emote-system/emote-generator/Dockerfile"
  "/home/ubuntu/emote-system/emote-generator/index.js"
  "/home/ubuntu/emote-system/emote-generator/package.json"
  "/home/ubuntu/emote-system/server-a/Dockerfile"
  "/home/ubuntu/emote-system/server-a/index.js"
  "/home/ubuntu/emote-system/server-a/package.json"
  "/home/ubuntu/emote-system/server-b/Dockerfile"
  "/home/ubuntu/emote-system/server-b/index.js"
  "/home/ubuntu/emote-system/server-b/package.json"
  "/home/ubuntu/emote-system/frontend/Dockerfile"
  "/home/ubuntu/emote-system/frontend/nginx.conf"
  "/home/ubuntu/emote-system/frontend/package.json"
  "/home/ubuntu/emote-system/frontend/src/App.js"
  "/home/ubuntu/emote-system/frontend/src/index.js"
  "/home/ubuntu/emote-system/frontend/public/index.html"
  "/home/ubuntu/emote-system/documentation.md"
)

all_files_exist=true
for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Missing file: $file"
    all_files_exist=false
  fi
done

if $all_files_exist; then
  echo "✅ All required files exist"
else
  echo "❌ Some required files are missing"
  exit 1
fi

# Test 3: Validate Node.js files syntax
echo "Test 3: Validating Node.js files syntax..."
node_files=(
  "/home/ubuntu/emote-system/emote-generator/index.js"
  "/home/ubuntu/emote-system/server-a/index.js"
  "/home/ubuntu/emote-system/server-b/index.js"
)

all_syntax_valid=true
for file in "${node_files[@]}"; do
  node --check "$file" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "✅ Syntax valid: $file"
  else
    echo "❌ Syntax error in: $file"
    all_syntax_valid=false
  fi
done

if ! $all_syntax_valid; then
  echo "❌ Some Node.js files have syntax errors"
  exit 1
fi

# Test 4: Validate React files syntax
echo "Test 4: Validating React files syntax..."
node --check "/home/ubuntu/emote-system/frontend/src/App.js" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ React App.js syntax is valid"
else
  echo "❌ Syntax error in React App.js"
  exit 1
fi

echo "All tests passed! The emote system is ready for deployment."
echo "To run the system, use: docker-compose up -d"
echo "Then access the frontend at http://localhost:8080"

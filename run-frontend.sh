#!/usr/bin/env zsh

# Navigate to the frontend directory
if [[ -d "frontend" ]]; then
    cd frontend || exit
else
    echo "Error: frontend directory not found!"
    exit 1
fi

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Start the development server
echo "Starting frontend server..."
npm run dev

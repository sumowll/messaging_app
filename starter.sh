#!/bin/bash

# Start backend
echo "Starting backend..."
cd backend
nodemon server.js &

# Start frontend
echo "Starting frontend..."
cd ../frontend
npm run dev &

# Wait for all background processes to complete (optional)
wait

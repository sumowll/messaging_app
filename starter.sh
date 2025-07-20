#!/bin/bash

# Start backend nodejs server
echo "Starting backend..."
cd backend
nodemon server.js &

# start tools before agent server
cd agents/tools
echo "Starting agent server for CALCULATOR tool..."
uvicorn calculator_tool:app --port 8001 &
echo "Starting agent server for CALENDAR tool..."
uvicorn calendar_tool:app --port 8002 &

# start agent server
echo "Starting agent server..."
cd ..
uvicorn agent_server:app --port 5050 &

# Start frontend
echo "Starting frontend..."
cd ../../frontend
npm run dev &


# Wait for all background processes to complete (optional)
wait

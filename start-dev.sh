#!/bin/bash

echo "Starting SyncRoom Local Development..."

# Start Backend
echo "Starting Backend..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Start Python Microservice
echo "Starting Python Service..."
cd python-service
if [ ! -d "venv" ]; then
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
else
  source venv/bin/activate
fi
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
PYTHON_PID=$!
cd ..

echo "All services started! Press Ctrl+C to stop everything."

# Wait for user input to trap Ctrl+C and kill background processes
trap "kill $BACKEND_PID $FRONTEND_PID $PYTHON_PID" EXIT
wait

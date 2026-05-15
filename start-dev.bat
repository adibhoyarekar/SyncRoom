@echo off
echo Starting SyncRoom Local Development...

echo Starting Backend...
cd backend
start cmd /k "npm run dev"
cd ..

echo Starting Frontend...
cd frontend
start cmd /k "npm run dev"
cd ..

echo Starting Python Service...
cd python-service
if not exist "venv\" (
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)
start cmd /k "uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
cd ..

echo All services started in separate windows!

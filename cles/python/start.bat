@echo off
echo ========================================
echo CLES Attention Tracker Server
echo ========================================
echo.
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting server...
python attention_server.py

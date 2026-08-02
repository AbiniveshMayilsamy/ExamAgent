@echo off
rem Exam Cell AI Training & Execution Shortcut Batch Script
rem Usage:
rem   .\train.bat crewai --run --model llama3.1
rem   .\train.bat langchain --run --model llama3.1
rem   .\train.bat crewai --train --model llama3.1 --iterations 3

cd /d "%~dp0exam-cell-agent"
python cli_train.py %*

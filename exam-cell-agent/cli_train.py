"""
cli_train.py — Command Line Interface (CLI) to train and run CrewAI & LangChain Agents.

Usage Examples:
  # CrewAI Training CLI
  python cli_train.py crewai --train --iterations 3 --output trained_crew.pkl

  # CrewAI Execution
  python cli_train.py crewai --run

  # LangChain Training CLI
  python cli_train.py langchain --train --iterations 3

  # LangChain Execution
  python cli_train.py langchain --run
"""
import sys
import os
import io
import argparse
import json

if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from crew_agent import train_crew, create_exam_cell_crew
from langchain_agent import train_langchain_agent, build_langchain_executor


def run_crewai_cli(args):
    if args.train:
        print(f"Executing CrewAI Training CLI (iterations: {args.iterations}, model: {args.model})...")
        train_crew(n_iterations=args.iterations, filename=args.output, model_name=args.model)
    elif args.run:
        print(f"Running Exam Cell CrewAI Agents with model '{args.model}'...")
        crew = create_exam_cell_crew(model_name=args.model)
        result = crew.kickoff(inputs={"start_date": "2026-11-02", "leave_days": "[]"})
        print("\n--- CrewAI Run Output ---")
        print(result)
    else:
        print("Please specify --train or --run for CrewAI. Use --help for more info.")


def run_langchain_cli(args):
    if args.train:
        print(f"Executing LangChain Agent Training CLI (iterations: {args.iterations}, model: {args.model})...")
        res = train_langchain_agent(n_iterations=args.iterations, model_name=args.model)
        print(json.dumps(res, indent=2))
    elif args.run:
        print(f"Running Exam Cell LangChain Agent with model '{args.model}'...")
        executor = build_langchain_executor(model_name=args.model)
        res = executor.invoke({"messages": [("user", "Generate a timetable starting on 2026-11-02")]})
        print("\n--- LangChain Run Output ---")
        print(res)
    else:
        print("Please specify --train or --run for LangChain. Use --help for more info.")


def main():
    parser = argparse.ArgumentParser(description="Exam Cell AI Multi-Agent CrewAI & LangChain Training CLI")
    subparsers = parser.add_subparsers(dest="framework", required=True, help="Framework selection")

    # CrewAI Subparser
    crew_parser = subparsers.add_parser("crewai", help="CrewAI framework CLI")
    crew_parser.add_argument("--train", action="store_true", help="Train CrewAI agents using crew.train()")
    crew_parser.add_argument("--run", action="store_true", help="Run CrewAI agents")
    crew_parser.add_argument("--iterations", type=int, default=3, help="Number of training iterations (default: 3)")
    crew_parser.add_argument("--model", type=str, default="llama3.1", help="Ollama LLM model name (default: llama3.1)")
    crew_parser.add_argument("--output", type=str, default="trained_crew.pkl", help="Trained model output filename")

    # LangChain Subparser
    lc_parser = subparsers.add_parser("langchain", help="LangChain framework CLI")
    lc_parser.add_argument("--train", action="store_true", help="Train and benchmark LangChain agents")
    lc_parser.add_argument("--run", action="store_true", help="Run LangChain agent executor")
    lc_parser.add_argument("--iterations", type=int, default=3, help="Number of training iterations (default: 3)")
    lc_parser.add_argument("--model", type=str, default="llama3.1", help="Ollama LLM model name (default: llama3.1)")

    args = parser.parse_args()

    if args.framework == "crewai":
        run_crewai_cli(args)
    elif args.framework == "langchain":
        run_langchain_cli(args)


if __name__ == "__main__":
    main()

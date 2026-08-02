"""
Root CLI wrapper for Exam Cell AI Training & Execution.
Forwards CLI calls to exam-cell-agent/cli_train.py.
"""
import sys
import os

agent_dir = os.path.join(os.path.dirname(__file__), "exam-cell-agent")
if agent_dir not in sys.path:
    sys.path.insert(0, agent_dir)

os.chdir(agent_dir)

import cli_train

if __name__ == "__main__":
    cli_train.main()

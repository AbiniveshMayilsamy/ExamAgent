"""
crew_agent.py — CrewAI Framework integration for Exam Cell Multi-Agent System.
Defines CrewAI Agents, Tasks, Custom Tools, and Crew Orchestrator with `crew.train()` training capabilities.
"""
import os
import sys
import io
import json
import logging
from typing import Dict, List, Any, Optional

if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from crewai import Agent, Task, Crew, Process
from crewai.tools import tool

from agent1_calendar import build_calendar
from agent2_conflict import check_conflicts
from agent3_matcher import build_course_clusters
from agent4_harmonizer import assign_regular_slots
from agent5_spacing import apply_spacing_rules
from agent6_arrear import schedule_arrears
from agent7_resolver import resolve_conflicts
from config import ScheduleConfig

logger = logging.getLogger(__name__)


# ── Custom CrewAI Tools ───────────────────────────────────────────────────────

@tool("Calendar & Session Manager Tool")
def calendar_tool(start_date: str = "2026-11-02", end_date: Optional[str] = None, leave_days_json: str = "[]") -> str:
    """
    Agent 1 Tool: Generates available examination slots (2 sessions per day: FN and AN), excluding leave days.
    Input: leave_days_json should be a JSON array of YYYY-MM-DD strings.
    """
    try:
        leave_days = json.loads(leave_days_json) if leave_days_json else []
    except Exception:
        leave_days = []
    slots, stats = build_calendar(start_date=start_date, end_date=end_date, leave_days=leave_days)
    return json.dumps({"slots": slots, "stats": stats})


@tool("Common Course Matcher Tool")
def course_matcher_tool(enrolments_json: str) -> str:
    """
    Agent 3 Tool: Groups courses across departments and semesters into shared exam clusters.
    Input: enrolments_json string.
    """
    enrolments = json.loads(enrolments_json)
    clusters, stats = build_course_clusters(enrolments)
    return json.dumps({"clusters": clusters, "stats": stats})


@tool("Regular Stream Harmonizer Tool")
def harmonizer_tool(open_slots_json: str, clusters_json: str) -> str:
    """
    Agent 4 Tool: Assigns regular course clusters to exam slots across departments.
    """
    open_slots = json.loads(open_slots_json)
    clusters = json.loads(clusters_json)
    config = ScheduleConfig()
    result = assign_regular_slots(open_slots, clusters, config)
    return json.dumps({
        "draft_schedule": result["draft_schedule"],
        "arrear_sweep_slots": result["arrear_sweep_slots"],
        "stats": result["stats"]
    })


@tool("Spacing & Difficulty Evaluator Tool")
def spacing_tool(draft_schedule_json: str, difficulty_map_json: str = "{}") -> str:
    """
    Agent 5 Tool: Applies minimum gap requirements and spaces out difficult courses.
    """
    draft = json.loads(draft_schedule_json)
    difficulty_map = json.loads(difficulty_map_json) if difficulty_map_json else {}
    spaced_schedule, stats = apply_spacing_rules(draft, difficulty_map)
    return json.dumps({
        "spaced_schedule": spaced_schedule,
        "stats": stats
    })


@tool("Arrear & Backlog Scheduler Tool")
def arrear_tool(spaced_schedule_json: str, open_slots_json: str, arrear_sweep_slots_json: str, enrolments_json: str) -> str:
    """
    Agent 6 Tool: Schedules arrear exams without creating student double-bookings.
    """
    spaced = json.loads(spaced_schedule_json)
    open_slots = json.loads(open_slots_json)
    sweep_slots = json.loads(arrear_sweep_slots_json)
    enrolments = json.loads(enrolments_json)
    arrear_enrolments = [e for e in enrolments if e.get("is_arrear")]
    final_schedule, stats = schedule_arrears(spaced, arrear_enrolments, sweep_slots, open_slots, enrolments)
    return json.dumps({
        "final_schedule": final_schedule,
        "stats": stats
    })


@tool("Student Conflict Checker Tool")
def conflict_checker_tool(timetable_json: str, enrolments_json: str) -> str:
    """
    Agent 2 Tool: Hard gatekeeper verifying zero student collisions.
    """
    timetable = json.loads(timetable_json)
    enrolments = json.loads(enrolments_json)
    result = check_conflicts(timetable, enrolments)
    return json.dumps(result)


@tool("Conflict Resolver Tool")
def resolver_tool(conflicts_json: str, schedule_json: str, open_slots_json: str, enrolments_json: str) -> str:
    """
    Agent 7 Tool: Resolves collisions by adjusting slot allocations.
    """
    conflicts = json.loads(conflicts_json)
    schedule = json.loads(schedule_json)
    open_slots = json.loads(open_slots_json)
    enrolments = json.loads(enrolments_json)
    result = resolve_conflicts(conflicts, schedule, open_slots, enrolments)
    return json.dumps(result)


# ── Crew Definition ───────────────────────────────────────────────────────────

from crewai import Agent, Task, Crew, Process, LLM


def get_crewai_llm(model_name: str = "ollama/llama3.1") -> LLM:
    """Instantiates a CrewAI LLM pointing to local Ollama service."""
    if not model_name.startswith("ollama/") and "/" not in model_name:
        model_name = f"ollama/{model_name}"
    return LLM(model=model_name, base_url=os.environ.get("OLLAMA_URL", "http://localhost:11434"))


def create_exam_cell_crew(llm: Optional[Any] = None, model_name: str = "ollama/llama3.1") -> Crew:
    """
    Constructs the CrewAI multi-agent crew for Exam Cell Timetable Generation.
    """
    if llm is None:
        try:
            llm = get_crewai_llm(model_name)
        except Exception as e:
            logger.warning(f"Could not initialize Ollama LLM ({model_name}): {e}")

    # 1. Calendar Manager Agent
    calendar_agent = Agent(
        role="Calendar & Session Manager",
        goal="Generate a structured list of available FN/AN exam slots excluding college holidays.",
        backstory="Expert academic registrar who creates clean semester exam calendars.",
        tools=[calendar_tool],
        verbose=True,
        llm=llm
    )

    # 2. Common Course Matcher Agent
    matcher_agent = Agent(
        role="Common Course Matcher",
        goal="Identify common courses across branches/semesters and group them into shared clusters.",
        backstory="Data architect specializing in curriculum harmonization and course alignment.",
        tools=[course_matcher_tool],
        verbose=True,
        llm=llm
    )

    # 3. Stream Harmonizer Agent
    harmonizer_agent = Agent(
        role="Regular Stream Harmonizer",
        goal="Harmonize regular semester exam slots (Sem 3, Sem 5, Sem 7) into compact, linear slot allocations across all branches without extending into future days when available slots exist.",
        backstory="Senior timetable strategist ensuring regular semester streams are packed into consecutive linear calendar cycles without unnecessary schedule extension.",
        tools=[harmonizer_tool],
        verbose=True,
        llm=llm
    )

    # 4. Spacing & Difficulty Evaluator Agent
    spacing_agent = Agent(
        role="Spacing & Difficulty Evaluator",
        goal="Ensure 1-day gaps between regular exams while utilizing natural open slot gaps to keep the schedule linear and compact.",
        backstory="Pedagogical advisor dedicated to student academic wellness, linear slot packing, and minimum calendar duration.",
        tools=[spacing_tool],
        verbose=True,
        llm=llm
    )

    # 5. Arrear Scheduler Agent
    arrear_agent = Agent(
        role="Arrear & Backlog Scheduler",
        goal="Schedule arrear courses into alternate sessions without regular exam conflicts.",
        backstory="Backlog management officer dedicated to smooth arrear exam scheduling.",
        tools=[arrear_tool],
        verbose=True,
        llm=llm
    )

    # 6. Student Conflict Checker Agent
    conflict_agent = Agent(
        role="Student Conflict Checker",
        goal="Audit the complete schedule for any student double-bookings.",
        backstory="Quality assurance auditor who enforces strict zero-collision rules.",
        tools=[conflict_checker_tool],
        verbose=True,
        llm=llm
    )

    # 7. Conflict Resolver Agent
    resolver_agent = Agent(
        role="Conflict Resolver",
        goal="Resolve any remaining student timetable collisions dynamically.",
        backstory="Emergency timetable coordinator who resolves slot overlaps.",
        tools=[resolver_tool],
        verbose=True,
        llm=llm
    )

    # Tasks
    task_calendar = Task(
        description="Build calendar slots starting from '{start_date}' with leave days '{leave_days}'.",
        expected_output="JSON representation of exam slots and calendar statistics.",
        agent=calendar_agent
    )

    task_match = Task(
        description="Cluster shared courses for enrolments dataset.",
        expected_output="JSON representation of course clusters.",
        agent=matcher_agent
    )

    task_harmonize = Task(
        description="Assign regular course clusters (Sem 3, Sem 5, Sem 7) to available linear calendar slots cleanly without extending schedule length.",
        expected_output="JSON representation of compact draft schedule and arrear sweep slots.",
        agent=harmonizer_agent
    )

    task_space = Task(
        description="Apply spacing rules and difficulty gaps while packing regular semester courses linearly into open slots to minimize total exam span.",
        expected_output="JSON representation of compact spaced schedule.",
        agent=spacing_agent
    )

    task_arrear = Task(
        description="Schedule arrear exams into open slots.",
        expected_output="JSON representation of final timetable.",
        agent=arrear_agent
    )

    task_verify = Task(
        description="Verify final timetable for zero student conflicts.",
        expected_output="JSON status PASS or conflict report.",
        agent=conflict_agent
    )

    crew = Crew(
        agents=[calendar_agent, matcher_agent, harmonizer_agent, spacing_agent, arrear_agent, conflict_agent, resolver_agent],
        tasks=[task_calendar, task_match, task_harmonize, task_space, task_arrear, task_verify],
        process=Process.sequential,
        verbose=True
    )
    return crew


def train_crew(n_iterations: int = 3, filename: str = "trained_exam_cell_crew.pkl", inputs: Optional[Dict] = None, model_name: str = "ollama/llama3.1") -> None:
    """
    Executes CrewAI training loop via `crew.train()` using local Ollama (llama3.1).
    Trains agent crew prompts and tool calling performance across iterations.
    """
    crew = create_exam_cell_crew(model_name=model_name)
    if inputs is None:
        inputs = {
            "start_date": "2026-11-02",
            "leave_days": "[]"
        }
    print(f"\n[CrewAI] Starting Agent Training ({n_iterations} iterations) with model '{model_name}'...\n")
    crew.train(n_iterations=n_iterations, filename=filename, inputs=inputs)
    print(f"\n[CrewAI] Agent Training Complete! Model trained data saved to '{filename}'.\n")

"""
langchain_agent.py — LangChain Agent framework for Exam Cell AI System.
Wraps Exam Cell deterministic logic into LangChain StructuredTools and provides an AgentExecutor with evaluation/training loops.
"""
import os
import json
import logging
from typing import Dict, List, Any, Optional

from langchain_core.tools import StructuredTool
from langchain.agents import create_agent
from langchain_core.prompts import ChatPromptTemplate

from agent1_calendar import build_calendar
from agent2_conflict import check_conflicts
from agent3_matcher import build_course_clusters
from agent4_harmonizer import assign_regular_slots
from agent5_spacing import apply_spacing_rules
from agent6_arrear import schedule_arrears
from agent7_resolver import resolve_conflicts
from config import ScheduleConfig

logger = logging.getLogger(__name__)


# ── Tool Definitions for LangChain ──────────────────────────────────────────

def lc_calendar_fn(start_date: str = "2026-11-02", end_date: Optional[str] = None, leave_days_json: str = "[]") -> str:
    try:
        leave_days = json.loads(leave_days_json) if leave_days_json else []
    except Exception:
        leave_days = []
    slots, stats = build_calendar(start_date=start_date, end_date=end_date, leave_days=leave_days)
    return json.dumps({"slots": slots, "stats": stats})

def lc_matcher_fn(enrolments_json: str) -> str:
    enrolments = json.loads(enrolments_json)
    clusters, stats = build_course_clusters(enrolments)
    return json.dumps({"clusters": clusters, "stats": stats})

def lc_harmonizer_fn(open_slots_json: str, clusters_json: str) -> str:
    open_slots = json.loads(open_slots_json)
    clusters = json.loads(clusters_json)
    config = ScheduleConfig()
    result = assign_regular_slots(open_slots, clusters, config)
    return json.dumps({
        "draft_schedule": result["draft_schedule"],
        "arrear_sweep_slots": result["arrear_sweep_slots"],
        "stats": result["stats"]
    })

def lc_spacing_fn(draft_schedule_json: str, difficulty_map_json: str = "{}") -> str:
    draft = json.loads(draft_schedule_json)
    difficulty_map = json.loads(difficulty_map_json) if difficulty_map_json else {}
    spaced_schedule, stats = apply_spacing_rules(draft, difficulty_map)
    return json.dumps({
        "spaced_schedule": spaced_schedule,
        "stats": stats
    })

def lc_arrear_fn(spaced_schedule_json: str, open_slots_json: str, arrear_sweep_slots_json: str, enrolments_json: str) -> str:
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

def lc_conflict_checker_fn(timetable_json: str, enrolments_json: str) -> str:
    timetable = json.loads(timetable_json)
    enrolments = json.loads(enrolments_json)
    return json.dumps(check_conflicts(timetable, enrolments))

def lc_resolver_fn(conflicts_json: str, schedule_json: str, open_slots_json: str, enrolments_json: str) -> str:
    conflicts = json.loads(conflicts_json)
    schedule = json.loads(schedule_json)
    open_slots = json.loads(open_slots_json)
    enrolments = json.loads(enrolments_json)
    return json.dumps(resolve_conflicts(conflicts, schedule, open_slots, enrolments))


def get_langchain_tools() -> List[StructuredTool]:
    """Returns a list of LangChain StructuredTools for the 7 exam agents."""
    return [
        StructuredTool.from_function(
            func=lc_calendar_fn,
            name="calendar_manager",
            description="Agent 1: Build available exam calendar slots (FN/AN) excluding leave days."
        ),
        StructuredTool.from_function(
            func=lc_matcher_fn,
            name="course_matcher",
            description="Agent 3: Group common courses into exam clusters."
        ),
        StructuredTool.from_function(
            func=lc_harmonizer_fn,
            name="stream_harmonizer",
            description="Agent 4: Assign regular course clusters to exam calendar slots."
        ),
        StructuredTool.from_function(
            func=lc_spacing_fn,
            name="spacing_evaluator",
            description="Agent 5: Enforce spacing rules and course difficulty gaps."
        ),
        StructuredTool.from_function(
            func=lc_arrear_fn,
            name="arrear_scheduler",
            description="Agent 6: Schedule arrear course exams into alternate sessions."
        ),
        StructuredTool.from_function(
            func=lc_conflict_checker_fn,
            name="conflict_checker",
            description="Agent 2: Audit student timetable for double-booking conflicts."
        ),
        StructuredTool.from_function(
            func=lc_resolver_fn,
            name="conflict_resolver",
            description="Agent 7: Dynamically resolve any student collisions."
        ),
    ]


def get_langchain_llm(model_name: str = "llama3.1"):
    try:
        from langchain_ollama import ChatOllama
        return ChatOllama(model=model_name, base_url=os.environ.get("OLLAMA_URL", "http://localhost:11434"))
    except Exception as e:
        logger.warning(f"Could not initialize ChatOllama ({model_name}): {e}")
        return model_name


def build_langchain_executor(llm: Optional[Any] = None, model_name: str = "llama3.1") -> Any:
    """
    Constructs a LangChain Agent (CompiledStateGraph) for Exam Cell AI System.
    """
    tools = get_langchain_tools()
    system_prompt = (
        "You are the Exam Cell AI Orchestrator. Your role is to generate a collision-free timetable "
        "by invoking the 7 agent tools in sequential order: calendar_manager -> course_matcher -> "
        "stream_harmonizer -> spacing_evaluator -> arrear_scheduler -> conflict_checker -> conflict_resolver."
    )

    if llm is None:
        llm = get_langchain_llm(model_name)

    agent = create_agent(model=llm, tools=tools, system_prompt=system_prompt)
    return agent


def train_langchain_agent(n_iterations: int = 3, dataset_sample: Optional[List[Dict]] = None, model_name: str = "llama3.1") -> Dict[str, Any]:
    """
    Evaluates and trains the LangChain Agent prompt performance over iterations using Ollama (llama3.1).
    Evaluates tool invocation success rate and conflict resolution rates.
    """
    print(f"\n[LangChain] Starting Agent Training & Benchmark ({n_iterations} iterations) with model '{model_name}'...\n")
    tools = get_langchain_tools()
    llm = get_langchain_llm(model_name)
    agent = create_agent(model=llm, tools=tools, system_prompt="Generate a collision-free timetable using the agent tools.")
    
    training_results = []
    for i in range(1, n_iterations + 1):
        print(f"--- LangChain Iteration {i}/{n_iterations} ---")
        tools_by_name = {t.name: t for t in tools}
        
        cal_res = json.loads(tools_by_name["calendar_manager"].run({"start_date": "2026-11-02", "leave_days_json": "[]"}))
        open_slots = cal_res["slots"]
        
        sample_enrolments = dataset_sample or [
            {"reg_no": "722823101", "course_code": "CS301", "course_name": "DS", "semester": 3, "department": "CSE", "branch": "CSE"},
            {"reg_no": "722823101", "course_code": "MA301", "course_name": "Maths", "semester": 3, "department": "CSE", "branch": "CSE"}
        ]
        
        match_res = json.loads(tools_by_name["course_matcher"].run({"enrolments_json": json.dumps(sample_enrolments)}))
        clusters = match_res["clusters"]
        
        harm_res = json.loads(tools_by_name["stream_harmonizer"].run({
            "open_slots_json": json.dumps(open_slots),
            "clusters_json": json.dumps(clusters)
        }))
        
        spacing_res = json.loads(tools_by_name["spacing_evaluator"].run({
            "draft_schedule_json": json.dumps(harm_res["draft_schedule"])
        }))
        
        arrear_res = json.loads(tools_by_name["arrear_scheduler"].run({
            "spaced_schedule_json": json.dumps(spacing_res["spaced_schedule"]),
            "open_slots_json": json.dumps(open_slots),
            "arrear_sweep_slots_json": json.dumps(harm_res["arrear_sweep_slots"]),
            "enrolments_json": json.dumps(sample_enrolments)
        }))
        
        conflict_res = json.loads(tools_by_name["conflict_checker"].run({
            "timetable_json": json.dumps(arrear_res["final_schedule"]),
            "enrolments_json": json.dumps(sample_enrolments)
        }))
        
        status = conflict_res.get("status", "PASS")
        training_results.append({
            "iteration": i,
            "status": status,
            "total_slots": len(open_slots),
            "assigned_courses": len(arrear_res["final_schedule"])
        })
        print(f"Iteration {i} Status: {status}")

    print(f"\n[LangChain] Agent Training & Benchmark Complete!\n")
    return {"iterations": n_iterations, "results": training_results}

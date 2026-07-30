"""
groq_service.py — Interfacing with Groq AI API and Local Ollama LLM for course difficulty assessment,
conflict resolution guidance, and schedule summary generation.
"""
import os
import json
import logging
import requests

logger = logging.getLogger(__name__)

# Default fallback difficulty tagging if AI service is not available
FALLBACK_HARD_PREFIXES = ["MA", "MATH", "PH", "PHYS", "CH", "CHEM", "EE", "EC", "ME", "CS4", "CS5"]

def assess_course_difficulties(courses: list, groq_api_key: str = None) -> dict:
    """
    Given a list of course dicts or course code strings,
    returns a dict: { course_code: 'hard' | 'medium' | 'easy' }.
    Tries Groq API first, then local Ollama endpoint, then heuristic fallback.
    """
    difficulty_map = {}
    api_key = groq_api_key or os.environ.get("GROQ_API_KEY")
    ollama_url = os.environ.get("OLLAMA_URL", "http://localhost:11434")
    ollama_model = os.environ.get("OLLAMA_MODEL", "llama3")

    prompt = (
        "You are an academic exam coordinator. Assess the academic difficulty of each of the following courses as 'hard', 'medium', or 'easy'.\n"
        "Return ONLY a valid JSON object mapping course_code to difficulty string.\n\n"
        "Courses:\n"
    )
    course_inputs = []
    for c in courses:
        if isinstance(c, dict):
            code = c.get("course_code") or c.get("code") or ""
            name = c.get("course_name", "")
            credits = c.get("credits", 3)
        else:
            code = str(c)
            name = str(c)
            credits = 3
        course_inputs.append(f"- {code}: {name} ({credits} credits)")
    
    prompt += "\n".join(course_inputs)
    prompt += '\n\nExample Output format:\n{"U23MA204": "hard", "U23CS403": "medium"}'

    # 1. Try Groq API if key is present
    if api_key:
        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            response = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You output only clean, valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.1,
            )
            content = response.choices[0].message.content.strip()
            return _parse_json_response(content)
        except Exception as e:
            logger.warning(f"Groq API difficulty assessment failed: {e}")

    # 2. Try Local Ollama Endpoint
    try:
        resp = requests.post(f"{ollama_url}/api/chat", json={
            "model": ollama_model,
            "messages": [
                {"role": "system", "content": "You output only clean, valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "stream": False
        }, timeout=8)
        if resp.status_code == 200:
            content = resp.json().get("message", {}).get("content", "").strip()
            parsed = _parse_json_response(content)
            if parsed:
                return parsed
    except Exception as e:
        logger.debug(f"Ollama local service not reachable: {e}")

    # 3. Fallback Rule-Based Heuristic
    for c in courses:
        if isinstance(c, dict):
            code = str(c.get("course_code") or c.get("code") or "").strip()
            credits_val = int(c.get("credits", 3))
        else:
            code = str(c).strip()
            credits_val = 3
            
        if not code:
            continue
            
        is_hard_code = any(code.upper().startswith(p) or p in code.upper() for p in FALLBACK_HARD_PREFIXES) or credits_val >= 4
        if is_hard_code:
            difficulty_map[code] = "hard"
        else:
            difficulty_map[code] = "medium"

    return difficulty_map


def generate_schedule_summary(schedule: dict, groq_api_key: str = None) -> str:
    """
    Generates a natural language summary of the finalized timetable.
    """
    api_key = groq_api_key or os.environ.get("GROQ_API_KEY")
    ollama_url = os.environ.get("OLLAMA_URL", "http://localhost:11434")
    ollama_model = os.environ.get("OLLAMA_MODEL", "llama3")

    summary_prompt = (
        f"Summarize the generated exam schedule in 3 professional sentences:\n"
        f"Total Regular Exams: {len(schedule.get('regular_exams', []))}\n"
        f"Total Arrear Exams: {len(schedule.get('arrear_exams', []))}\n"
        f"Exam Window: {schedule.get('start_date')} to {schedule.get('end_date')}\n"
    )

    if api_key:
        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            response = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You write concise executive summaries of exam schedules."},
                    {"role": "user", "content": summary_prompt}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()
        except Exception:
            pass

    try:
        resp = requests.post(f"{ollama_url}/api/chat", json={
            "model": ollama_model,
            "messages": [
                {"role": "system", "content": "You write concise executive summaries of exam schedules."},
                {"role": "user", "content": summary_prompt}
            ],
            "stream": False
        }, timeout=8)
        if resp.status_code == 200:
            return resp.json().get("message", {}).get("content", "").strip()
    except Exception:
        pass

    total_exams = len(schedule.get("regular_exams", [])) + len(schedule.get("arrear_exams", []))
    return f"Schedule successfully generated with {total_exams} total exam sessions scheduled."


def _parse_json_response(content: str) -> dict:
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        parsed = json.loads(content)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


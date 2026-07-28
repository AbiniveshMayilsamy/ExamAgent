"""
groq_service.py — Interfacing with Groq AI API for course difficulty assessment,
conflict resolution guidance, and schedule summary generation.
"""
import os
import json
import logging

logger = logging.getLogger(__name__)

# Default fallback difficulty tagging if Groq API key is not present or fails
FALLBACK_HARD_PREFIXES = ["MA", "MATH", "PH", "PHYS", "CH", "CHEM", "EE", "EC", "ME", "CS4", "CS5"]

def assess_course_difficulties(courses: list, groq_api_key: str = None) -> dict:
    """
    Given a list of course dicts or course code strings,
    returns a dict: { course_code: 'hard' | 'medium' | 'easy' }.
    Uses Groq LLM if API key is available, else uses rule-based heuristic.
    """
    difficulty_map = {}
    api_key = groq_api_key or os.environ.get("GROQ_API_KEY")
    
    if api_key:
        try:
            from groq import Groq
            client = Groq(api_key=api_key)
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

            response = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You output only clean, valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.1,
            )
            content = response.choices[0].message.content.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                return parsed
        except Exception as e:
            logger.warning(f"Groq API difficulty assessment failed, falling back to heuristic: {e}")

    # Fallback Rule-Based Heuristic
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
    if not api_key:
        total_exams = len(schedule.get("regular_exams", [])) + len(schedule.get("arrear_exams", []))
        return f"Schedule successfully generated with {total_exams} total exam sessions scheduled."
        
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        summary_prompt = (
            f"Summarize the generated exam schedule in 3 professional sentences:\n"
            f"Total Regular Exams: {len(schedule.get('regular_exams', []))}\n"
            f"Total Arrear Exams: {len(schedule.get('arrear_exams', []))}\n"
            f"Exam Window: {schedule.get('start_date')} to {schedule.get('end_date')}\n"
        )
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You write concise executive summaries of exam schedules."},
                {"role": "user", "content": summary_prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        total_exams = len(schedule.get("regular_exams", [])) + len(schedule.get("arrear_exams", []))
        return f"Schedule successfully generated with {total_exams} total exam sessions scheduled."

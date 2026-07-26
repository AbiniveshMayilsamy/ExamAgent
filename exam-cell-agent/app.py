"""
app.py — Streamlit Web Dashboard for the Exam Cell AI Hub
"""
import io
import json
from datetime import date, timedelta

import pandas as pd
import streamlit as st

from hub import run_pipeline

st.set_page_config(page_title="Exam Cell AI Hub", layout="wide")
st.title("🎓 College Exam Cell — AI Timetable Generator")

# ── Sidebar: difficulty map ──────────────────────────────────────────────────
with st.sidebar:
    st.header("Course Difficulty Settings")
    st.caption("Set difficulty for each course code (used for Rule 9 — 2-day gap before hard exams).")
    difficulty_raw = st.text_area(
        "Difficulty map (JSON: {course_code: easy|medium|hard})",
        value=json.dumps({
            "CS301": "hard",
            "CS302": "hard",
            "MA101": "medium",
            "EC301": "medium",
            "EC302": "easy",
            "ME301": "hard",
            "ME302": "medium",
            "CS303": "medium",
            "CS201": "easy",
        }, indent=2),
        height=250,
    )
    try:
        difficulty_map = json.loads(difficulty_raw)
        st.success("Difficulty map loaded ✅")
    except json.JSONDecodeError:
        difficulty_map = {}
        st.error("Invalid JSON — using empty difficulty map.")

# ── Main layout ──────────────────────────────────────────────────────────────
col_input, col_output = st.columns([1, 2])

with col_input:
    st.subheader("📥 Input")

    uploaded_file = st.file_uploader(
        "Upload student data (CSV or JSON)",
        type=["csv", "json"],
        help="Required columns: name, reg_no, course_code, course_name, semester",
    )

    today = date.today()
    start_date = st.date_input("Exam start date", value=today + timedelta(days=7))
    end_date = st.date_input("Exam end date", value=today + timedelta(days=30))

    # Generate candidate dates for leave-day picker
    if start_date <= end_date:
        date_range = [
            (start_date + timedelta(days=i)).isoformat()
            for i in range((end_date - start_date).days + 1)
        ]
    else:
        date_range = []

    leave_days = st.multiselect(
        "Leave / holiday days",
        options=date_range,
        help="Select dates to exclude from the exam calendar (Rule 8).",
    )

    run_btn = st.button("🚀 Generate Timetable", type="primary", use_container_width=True)

with col_output:
    st.subheader("📊 Output")

    if uploaded_file and run_btn:
        if start_date > end_date:
            st.error("End date must be after start date.")
        else:
            with st.spinner("Agents are working on the schedule…"):
                try:
                    result = run_pipeline(
                        source=uploaded_file,
                        start_date=start_date.isoformat(),
                        end_date=end_date.isoformat(),
                        leave_days=leave_days,
                        difficulty_map=difficulty_map,
                    )
                except Exception as exc:
                    st.error(f"Pipeline error: {exc}")
                    st.stop()

            # ── Status banner ────────────────────────────────────────────────
            if result["status"] == "PASS":
                st.success("✅ Timetable generated — 0 student conflicts found (Rule 2).")
            else:
                st.warning(
                    "⚠️ Manual review required — some conflicts could not be auto-resolved. "
                    "See conflict details below."
                )
                with st.expander("Unresolved conflicts"):
                    st.json(result.get("conflicts", []))

            # ── Schedule table ───────────────────────────────────────────────
            schedule = result["schedule"]
            if schedule:
                df = pd.DataFrame(schedule)
                display_cols = ["date", "session", "course_code", "course_name",
                                "semester", "branches", "is_arrear", "difficulty"]
                display_cols = [c for c in display_cols if c in df.columns]
                df_display = df[display_cols].sort_values(["date", "session"])
                df_display["branches"] = df_display["branches"].apply(
                    lambda b: ", ".join(b) if isinstance(b, list) else b
                )
                df_display["is_arrear"] = df_display["is_arrear"].map({True: "Arrear", False: "Regular"})
                df_display.rename(columns={"is_arrear": "type"}, inplace=True)

                st.dataframe(df_display, use_container_width=True, hide_index=True)

                # ── Export buttons ───────────────────────────────────────────
                csv_bytes = df_display.to_csv(index=False).encode()
                st.download_button(
                    "📥 Download as CSV",
                    data=csv_bytes,
                    file_name="exam_timetable.csv",
                    mime="text/csv",
                )

                excel_buf = io.BytesIO()
                with pd.ExcelWriter(excel_buf, engine="openpyxl") as writer:
                    df_display.to_excel(writer, index=False, sheet_name="Timetable")
                st.download_button(
                    "📥 Download as Excel",
                    data=excel_buf.getvalue(),
                    file_name="exam_timetable.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            else:
                st.info("No exams were scheduled. Check your input data and date range.")

            # ── Audit log ────────────────────────────────────────────────────
            with st.expander("🔍 Agent Audit Log", expanded=True):
                for line in result["audit_log"]:
                    st.write(f"• {line}")

    elif not uploaded_file:
        st.info("Upload a student data file and click **Generate Timetable** to begin.")

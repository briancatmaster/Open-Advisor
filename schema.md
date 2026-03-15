# Course Database Schema

This database contains course information for all departments at the University of Michigan. Each row in the `courses` table represents a single course offering in a given term.

## Table: `courses`

| Column | Description | Example | Notes |
|--------|-------------|---------|-------|
| `course_code` | Unique identifier for the course, combining a subject code (e.g. MATH) and a catalog number (e.g. 425). | `MATH425` | This database will eventually contain courses from all departments, not just MATH. |
| `term_code` | Numeric code identifying the academic semester this course data was collected from. | `2610` | Higher numbers are more recent terms. |
| `url` | Link to the course's Atlas page, which contains additional information about the course. | `https://atlas.ai.umich.edu/courses/MATH425/2610/` | Atlas is the University of Michigan's course explorer tool. |
| `title` | Full display name of the course. | `Discover Computer Science` | Human-readable course title. The course code (e.g. `EECS110`) serves as the short identifier. |
| `description` | Full course description including topics covered and course goals. | `This course introduces students to the mathematical theory of probability...` | Free text. May include info about teaching style, tools used, or exam format. |
| `prerequisites` | Formal prerequisites that must be satisfied before enrolling. | `MATH 493; (C- or better)` | NULL means no formal prerequisites. May include grade requirements like 'C- or better'. |
| `advisory_prerequisites` | Recommended background knowledge, but not strictly enforced. | `MATH 205, 215, or 285` | NULL means no advisory prereqs listed. These are suggestions, not requirements. |
| `credits` | Number of credit hours the course awards. | `3.0` | Some courses have variable credits expressed as a range, e.g. '1.0 – 4.0'. |
| `workload` | Percentage of students who reported the course as having above-average workload. | `61%` | NULL means insufficient survey data. '0%' means no students reported high workload. |
| `median_grade` | Median grade awarded to students in this course. | `B+` | NULL means grade data is unavailable. Scale: A+, A, A-, B+, B, B-, etc. |
| `top_degrees` | JSON array of the most common degree programs pursued by students enrolled in this course, ordered by prevalence. | `["Mathematics BS", "Computer Science BS", "Statistics BS"]` | NULL means enrollment data is unavailable. Up to 3 degrees listed. |
| `scraped_at` | Timestamp of when this row was collected. | `2026-03-14 20:52:21` | Automatically set to the current time on insert. |


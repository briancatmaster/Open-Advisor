-- UMich Degree Advisor Course Database Schema
-- Replace seed data in seed.sql with real course data from your source

CREATE TABLE IF NOT EXISTS courses (
  -- Identity
  code          TEXT PRIMARY KEY,       -- e.g. "EECS 281"
  name          TEXT NOT NULL,          -- e.g. "Data Structures and Algorithms"
  department    TEXT NOT NULL,          -- e.g. "EECS"
  credits       REAL NOT NULL DEFAULT 4,

  -- Course content
  description   TEXT NOT NULL DEFAULT '', -- Full course description
  syllabus_summary TEXT NOT NULL DEFAULT '', -- 2-3 sentence summary of topics covered

  -- Prerequisites (stored as comma-separated course codes, e.g. "EECS 280,MATH 215")
  prereqs           TEXT NOT NULL DEFAULT '', -- Hard prerequisites
  advisory_prereqs  TEXT NOT NULL DEFAULT '', -- Recommended but not enforced

  -- Metrics (fill in from Atlas / Rate My Professor / registrar data)
  difficulty              REAL NOT NULL DEFAULT 3,   -- 1.0 (easy) to 5.0 (brutal)
  avg_grade               TEXT NOT NULL DEFAULT 'B+', -- e.g. "A-", "B+", "B"
  avg_weekly_hours        REAL NOT NULL DEFAULT 10,  -- Average hours/week from Atlas
  class_size              INTEGER NOT NULL DEFAULT 100,

  -- Offering schedule
  offered_fall    INTEGER NOT NULL DEFAULT 1,   -- 1 = yes, 0 = no
  offered_winter  INTEGER NOT NULL DEFAULT 1,
  offered_summer  INTEGER NOT NULL DEFAULT 0,

  -- People
  professors  TEXT NOT NULL DEFAULT '', -- Comma-separated professor names

  -- Classification tags (comma-separated)
  -- Common tags: required, elective, gateway, upper-level, writing, lab,
  --              algorithms, systems, ml, stats, data-science, robotics, theory
  tags  TEXT NOT NULL DEFAULT ''
);

-- Index for fast department filtering
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department);

-- Index for full-text search on name and description
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);

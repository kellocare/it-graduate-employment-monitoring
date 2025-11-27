CREATE TABLE "applications" (
  "id" integer PRIMARY KEY NOT NULL,
  "vacancy_id" integer,
  "graduate_id" integer,
  "status" varchar DEFAULT 'pending_test',
  "test_tasks" jsonb,
  "student_answers" jsonb,
  "ai_feedback" text,
  "ai_score" integer,
  "created_at" timestamp DEFAULT (now()),
  "cover_letter" text,
  "full_test_task" text,
  "full_test_solution_url" varchar,
  "final_verdict" text,
  "hiring_status" varchar DEFAULT 'none'
);

CREATE TABLE "audit_logs" (
  "id" integer PRIMARY KEY NOT NULL,
  "admin_id" integer,
  "action" varchar NOT NULL,
  "target_id" integer,
  "details" text,
  "ip_address" varchar,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "chat_messages" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer,
  "role" varchar NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT (now()),
  "sender_id" integer,
  "receiver_id" integer,
  "vacancy_id" integer,
  "mode" varchar DEFAULT 'vacancy'
);

CREATE TABLE "companies" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer,
  "name" varchar NOT NULL,
  "inn" varchar,
  "website" varchar,
  "description" text,
  "city" varchar,
  "ai_score" integer DEFAULT 0,
  "ai_summary" text,
  "logo_url" varchar
);

CREATE TABLE "competencies" (
  "id" integer PRIMARY KEY NOT NULL,
  "standard_id" integer,
  "code" varchar NOT NULL,
  "name" varchar NOT NULL,
  "description" text
);

CREATE TABLE "direct_messages" (
  "id" integer PRIMARY KEY NOT NULL,
  "sender_id" integer,
  "receiver_id" integer,
  "content" text NOT NULL,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp DEFAULT (now()),
  "vacancy_id" integer
);

CREATE TABLE "employment_records" (
  "id" integer PRIMARY KEY NOT NULL,
  "graduate_id" integer,
  "company_id" integer,
  "position_title" varchar NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "salary_amount" numeric,
  "is_current" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "graduates" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer,
  "specialty_id" integer,
  "first_name" varchar NOT NULL,
  "last_name" varchar NOT NULL,
  "middle_name" varchar,
  "graduation_year" integer,
  "avatar_url" varchar,
  "about_me" text,
  "phone" varchar,
  "city" varchar,
  "telegram" varchar,
  "birth_date" date,
  "portfolio_links" jsonb DEFAULT ([]),
  "roadmap_data" jsonb,
  "status" varchar DEFAULT 'search',
  "faculty" varchar,
  "salary" integer DEFAULT 0,
  "specialty_code" varchar
);

CREATE TABLE "interviews" (
  "id" integer PRIMARY KEY NOT NULL,
  "employer_id" integer,
  "student_id" integer,
  "vacancy_id" integer,
  "scheduled_at" timestamp NOT NULL,
  "meeting_link" varchar,
  "status" varchar DEFAULT 'scheduled',
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "invitations" (
  "id" integer PRIMARY KEY NOT NULL,
  "employer_user_id" integer,
  "student_user_id" integer,
  "status" varchar DEFAULT 'pending',
  "created_at" timestamp DEFAULT (now()),
  "vacancy_id" integer
);

CREATE TABLE "job_applications" (
  "id" integer PRIMARY KEY NOT NULL,
  "student_id" integer,
  "vacancy_id" integer,
  "status" varchar DEFAULT 'pending',
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "news" (
  "id" integer PRIMARY KEY NOT NULL,
  "title" varchar NOT NULL,
  "content" text,
  "image_url" varchar,
  "is_published" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "notifications" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer,
  "sender_id" integer,
  "title" varchar NOT NULL,
  "message" text NOT NULL,
  "type" varchar DEFAULT 'info',
  "is_read" boolean DEFAULT false,
  "created_at" timestamp DEFAULT (now()),
  "target_id" integer
);

CREATE TABLE "prof_standards" (
  "id" integer PRIMARY KEY NOT NULL,
  "code" varchar NOT NULL,
  "name" varchar NOT NULL
);

CREATE TABLE "recruiters" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer,
  "first_name" varchar,
  "last_name" varchar,
  "phone" varchar,
  "telegram" varchar,
  "avatar_url" varchar,
  "position" varchar
);

CREATE TABLE "resumes" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer,
  "filename" varchar NOT NULL,
  "file_path" varchar NOT NULL,
  "type" varchar DEFAULT 'pdf',
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "reviews" (
  "id" integer PRIMARY KEY NOT NULL,
  "company_id" integer,
  "student_id" integer,
  "rating" integer NOT NULL,
  "comment" text,
  "status" varchar DEFAULT 'pending',
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "roadmap_history" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer,
  "role_title" varchar,
  "progress" integer,
  "roadmap_data" jsonb,
  "completed_at" timestamp DEFAULT (now())
);

CREATE TABLE "skills" (
  "id" integer PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL
);

CREATE TABLE "specialties" (
  "id" integer PRIMARY KEY NOT NULL,
  "code" varchar NOT NULL,
  "name" varchar NOT NULL,
  "description" text
);

CREATE TABLE "university_reports" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer,
  "title" varchar NOT NULL,
  "type" varchar,
  "format" varchar,
  "file_path" varchar,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "university_staff" (
  "id" integer PRIMARY KEY NOT NULL,
  "user_id" integer,
  "full_name" varchar,
  "university_name" varchar,
  "position" varchar,
  "department" varchar,
  "office" varchar,
  "about_me" text,
  "university_logo" varchar,
  "stamp_url" varchar
);

CREATE TABLE "users" (
  "id" integer PRIMARY KEY NOT NULL,
  "email" varchar NOT NULL,
  "password_hash" varchar,
  "role" varchar NOT NULL DEFAULT 'graduate',
  "created_at" timestamp DEFAULT (now()),
  "is_verified" boolean DEFAULT false,
  "verification_token" varchar,
  "google_id" varchar,
  "github_id" varchar,
  "last_seen" timestamp DEFAULT (now()),
  "phone" varchar,
  "telegram" varchar,
  "avatar_url" varchar,
  "gender" varchar,
  "birth_date" date,
  "city" varchar,
  "patronymic" varchar
);

CREATE TABLE "vacancies" (
  "id" integer PRIMARY KEY NOT NULL,
  "company_id" integer,
  "title" varchar NOT NULL,
  "description" text NOT NULL,
  "salary_min" integer,
  "salary_max" integer,
  "contact_email" varchar,
  "created_at" timestamp DEFAULT (now()),
  "ai_summary" text,
  "status" varchar DEFAULT 'pending'
);

CREATE TABLE "vacancy_skills" (
  "vacancy_id" integer,
  "skill_id" integer,
  PRIMARY KEY ("vacancy_id", "skill_id")
);

ALTER TABLE "competencies" ADD FOREIGN KEY ("standard_id") REFERENCES "prof_standards" ("id");

ALTER TABLE "graduates" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "graduates" ADD FOREIGN KEY ("specialty_id") REFERENCES "specialties" ("id");

ALTER TABLE "companies" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "employment_records" ADD FOREIGN KEY ("graduate_id") REFERENCES "graduates" ("id");

ALTER TABLE "employment_records" ADD FOREIGN KEY ("company_id") REFERENCES "companies" ("id");

ALTER TABLE "vacancies" ADD FOREIGN KEY ("company_id") REFERENCES "companies" ("id");

ALTER TABLE "vacancy_skills" ADD FOREIGN KEY ("vacancy_id") REFERENCES "vacancies" ("id");

ALTER TABLE "vacancy_skills" ADD FOREIGN KEY ("skill_id") REFERENCES "skills" ("id");

ALTER TABLE "applications" ADD FOREIGN KEY ("vacancy_id") REFERENCES "vacancies" ("id");

ALTER TABLE "applications" ADD FOREIGN KEY ("graduate_id") REFERENCES "graduates" ("id");

ALTER TABLE "chat_messages" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "notifications" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "notifications" ADD FOREIGN KEY ("sender_id") REFERENCES "users" ("id");

ALTER TABLE "direct_messages" ADD FOREIGN KEY ("sender_id") REFERENCES "users" ("id");

ALTER TABLE "direct_messages" ADD FOREIGN KEY ("receiver_id") REFERENCES "users" ("id");

ALTER TABLE "invitations" ADD FOREIGN KEY ("employer_user_id") REFERENCES "users" ("id");

ALTER TABLE "invitations" ADD FOREIGN KEY ("student_user_id") REFERENCES "users" ("id");

ALTER TABLE "direct_messages" ADD FOREIGN KEY ("vacancy_id") REFERENCES "vacancies" ("id");

ALTER TABLE "invitations" ADD FOREIGN KEY ("vacancy_id") REFERENCES "vacancies" ("id");

ALTER TABLE "recruiters" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "audit_logs" ADD FOREIGN KEY ("admin_id") REFERENCES "users" ("id");

ALTER TABLE "reviews" ADD FOREIGN KEY ("company_id") REFERENCES "companies" ("id");

ALTER TABLE "reviews" ADD FOREIGN KEY ("student_id") REFERENCES "users" ("id");

ALTER TABLE "resumes" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "roadmap_history" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "interviews" ADD FOREIGN KEY ("employer_id") REFERENCES "users" ("id");

ALTER TABLE "interviews" ADD FOREIGN KEY ("student_id") REFERENCES "users" ("id");

ALTER TABLE "interviews" ADD FOREIGN KEY ("vacancy_id") REFERENCES "vacancies" ("id");

ALTER TABLE "chat_messages" ADD FOREIGN KEY ("sender_id") REFERENCES "users" ("id");

ALTER TABLE "chat_messages" ADD FOREIGN KEY ("receiver_id") REFERENCES "users" ("id");

ALTER TABLE "chat_messages" ADD FOREIGN KEY ("vacancy_id") REFERENCES "vacancies" ("id");

ALTER TABLE "university_staff" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "job_applications" ADD FOREIGN KEY ("student_id") REFERENCES "users" ("id");

ALTER TABLE "job_applications" ADD FOREIGN KEY ("vacancy_id") REFERENCES "vacancies" ("id");

ALTER TABLE "university_reports" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

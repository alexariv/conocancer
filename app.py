from flask import Flask, render_template, request, redirect, url_for, session, flash,jsonify
from flask import current_app
import requests
import mysql.connector
import hashlib
from io import BytesIO
import json
import os
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from config import Config
db = SQLAlchemy() 

load_dotenv()  

# ────── Flask App Setup ──────
app = Flask(__name__)
app.secret_key = os.environ["FLASK_SECRET_KEY"]  # e.g. set in Render as FLASK_SECRET_KEY

# ────── Database Helper ──────
def get_db_connection():
    return mysql.connector.connect(
        host      = os.environ["DB_HOST"],
        port      = int(os.environ.get("DB_PORT", 3306)),
        user      = os.environ["DB_USER"],
        password  = os.environ["DB_PASSWORD"],
        database  = os.environ["DB_NAME"],
        autocommit=True
    )
print("DB_HOST:", os.getenv("DB_HOST"))
print("DB_USER:", os.getenv("DB_USER"))

import openai
openai.api_key = os.getenv("OPENAI_API_KEY")

# Inject user_name globally into all templates
# ------------------------
@app.context_processor
def inject_user():
    return dict(
      user_name=session.get("user_name"),
      user_id=session.get("user_id")
    )

# ------------------------
# Landing Page
# ------------------------
@app.route("/")
def index():
    show_questionnaire = session.pop("show_questionnaire", False)
    return render_template("index.html", show_questionnaire=show_questionnaire)

# ------------------------
# Signup
# ------------------------
@app.route("/signup", methods=["POST"])
def signup():
    name = request.form.get("name")
    email = request.form.get("email")
    password = request.form.get("password")
    confirm_password = request.form.get("confirmPassword")
    preferred_language = request.form.get("preferred_language", "English")  # ✅ retrieve selected lang

    if password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400

    password_hash = hashlib.sha256(password.encode()).hexdigest()

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (name, email, password_hash, preferred_language)
            VALUES (%s, %s, %s, %s)
        """, (name, email, password_hash, preferred_language))  # ✅ use selected lang
        conn.commit()

        # Retrieve the user_id of the newly created user
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
        user_id = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        # Set session variables
        session["user_id"] = user_id
        session["user_name"] = name

        return jsonify({"success": True, "redirect": "/dashboard"}), 200

    except mysql.connector.IntegrityError:
        return jsonify({"error": "That email already exists."}), 400

    except Exception as e:
        print("Unexpected error during signup:", e)
        return jsonify({"error": "An unexpected error occurred."}), 500
    
# ------------------------
# Login
# ------------------------
@app.route("/login", methods=["POST"])
def login():
    email = request.form.get("loginEmail")
    password = request.form.get("loginPassword")
    password_hash = hashlib.sha256(password.encode()).hexdigest()

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s AND password_hash = %s", (email, password_hash))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if user:
        session["user_id"] = user["user_id"]
        session["user_name"] = user["name"]
        session["user_email"] = email
        flash(f"Welcome back, {user['name']}!", "success")
        return redirect(url_for("dashboard"))
    else:
        flash("Invalid login credentials", "error")
        return redirect(url_for("index"))

# ------------------------
# Questionnaire Submission
# ------------------------
@app.route("/submit_questionnaire", methods=["POST"])
def submit_questionnaire():
    if "user_email" not in session:
        return "Unauthorized", 403

    preferred_language = request.form.get("language")
    email = session["user_email"]

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users SET preferred_language = %s WHERE email = %s
    """, (preferred_language, email))
    conn.commit()
    cursor.close()
    conn.close()

    # Refresh session
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    session.pop("user_email", None)
    session["user_id"] = user["user_id"]
    session["user_name"] = user["name"]

    return render_template("overview-dashboard.html")

# ------------------------
# Main Dashboard
# ------------------------
@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("index"))
    return render_template(
      "overview-dashboard.html",
      user_id=session["user_id"]
    )

# ------------------------
# Static Pages
# ------------------------
@app.route("/videos-and-articles")
def videos_and_articles():
    return render_template("videos-and-articles.html")

@app.route("/progress")
def progress():
    return render_template("progress.html")

@app.route("/setting")
def setting():
    return render_template("setting.html")

# ------------------------
# Category Pages
# ------------------------
@app.route("/introduction")
def introduction():
    return render_template("introduction.html")

@app.route("/screening-detection")
def screening_detection():
    return render_template("screening-detection.html")

@app.route("/diagnosis")
def diagnosis():
    return render_template("diagnosis.html")

@app.route("/treatment")
def treatment():
    return render_template("treatment.html")

@app.route("/survivorship")
def survivorship():
    return render_template("survivorship.html")

# ------------------------
# Logout
# ------------------------
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))
@app.route("/video")
def video():
    return render_template("video_quiz.html")

@app.route("/api/questions/<video_id>")
def get_video_questions(video_id):
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT q.practice_question_id, q.practice_question_text, q.question_type, q.timestamp_seconds,
               q.category_id, o.option_number, o.option_text, o.is_correct
        FROM practice_questions q
        JOIN practice_question_options o
        ON q.practice_question_id = o.practice_question_id AND q.category_id = o.category_id
        WHERE q.video_id = %s
        ORDER BY q.timestamp_seconds, o.option_number
    """, (video_id,))
    rows = cur.fetchall()

    questions = {}
    for row in rows:
        qid = row['practice_question_id']
        if qid not in questions:
            questions[qid] = {
                'id': qid,
                'text': row['practice_question_text'],
                'type': row['question_type'],
                'timestamp': row['timestamp_seconds'],
                'category_id': row['category_id'],
                'options': []
            }
        questions[qid]['options'].append({
            'number': row['option_number'],
            'text': row['option_text']
        })
          # ✅ If this option is correct → save it
        if row['is_correct']:
            questions[qid]['correct_option'] = row['option_text']

    cur.close()
    conn.close()
    return jsonify(list(questions.values()))

@app.route("/submit_answer", methods=["POST"])
def submit_answer():
    data = request.get_json()
    user_id = data.get("user_id")  # ✅ This is already the correct user_id sent from frontend
    question_id = data.get("question_id")
    answer = data.get("answer")
    category_id = data.get("category_id")

    if not user_id:
        return jsonify({"error": "User ID missing"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # Insert into user_practice_progress
    cur.execute("""
        INSERT INTO user_practice_progress (
            user_id, category_id, practice_question_id, question_type, user_answer
        )
        SELECT %s, %s, %s, question_type, %s
        FROM practice_questions
        WHERE practice_question_id = %s AND category_id = %s
    """, (user_id, category_id, question_id, answer, question_id, category_id))

    # Insert into practice_evaluation
    cur.execute("""
        INSERT INTO practice_evaluation (
            user_id, category_id, practice_question_id, user_answer
        ) VALUES (%s, %s, %s, %s)
    """, (user_id, category_id, question_id, answer))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "Answer recorded successfully"})

@app.route("/check_answer", methods=["POST"])
def check_answer():
    data = request.get_json()
    user_id = data.get("user_id")
    question_id = data.get("question_id")
    answer = data.get("answer")
    category_id = data.get("category_id")

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    # Check if answer is correct
    cur.execute("""
        SELECT is_correct FROM practice_question_options
        WHERE category_id = %s AND practice_question_id = %s AND option_text = %s
    """, (category_id, question_id, answer))
    
    row = cur.fetchone()
    conn.close()

    if row and row["is_correct"]:
        return jsonify({"correct": True})
    else:
        return jsonify({"correct": False})
    
@app.route("/api/progress", methods=["GET", "POST"])
def api_progress():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify([])

    if request.method == "POST":
        data = request.get_json()
        lesson_key = data.get("lessonKey")
        status = data.get("status")

        if lesson_key.startswith("video"):
            lesson_type = "video"
            lesson_id = int(lesson_key.replace("video", ""))
        elif lesson_key.startswith("quiz"):
            lesson_type = "quiz"
            lesson_id = int(lesson_key.replace("quiz", ""))
        else:
            lesson_type = "reading"
            lesson_id = 1

        conn = get_db_connection()
        cur = conn.cursor()
        
 # 1) Total quizzes ever and quizzes completed:
    cur.execute("SELECT COUNT(*) AS total FROM study_questions")
    total_quizzes = cur.fetchone()["total"]
    cur.execute("""
      SELECT COUNT(DISTINCT study_question_id) AS done
      FROM user_study_progress
      WHERE user_id=%s
    """, (user_id,))
    done_quizzes = cur.fetchone()["done"]

    # 2) Categories mastered = categories where user has 100% on evaluate_study_quiz
    cur.execute("SELECT DISTINCT category_id FROM study_questions")
    all_cats = [r["category_id"] for r in cur.fetchall()]
    mastered = 0
    for cat in all_cats:
        # call your existing evaluation logic per category
        cur.execute("""
          SELECT 
            SUM(CASE WHEN question_type='Short Response' THEN
                        CASE WHEN user_answer IS NOT NULL AND LENGTH(user_answer)>0 THEN 2 ELSE 0 END
                     ELSE 1 END)      AS awarded,
            SUM(CASE WHEN question_type='Short Response' THEN 2 ELSE 1 END) AS possible
          FROM study_questions sq
          LEFT JOIN user_study_progress usp
            ON usp.study_question_id = sq.study_question_id
           AND usp.category_id       = sq.category_id
           AND usp.user_id           = %s
          WHERE sq.category_id = %s
        """, (user_id, cat))
        row = cur.fetchone()
        # only count as “mastered” if awarded == possible
        if row["awarded"] == row["possible"]:
            mastered += 1

    # 3) Build per-category breakdown for the little bars
    categories = []
    for cat in all_cats:
        cur.execute("SELECT COUNT(*) AS total FROM study_questions WHERE category_id=%s", (cat,))
        total = cur.fetchone()["total"]
        cur.execute("""
          SELECT COUNT(*) AS done
          FROM user_study_progress
          WHERE user_id=%s AND category_id=%s
        """, (user_id, cat))
        done  = cur.fetchone()["done"]
        # key can be a slug or numeric; your JS uses cat.key
        categories.append({ "key": str(cat), "completed": done, "total": total })

    cur.close()
    conn.close()

    overall = mastered / len(all_cats) * 100

    return jsonify({
      "overallProgress": round(overall),
      "totalQuizzes":    { "completed": done_quizzes, "total": total_quizzes },
      "categoriesMastered": { "completed": mastered, "total": len(all_cats) },
      "categories":      categories
    })

@app.route("/api/recent-quizzes")
def recent_quizzes():
    user_id = session.get("user_id")
    # 1) If not logged in, return an empty list
    if not user_id:
        return jsonify([]), 200

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    # 2) Pull the last 5 answers + scores
    cur.execute("""
      SELECT 
        usp.category_id,
        usp.study_question_id,
        sq.question_type,
        -- short responses get 2 points if non‐empty
        CASE 
          WHEN sq.question_type = 'Short Response' THEN
            CASE WHEN LENGTH(usp.user_answer) > 0 THEN 2 ELSE 0 END
          ELSE
            -- for MC/T&F, join to options to read is_correct (0 or 1)
            COALESCE(spo.is_correct, 0)
        END AS raw_score,
        -- define the max possible
        CASE 
          WHEN sq.question_type = 'Short Response' THEN 2
          ELSE 1
        END AS max_score
      FROM user_study_progress usp
      JOIN study_questions sq
        ON sq.category_id       = usp.category_id
       AND sq.study_question_id = usp.study_question_id
      LEFT JOIN study_question_options spo
        ON spo.category_id       = usp.category_id
       AND spo.study_question_id = usp.study_question_id
       AND spo.option_text       = usp.user_answer
      WHERE usp.user_id = %s
      ORDER BY usp.time_answered DESC
      LIMIT 5
    """, (user_id,))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    # 3) Map category IDs to names
    CATEGORY_NAMES = {
        1: "Introduction", 
        2: "Screening", 
        3: "Diagnosis",
        4: "Treatment",
        5: "Survivorship"
    }

    # 4) Build the JSON payload
    quizzes = []
    for r in rows:
        # avoid division‐by‐zero
        if r["max_score"] > 0:
            pct = round(r["raw_score"] / r["max_score"] * 100)
        else:
            pct = 0

        quizzes.append({
            "title":    f"Quiz {r['study_question_id']}",
            "category": CATEGORY_NAMES.get(r["category_id"], f"Cat {r['category_id']}"),
            "score":    pct
        })

    # 5) **Always** return something
    return jsonify(quizzes), 200




@app.route("/api/study-history")
def study_history():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify([]), 200

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)

    # 1) Which categories has the user ever touched?
    cur.execute("""
      SELECT DISTINCT category_id
      FROM user_study_progress
      WHERE user_id = %s
    """, (user_id,))
    cats = [r["category_id"] for r in cur.fetchall()]

    # Friendly names for display
    CATEGORY_NAMES = {
      1: "Introduction",
      2: "Screening",
      3: "Diagnosis",
      4: "Treatment",
      5: "Survivorship"
    }

    history = []

    for cat in cats:
        # 2) Count distinct days they answered in this category
        cur.execute("""
          SELECT COUNT(DISTINCT DATE(time_answered)) AS attempts
          FROM user_study_progress
          WHERE user_id = %s AND category_id = %s
        """, (user_id, cat))
        attempts = cur.fetchone()["attempts"] or 0

        # 3) Fetch all their saved answers for this category
        cur.execute("""
          SELECT study_question_id, question_type, user_answer
          FROM user_study_progress
          WHERE user_id = %s AND category_id = %s
        """, (user_id, cat))
        answers = cur.fetchall()

        total_awarded  = 0
        total_possible = 0
        summary_items  = []

        for ans in answers:
            qid   = ans["study_question_id"]
            ua    = (ans["user_answer"] or "").strip()
            qtype = ans["question_type"]

            if qtype in ("Multiple Choice", "T/F"):
                # 1 point questions
                cur.execute("""
                  SELECT is_correct
                  FROM study_question_options
                  WHERE category_id = %s
                    AND study_question_id = %s
                    AND option_text = %s
                """, (cat, qid, ua))
                row     = cur.fetchone()
                correct = bool(row and row["is_correct"])
                points  = 1
                maxp    = 1
                status  = "correct" if correct else "incorrect"

            else:
                # Short‐response (2 points)
                # Pull both English (…E) and Spanish (…S) variants
                base_id = qid[:-1]
                cur.execute("""
                  SELECT response_type, answer_text
                  FROM study_short_response
                  WHERE study_question_id IN (%s, %s)
                """, (base_id + "E", base_id + "S"))
                rows_sr = cur.fetchall()

                correct_phrases = set()
                semi_phrases    = set()
                for r in rows_sr:
                    for phrase in (r["answer_text"] or "").split(","):
                        p = phrase.strip().lower()
                        if not p: 
                            continue
                        if r["response_type"] == "correct":
                            correct_phrases.add(p)
                        elif r["response_type"] == "semi_correct":
                            semi_phrases.add(p)

                status = "incorrect"
                text_lc = ua.lower()
                if any(p in text_lc for p in correct_phrases):
                    status = "correct"
                elif any(p in text_lc for p in semi_phrases):
                    status = "semi_correct"

                if status == "correct":
                    points = 2
                elif status == "semi_correct":
                    points = 1
                else:
                    points = 0
                maxp = 2

            total_awarded  += points
            total_possible += maxp
            summary_items.append(f"{qid}:{status}")

        latest_score = (
            round(total_awarded / total_possible * 100)
            if total_possible > 0 else 0
        )
        summary = ", ".join(summary_items)

        history.append({
            "category":     CATEGORY_NAMES.get(cat, f"Category {cat}"),
            "attempts":     attempts,
            "latest_score": latest_score,
            "summary":      summary
        })

    cur.close()
    conn.close()

    return jsonify(history)


    
@app.route("/api/study_quiz/<int:category_id>")
def get_study_quiz(category_id):
    lang = request.args.get("lang", "en")
    lang_suffix = "E" if lang == "en" else "S"

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Get study questions filtered by language
    cursor.execute("""
        SELECT * FROM study_questions
        WHERE category_id = %s AND study_question_id LIKE %s
    """, (category_id, f"%{lang_suffix}"))

    questions = cursor.fetchall()

    result = []
    for q in questions:
        question_data = {
            "study_question_id": q["study_question_id"],
            "question_text": q["study_question_text"],
            "question_type": q["question_type"],
            "options": []
        }

        if q["question_type"] in ("Multiple Choice", "T/F"):
            cursor.execute("""
                SELECT option_text, is_correct
                FROM study_question_options
                WHERE category_id = %s AND study_question_id = %s
                ORDER BY option_number ASC
            """, (category_id, q["study_question_id"]))
            question_data["options"] = cursor.fetchall()

        result.append(question_data)

    conn.close()
    return jsonify(result)
@app.route("/api/submit_study_quiz", methods=["POST"])
def submit_study_quiz():
    data = request.get_json()
    # 1) Quick sanity check / logging
    print(" /api/submit_study_quiz got:", data)

    user_id     = data.get("user_id")
    category_id = data.get("category_id")
    answers     = data.get("answers", [])

    if not user_id or not category_id or not isinstance(answers, list):
        return jsonify({"error": "Malformed payload"}), 400

    conn   = get_db_connection()
    cursor = conn.cursor()

    for ans in answers:
        qid  = ans.get("question_id")
        qtyp = ans.get("question_type")
        # 2) grab either 'answer' or 'user_answer' from your JSON
        ua   = ans.get("answer", ans.get("user_answer", "")).strip()

        print(f" → inserting q={qid}, type={qtyp}, ua='{ua}'")

        try:
            cursor.execute("""
        INSERT INTO user_study_progress
          (user_id, category_id, study_question_id, question_type, user_answer)
        VALUES (%s,      %s,          %s,               %s,            %s)
        ON DUPLICATE KEY UPDATE
          user_answer = VALUES(user_answer),
          time_answered = CURRENT_TIMESTAMP
    """, (user_id, category_id, qid, qtyp, ua))
        except Exception as e:
            # 3) If something goes wrong, roll back & show the error
            conn.rollback()
            print("❌ SQL Error:", e)
            return jsonify({"error": str(e)}), 500

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"success": True})


@app.route("/api/save_study_answer", methods=["POST"])
def save_study_answer():
    data = request.get_json()

    user_id = data.get("user_id")
    category_id = data.get("category_id")
    question_id = data.get("question_id")
    question_type = data.get("question_type")
    answer = data.get("answer")

    conn = get_db_connection()
    cursor = conn.cursor()

    # UPSERT (Insert or Update)
    cursor.execute("""
        INSERT INTO user_study_progress (user_id, category_id, study_question_id, question_type, user_answer)
        VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE user_answer = VALUES(user_answer), time_answered = CURRENT_TIMESTAMP
    """, (user_id, category_id, question_id, question_type, answer))

    conn.commit()
    conn.close()

    return jsonify({"success": True})

@app.route("/api/evaluate_study_quiz", methods=["POST"])
def evaluate_study_quiz():
    data        = request.get_json()
    user_id     = data["user_id"]
    category_id = data["category_id"]

    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # fetch saved answers
    cursor.execute("""
      SELECT study_question_id, question_type, user_answer
      FROM user_study_progress
      WHERE user_id=%s AND category_id=%s
    """, (user_id, category_id))
    answers = cursor.fetchall()

    summary        = []
    total_awarded  = 0
    total_possible = 0

    for ans in answers:
        qid    = ans["study_question_id"]
        ua     = (ans["user_answer"] or "").strip()
        qtype  = ans["question_type"]

        # 1) Determine correctness + assign points
        if qtype in ("Multiple Choice", "T/F"):
            # look up the single correct flag
            cursor.execute("""
              SELECT is_correct
              FROM study_question_options
              WHERE category_id=%s
                AND study_question_id=%s
                AND option_text=%s
            """, (category_id, qid, ua))
            row = cursor.fetchone()
            correct = bool(row and row["is_correct"])
            points_awarded = 1 if correct else 0
            max_points     = 1
            status         = "correct" if correct else "incorrect"

        else:  # Short Response
            # pull both language variants
            base = qid[:-1]
            ids  = (base + "E", base + "S")
            cursor.execute(f"""
              SELECT response_type, answer_text
              FROM study_short_response
              WHERE study_question_id IN (%s, %s)
            """, ids)
            rows = cursor.fetchall()

            # build keyword sets
            kws = {"correct": set(), "semi_correct": set()}
            for r in rows:
                for phrase in (r["answer_text"] or "").split(","):
                    p = phrase.strip().lower()
                    if p: kws[r["response_type"]].add(p)

            # check user answer
            status = "incorrect"
            for p in kws["correct"]:
                if p in ua.lower():
                    status = "correct"
                    break
            if status == "incorrect":
                for p in kws["semi_correct"]:
                    if p in ua.lower():
                        status = "semi_correct"
                        break

            # points: 2/2 for correct, 1/2 semi, 0 otherwise
            if status == "correct":
                points_awarded = 2
            elif status == "semi_correct":
                points_awarded = 1
            else:
                points_awarded = 0
            max_points = 2

        total_awarded  += points_awarded
        total_possible += max_points

        summary.append({
            "question_id":     qid,
            "user_answer":     ua,
            "status":          status,
            "points_awarded":  points_awarded,
            "max_points":      max_points
        })

    conn.close()
    return jsonify({
        "summary":        summary,
        "total_awarded":  total_awarded,
        "total_possible": total_possible
    })

@app.route("/api/transcribe_whisper", methods=["POST"])
def transcribe_whisper():
    audio_data = request.data or b""
    if not audio_data:
        return jsonify({"error": "No audio data received"}), 400

    current_app.logger.debug(f"Received {len(audio_data)} bytes for transcription")

    audio_file = BytesIO(audio_data)
    audio_file.name = "audio.webm"

    try:
        # new v1 interface call
        transcript_resp = openai.audio.transcriptions.create(
            file=audio_file,
            model="whisper-1",
            response_format="json"
        )

        # *** CHANGE THIS LINE ***
        text = transcript_resp.text.strip()

        current_app.logger.debug(f"Whisper returned text: {text!r}")
        return jsonify({"transcript": text})

    except Exception as e:
        current_app.logger.exception("Whisper transcription failed")
        return jsonify({"error": str(e)}), 500

    
@app.route('/resources')
def resources():
    return render_template('resources.html')

# API: Load enriched hospitals from file
@app.route('/api/hospitals')
def hospitals():
    with open("northwell_enriched.json") as f:
        hospitals_data = json.load(f)
    return jsonify(hospitals_data)

@app.route('/api/hospitals/<int:hospital_id>')
def get_hospital_detail(hospital_id):
    with open("northwell_enriched.json") as f:
        hospitals_data = json.load(f)
    result = next((h for h in hospitals_data if h["id"] == hospital_id), None)
    return jsonify(result or {"error": "Hospital not found"}), 200 if result else 404

# API: Support groups
@app.route('/api/support-groups')
def support_groups():
    return jsonify(get_all_support_groups())

@app.route('/api/support-groups/<int:group_id>')
def get_support_group_detail(group_id):
    groups = get_all_support_groups()
    grp = next((g for g in groups if g["id"] == group_id), None)
    return jsonify(grp or {"error": "Support group not found"}), 200 if grp else 404

@app.route("/api/introduction_progress")
def get_intro_progress():
    user_id = request.args.get("user_id")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
    SELECT 
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
    FROM user_progress_VQR
    WHERE user_id = %s
      AND (
        (lesson_type = 'video' AND lesson_id BETWEEN 1 AND 3) OR
        (lesson_type = 'reading' AND lesson_id = 1) OR
        (lesson_type = 'quiz' AND lesson_id = 1)
      )
    """
    cursor.execute(query, (user_id,))
    result = cursor.fetchone()

    completed = result['completed'] or 0
    percent = round((completed / 5) * 100)

    cursor.close()
    conn.close()

    return jsonify({
        "category": "introduction",
        "completed": completed,
        "total": 5,
        "percent": percent
    })


@app.route("/api/next-upcoming")
def api_next_upcoming():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify([])

    category_order = ["overview", "diagnosis", "treatment", "survivor"]
   
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    for category in category_order:
        cur.execute("""
            SELECT lesson_id, title, duration
            FROM videos
            WHERE category = %s
            ORDER BY lesson_id ASC
        """, (category,))
        all_videos = cur.fetchall()

        for video in all_videos:
            cur.execute("""
                SELECT status FROM user_progress_VQR
                WHERE user_id = %s AND lesson_type = 'video' AND lesson_id = %s
            """, (user_id, video["lesson_id"]))
            result = cur.fetchone()

            if not result or result["status"] != "completed":
                return jsonify([{
                    "title": video["title"],
                    "duration": f"{video['duration']} min",
                    "icon": "/static/imgs/video-icon.png",
                    "category": category
                }])

    cur.close()
    conn.close()
    return jsonify([]) 

#----------
#password reset.
#---------
@app.route("/request-reset", methods=["POST"])
def request_reset():
    email = request.json.get("email")
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user:
        return jsonify(success=False, error="Email not found"), 404

    session["reset_email"] = email
    return jsonify(success=True)


@app.route("/reset-password", methods=["POST"])
def reset_password():
    email = session.get("reset_email")
    new_password = request.json.get("newPassword")

    if not email or not new_password:
        return jsonify(success=False), 400

    password_hash = hashlib.sha256(new_password.encode()).hexdigest()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET password_hash = %s WHERE email = %s", (password_hash, email))
    conn.commit()
    cursor.close()
    conn.close()

    session.pop("reset_email", None)
    return jsonify(success=True) 

@app.route('/api/progress/position', methods=['POST'])
def save_position():
    data = request.get_json() or {}
    user_id   = session.get("user_id")
    if not user_id:
        return jsonify(error="Not authenticated"), 401

    video_key = data.get('lessonKey')            # "video3"
    try:
        position = float(data.get('position', 0))
    except (TypeError, ValueError):
        return jsonify(error="Invalid position"), 400

    conn = get_db_connection()
    cur  = conn.cursor()

    # UPSERT: insert or update existing
    cur.execute("""
      INSERT INTO video_progress_timestamp (user_id, video_key, last_position_seconds)
      VALUES (%s, %s, %s)
      ON DUPLICATE KEY UPDATE
        last_position_seconds = VALUES(last_position_seconds),
        updated_at = CURRENT_TIMESTAMP
    """, (user_id, video_key, position))

    conn.commit()
    cur.close()
    conn.close()
    return jsonify(success=True)

@app.route('/api/progress/position')
def get_position():
    user_id   = session.get("user_id")
    if not user_id:
        return jsonify(position=0)

    video_key = request.args.get('lessonKey', '')
    conn = get_db_connection()
    cur  = conn.cursor()
    cur.execute("""
      SELECT last_position_seconds
      FROM video_progress_timestamp
      WHERE user_id=%s AND video_key=%s
    """, (user_id, video_key))
    row = cur.fetchone()
    cur.close()
    conn.close()

    return jsonify(position=(row[0] if row else 0))

@app.route("/api/study_answers/<int:category_id>")
def get_saved_study_answers(category_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify([]), 200

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
      SELECT study_question_id, question_type, user_answer
      FROM user_study_progress
      WHERE user_id = %s AND category_id = %s
    """, (user_id, category_id))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(rows), 200

# at the bottom of your routes:

@app.route("/api/clear_study_answers/<int:category_id>", methods=["POST"])
def clear_study_answers(category_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    conn = get_db_connection()
    cur = conn.cursor()
    # delete their previous attempt for this category
    cur.execute("""
      DELETE FROM user_study_progress
      WHERE user_id = %s
        AND category_id = %s
    """, (user_id, category_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True})


# ────── Run Server ──────
if __name__ == "__main__":
    app.run(debug=True)
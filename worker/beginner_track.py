import json
import urllib.request
import urllib.error
import datetime

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
START_DATE = datetime.date(2026, 11, 15)


def calculate_challenge_streak(
    submission_calendar_str: str, start_date: datetime.date = START_DATE
) -> tuple[int, int, int]:
    """
    Calculate (max_streak, current_streak, total_active_days)
    strictly from start_date (15 Nov 2026) onwards.
    """
    if not submission_calendar_str:
        return 0, 0, 0

    try:
        calendar_dict = json.loads(submission_calendar_str)
    except Exception:
        return 0, 0, 0

    active_dates = set()
    for ts_str, count in calendar_dict.items():
        if count and int(count) > 0:
            d = datetime.datetime.fromtimestamp(int(ts_str), tz=datetime.timezone.utc).date()
            if d >= start_date:
                active_dates.add(d)

    if not active_dates:
        return 0, 0, 0

    sorted_dates = sorted(active_dates)
    total_active_days = len(sorted_dates)

    max_streak = 0
    curr_run = 0
    prev_d = None

    for d in sorted_dates:
        if prev_d is None or (d - prev_d).days == 1:
            curr_run = curr_run + 1 if prev_d else 1
        else:
            curr_run = 1
        if curr_run > max_streak:
            max_streak = curr_run
        prev_d = d

    today = datetime.datetime.now(datetime.timezone.utc).date()
    current_streak = 0
    check_date = today
    if check_date not in active_dates:
        check_date = today - datetime.timedelta(days=1)

    while check_date in active_dates and check_date >= start_date:
        current_streak += 1
        check_date -= datetime.timedelta(days=1)

    return max_streak, current_streak, total_active_days


def get_beginner_stats(username: str, start_date: datetime.date = START_DATE) -> dict:
    """
    Fetch accepted problem counts and streak on LeetCode for Beginner's Track.
    Streak and active days are strictly calculated from 15 Nov 2026 onwards.
    Uses acSubmissionNum (accepted count) instead of total submission count.
    """
    if not username:
        return {
            "streak": 0,
            "current_streak": 0,
            "total_active_days": 0,
            "ac_count": 0,
            "easy_ac": 0,
            "medium_ac": 0,
            "hard_ac": 0,
        }

    query = """
    query userProblemsSolvedAndCalendar($username: String!) {
      matchedUser(username: $username) {
        userCalendar {
          streak
          totalActiveDays
          submissionCalendar
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
    """
    payload = json.dumps({"query": query, "variables": {"username": username}}).encode()
    req = urllib.request.Request(
        "https://leetcode.com/graphql",
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            matched_user = data.get("data", {}).get("matchedUser") or {}
            user_calendar = matched_user.get("userCalendar") or {}
            ac_list = matched_user.get("submitStatsGlobal", {}).get("acSubmissionNum") or []

            ac_map = {item.get("difficulty"): item.get("count", 0) for item in ac_list}
            sub_cal = user_calendar.get("submissionCalendar", "{}")

            max_streak, current_streak, active_days = calculate_challenge_streak(
                sub_cal, start_date
            )

            return {
                "streak": max_streak,
                "current_streak": current_streak,
                "total_active_days": active_days,
                "ac_count": ac_map.get("All", 0),
                "easy_ac": ac_map.get("Easy", 0),
                "medium_ac": ac_map.get("Medium", 0),
                "hard_ac": ac_map.get("Hard", 0),
            }
    except Exception as e:
        print(f"[BeginnerTrack] Failed for {username}: {e}")
        return {
            "streak": 0,
            "current_streak": 0,
            "total_active_days": 0,
            "ac_count": 0,
            "easy_ac": 0,
            "medium_ac": 0,
            "hard_ac": 0,
        }

import json
import urllib.request
import urllib.error

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def get_beginner_stats(username: str) -> dict:
    """
    Fetch accepted problem counts and streak on LeetCode for Beginner's Track.
    Uses acSubmissionNum (accepted count) instead of total submission count.
    """
    if not username:
        return {
            "streak": 0,
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

            return {
                "streak": user_calendar.get("streak", 0),
                "total_active_days": user_calendar.get("totalActiveDays", 0),
                "ac_count": ac_map.get("All", 0),
                "easy_ac": ac_map.get("Easy", 0),
                "medium_ac": ac_map.get("Medium", 0),
                "hard_ac": ac_map.get("Hard", 0),
            }
    except Exception as e:
        print(f"[BeginnerTrack] Failed for {username}: {e}")
        return {
            "streak": 0,
            "total_active_days": 0,
            "ac_count": 0,
            "easy_ac": 0,
            "medium_ac": 0,
            "hard_ac": 0,
        }

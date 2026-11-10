import os
import time
import json
import urllib.request
import urllib.error
import urllib.parse
import datetime
from decimal import Decimal

START_TIMESTAMP = int(
    datetime.datetime(2026, 11, 15, 0, 0, 0, tzinfo=datetime.timezone.utc).timestamp()
)
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def get_leetcode_stats(username: str, start_time: int = START_TIMESTAMP) -> tuple[int, float]:
    """Fetch (contest_count, net_rating_increment) on LeetCode after start_time."""
    if not username:
        return 0, 0.0

    query = """
    query userContestRankingInfo($username: String!) {
      userContestRankingHistory(username: $username) {
        attended
        rating
        contest {
          startTime
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
            history = data.get("data", {}).get("userContestRankingHistory", []) or []
            attended = [h for h in history if h.get("attended")]
            in_period = [c for c in attended if c.get("contest", {}).get("startTime", 0) >= start_time]

            if not in_period:
                return 0, 0.0

            prior = [c for c in attended if c.get("contest", {}).get("startTime", 0) < start_time]
            baseline_rating = prior[-1]["rating"] if prior else 1500.0
            final_rating = in_period[-1]["rating"]

            return len(in_period), round(final_rating - baseline_rating, 2)
    except Exception as e:
        print(f"[LeetCode] Failed for {username}: {e}")
        return 0, 0.0


def get_codeforces_stats(handle: str, start_time: int = START_TIMESTAMP) -> tuple[int, float]:
    """Fetch (contest_count, net_rating_increment) on Codeforces after start_time."""
    if not handle:
        return 0, 0.0

    url = f"https://codeforces.com/api/user.rating?handle={urllib.parse.quote(handle)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            if data.get("status") != "OK":
                print(f"[Codeforces] API not OK for {handle}: {data.get('comment')}")
                return 0, 0.0
            results = data.get("result", []) or []
            in_period = [c for c in results if c.get("ratingUpdateTimeSeconds", 0) >= start_time]

            if not in_period:
                return 0, 0.0

            rating_diff = in_period[-1].get("newRating", 0) - in_period[0].get("oldRating", 0)
            return len(in_period), float(rating_diff)
    except urllib.error.HTTPError as e:
        print(f"[Codeforces] HTTP Error for {handle}: {e.code}")
        return 0, 0.0
    except Exception as e:
        print(f"[Codeforces] Failed for {handle}: {e}")
        return 0, 0.0


def run_worker():
    import boto3
    from boto3.dynamodb.conditions import Attr

    table_name = os.environ.get("TABLE_NAME", "CP_Challenge_2026")
    region_name = os.environ.get("REGION_NAME", "ap-southeast-2")

    dynamodb = boto3.resource("dynamodb", region_name=region_name)
    table = dynamodb.Table(table_name)

    print(f"Fetching students from DynamoDB table '{table_name}'...")
    students = []
    response = table.scan(FilterExpression=Attr("SK").eq("PROFILE"))
    students.extend(response.get("Items", []))
    while "LastEvaluatedKey" in response:
        response = table.scan(
            FilterExpression=Attr("SK").eq("PROFILE"),
            ExclusiveStartKey=response["LastEvaluatedKey"],
        )
        students.extend(response.get("Items", []))

    print(f"Found {len(students)} students to process.")

    for i, student in enumerate(students, 1):
        name = student.get("name", "Unknown")
        enr_no = student.get("enr_no") or student.get("enrollment_number", "N/A")
        lc_id = student.get("leetcode_id", "").strip()
        cf_id = student.get("codeforces_id", "").strip()

        print(f"[{i}/{len(students)}] Processing {name} ({enr_no})...")

        lc_count, lc_diff = get_leetcode_stats(lc_id) if lc_id else (0, 0.0)
        time.sleep(0.5)

        cf_count, cf_diff = 0, 0.0
        if cf_id:
            cf_count, cf_diff = get_codeforces_stats(cf_id)
            time.sleep(2)  # Codeforces rate limit: 1 request per 2 seconds

        total_contests = lc_count + cf_count
        rating_increment = round(lc_diff + cf_diff, 2)

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        table.update_item(
            Key={"PK": student["PK"], "SK": student["SK"]},
            UpdateExpression=(
                "SET leetcode_contests = :lc, codeforces_contests = :cf, "
                "total_contests = :tot, leetcode_rating_diff = :lcd, "
                "codeforces_rating_diff = :cfd, rating_increment = :ri, "
                "contests_updated_at = :now"
            ),
            ExpressionAttributeValues={
                ":lc": lc_count,
                ":cf": cf_count,
                ":tot": total_contests,
                ":lcd": Decimal(str(lc_diff)),
                ":cfd": Decimal(str(cf_diff)),
                ":ri": Decimal(str(rating_increment)),
                ":now": now,
            },
        )
        print(f"  -> Contests: {total_contests} (LC: {lc_count}, CF: {cf_count}) | Net Rating: {rating_increment:+} (LC: {lc_diff:+}, CF: {cf_diff:+})")

    print("Worker finished successfully.")


if __name__ == "__main__":
    run_worker()


import os
import sys
import time
import json
import datetime
from decimal import Decimal

sys.path.insert(0, os.path.dirname(__file__))

from beginner_track import get_beginner_stats
from cp_track import get_leetcode_stats, get_codeforces_stats


def normalize_handle(val: str) -> str:
    if not val:
        return ""
    clean = val.strip().split("?")[0].rstrip("/")
    return clean.split("/")[-1].lstrip("@").strip()


def handler(event=None, context=None):
    """
    Main worker handler: iterates over registered students in DynamoDB,
    delegating to Beginner's Track or Competitive Track based on student track.
    """
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
        track = student.get("track", "").strip()
        lc_id = normalize_handle(student.get("leetcode_id", ""))
        cf_id = normalize_handle(student.get("codeforces_id", ""))

        print(f"[{i}/{len(students)}] Processing {name} ({enr_no}) | Track: {track or 'Unspecified'}")
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        is_beginner = "beginner" in track.lower() if track else False

        if is_beginner:
            stats = get_beginner_stats(lc_id) if lc_id else {
                "streak": 0, "current_streak": 0, "total_active_days": 0, "ac_count": 0,
                "easy_ac": 0, "medium_ac": 0, "hard_ac": 0
            }
            time.sleep(0.5)

            table.update_item(
                Key={"PK": student["PK"], "SK": student["SK"]},
                UpdateExpression=(
                    "SET streak = :strk, current_streak = :cstrk, total_active_days = :ad, "
                    "ac_count = :ac, easy_ac = :eac, medium_ac = :mac, "
                    "hard_ac = :hac, updated_at = :now"
                ),
                ExpressionAttributeValues={
                    ":strk": stats["streak"],
                    ":cstrk": stats.get("current_streak", 0),
                    ":ad": stats["total_active_days"],
                    ":ac": stats["ac_count"],
                    ":eac": stats["easy_ac"],
                    ":mac": stats["medium_ac"],
                    ":hac": stats["hard_ac"],
                    ":now": now,
                },
            )
            print(f"  -> Beginner: Streak={stats['streak']} (Current={stats.get('current_streak', 0)}, Active={stats['total_active_days']}), AC={stats['ac_count']}")

        else:
            lc_count, lc_diff = get_leetcode_stats(lc_id) if lc_id else (0, 0.0)
            time.sleep(0.5)

            cf_count, cf_diff = 0, 0.0
            if cf_id:
                cf_count, cf_diff = get_codeforces_stats(cf_id)
                time.sleep(2)  
            total_contests = lc_count + cf_count
            rating_increment = round(lc_diff + cf_diff, 2)

            table.update_item(
                Key={"PK": student["PK"], "SK": student["SK"]},
                UpdateExpression=(
                    "SET leetcode_contests = :lc, codeforces_contests = :cf, "
                    "total_contests = :tot, leetcode_rating_diff = :lcd, "
                    "codeforces_rating_diff = :cfd, rating_increment = :ri, "
                    "updated_at = :now"
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
            print(f"  -> Competitive: Contests={total_contests} (LC:{lc_count} CF:{cf_count}) | Net Rating={rating_increment:+} (LC:{lc_diff:+} CF:{cf_diff:+})")

    print("Worker finished successfully.")
    return {
        "statusCode": 200,
        "body": json.dumps({"message": f"Successfully processed {len(students)} students"}),
    }


if __name__ == "__main__":
    handler()

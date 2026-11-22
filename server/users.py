import os
import json
import boto3
import datetime
from decimal import Decimal
from boto3.dynamodb.conditions import Attr

REGION_NAME = os.environ.get("REGION_NAME")
TABLE_NAME = os.environ.get("TABLE_NAME")
CLIENT_URL = os.environ.get("CLIENT_URL")
if CLIENT_URL and CLIENT_URL != "*":
    CLIENT_URL = CLIENT_URL.rstrip("/")

dynamodb = boto3.resource("dynamodb", region_name=REGION_NAME)
table = dynamodb.Table(TABLE_NAME)

HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": CLIENT_URL,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}


def merge_tracks(e_str, n_str):
    e = (e_str or "").strip().lower()
    n = (n_str or "").strip().lower()

    if not e:
        return n_str or "Competitive Track"
    if not n:
        return e_str or "Competitive Track"

    has_bg = ("beginner" in e or "both" in e) or ("beginner" in n or "both" in n)
    has_cp = ("competitive" in e or "both" in e) or ("competitive" in n or "both" in n)

    if has_bg and has_cp:
        return "Both Tracks"
    elif has_bg:
        return "Beginner's Track"
    else:
        return "Competitive Track"


def add_user(**user):
    try:
        raw_enr = str(user.get("enr_no") or user.get("enrollment_number") or "").strip()
        enr_no = raw_enr.replace("\\", "/").upper()
        if not enr_no:
            raise ValueError("Enrollment number is required")

        pk = f"STUDENT#{enr_no}"
        sk = "PROFILE"

        # Lookup existing item by normalized PK
        existing = table.get_item(Key={"PK": pk, "SK": sk}).get("Item")
        old_pk_to_delete = None

        # If not found by PK, check if an existing student has the exact same email
        user_email = (user.get("email") or "").strip().lower()
        if not existing and user_email:
            scan_resp = table.scan(
                FilterExpression=Attr("SK").eq("PROFILE") & Attr("email").eq(user.get("email").strip())
            )
            items = scan_resp.get("Items", [])
            if items:
                existing = items[0]
                if existing.get("PK") != pk:
                    old_pk_to_delete = existing.get("PK")

        if not existing:
            existing = {}

        created_at = existing.get("created_at") or datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Merge tracks: if student submitted one track earlier and another track now, merge into 'Both Tracks'
        existing_track = existing.get("track")
        new_track = user.get("track")
        final_track = merge_tracks(existing_track, new_track)

        # Do not overwrite existing non-empty handles with empty or None values
        clean_user = {
            k: v for k, v in user.items()
            if v is not None and (not isinstance(v, str) or v.strip() != "")
        }

        # Only clean out track-specific fields if the student is strictly in a single track
        if final_track == "Beginner's Track":
            for cf_key in (
                "codeforces_id", "codeforces_contests", "codeforces_rating_diff",
                "total_contests", "rating_increment", "leetcode_contests", "leetcode_rating_diff"
            ):
                existing.pop(cf_key, None)
                clean_user.pop(cf_key, None)
        elif final_track == "Competitive Track":
            for bg_key in (
                "streak", "current_streak", "total_active_days", "ac_count",
                "easy_ac", "medium_ac", "hard_ac"
            ):
                existing.pop(bg_key, None)
                clean_user.pop(bg_key, None)

        item = {
            **existing,
            **clean_user,
            "PK": pk,
            "SK": sk,
            "enr_no": enr_no,
            "track": final_track,
            "created_at": created_at,
        }

        table.put_item(Item=item)

        if old_pk_to_delete and old_pk_to_delete != pk:
            try:
                table.delete_item(Key={"PK": old_pk_to_delete, "SK": sk})
            except Exception as del_err:
                print("Failed to delete old duplicate PK:", del_err)

        return {
            "statusCode": 200,
            "headers": HEADERS,
            "body": json.dumps(
                {
                    "message": "User saved successfully",
                    "enr_no": enr_no,
                    "track": final_track,
                }
            ),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": HEADERS,
            "body": json.dumps({"message": "Failed to save user", "error": str(e)}),
        }


def get_users():
    try:
        students = []

        response = table.scan(FilterExpression=Attr("SK").eq("PROFILE"))

        students.extend(response.get("Items", []))

        while "LastEvaluatedKey" in response:
            response = table.scan(
                FilterExpression=Attr("SK").eq("PROFILE"),
                ExclusiveStartKey=response["LastEvaluatedKey"],
            )
            students.extend(response.get("Items", []))

        return {
            "statusCode": 200,
            "headers": HEADERS,
            "body": json.dumps(
                {
                    "message": "Students fetched successfully",
                    "count": len(students),
                    "students": students,
                },
                default=lambda o: int(o) if isinstance(o, Decimal) and o % 1 == 0 else float(o) if isinstance(o, Decimal) else str(o),
            ),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": HEADERS,
            "body": json.dumps(
                {"message": "Failed to fetch students", "error": str(e)}
            ),
        }

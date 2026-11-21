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


def add_user(**user):
    try:
        enr_no = user.get("enr_no") or user.get("enrollment_number")
        pk = f"STUDENT#{enr_no}"
        sk = "PROFILE"

        # Preserve created_at and existing calculated stats if updating
        existing = table.get_item(Key={"PK": pk, "SK": sk}).get("Item") or {}
        created_at = existing.get("created_at") or datetime.datetime.now(datetime.timezone.utc).isoformat()

        # If switching to Beginner's Track, clean out any leftover CP fields
        if "beginner" in (user.get("track") or "").lower():
            for cf_key in ("codeforces_id", "codeforces_contests", "codeforces_rating_diff", "total_contests", "rating_increment", "leetcode_contests", "leetcode_rating_diff"):
                existing.pop(cf_key, None)
                user.pop(cf_key, None)

        item = {
            **existing,
            **user,
            "PK": pk,
            "SK": sk,
            "enr_no": enr_no,
            "created_at": created_at,
        }

        table.put_item(Item=item)

        return {
            "statusCode": 200,
            "headers": HEADERS,
            "body": json.dumps(
                {
                    "message": "User saved successfully",
                    "enr_no": enr_no,
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

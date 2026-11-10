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

        item = {
            "PK": f"STUDENT#{enr_no}",
            "SK": "PROFILE",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            **user,
            "enr_no": enr_no,
        }

        table.put_item(
            Item=item,
            ConditionExpression='attribute_not_exists(PK)'
        )

        return {
            "statusCode": 201,
            "headers": HEADERS,
            "body": json.dumps(
                {
                    "message": "User created successfully",
                    "enr_no": enr_no,
                }
            ),
        }

    except Exception as e:
        status_code = 409 if "ConditionalCheckFailedException" in str(e) else 500
        return {
            "statusCode": status_code,
            "headers": HEADERS,
            "body": json.dumps({"message": "Failed to create user", "error": str(e)}),
        }


def get_users():
    try:
        students = []

        response = table.scan(FilterExpression=Attr("SK").eq("PROFILE"))

        students.extend(response.get("Items", []))

        # Handle pagination
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

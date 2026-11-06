import os
import json
import boto3
import datetime
from boto3.dynamodb.conditions import Attr

REGION_NAME = os.environ.get("REGION_NAME")
TABLE_NAME = os.environ.get("TABLE_NAME")

dynamodb = boto3.resource("dynamodb", region_name=REGION_NAME)
table = dynamodb.Table(TABLE_NAME)

HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}


def add_user(**user):
    try:
        name = user["name"]
        enrollment_number = user["enrollment_number"]

        table.put_item(
            Item={
                "PK": f"STUDENT#{enrollment_number}",
                "SK": "PROFILE",
                "name": name,
                "enrollment_number": enrollment_number,
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            },
            ConditionExpression='attribute_not_exists(PK)'
        )

        return {
            "statusCode": 201,
            "headers": HEADERS,
            "body": json.dumps(
                {
                    "message": "User created successfully",
                    "enrollment_number": enrollment_number,
                }
            ),
        }

    except Exception as e:
        return {
            "statusCode": 500,
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
                }
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

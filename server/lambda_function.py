import json
from users import get_users,add_user
def lambda_handler(event, context):

    http_method = event.get('requestContext', {}).get('http', {}).get('method', 'POST')

    print("HTTP Method:", http_method)

    if http_method == 'GET':

        response = get_users()

        if response['statusCode'] != 200:
            return response

        students = json.loads(response['body']).get('students', [])

        users = [
            {
                'name': student.get('name'),
                'enrollment_number': student.get('enrollment_number')
            }
            for student in students
        ]

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'message': 'Students fetched successfully',
                'count': len(users),
                'users': users
            })
        }

    elif http_method == 'POST':

        data_str = event.get('body') or '{}'

        try:
            data = json.loads(data_str)

            if not isinstance(data, dict):
                raise ValueError("Expected a JSON object")

        except Exception:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': 'Malformed JSON payload'
                })
            }

        if not data.get('name') or not data.get('enrollment_number'):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': 'Name and enrollment number are required'
                })
            }

        response = add_user(**data)
        response.setdefault('headers', {})
        response['headers']['Content-Type'] = 'application/json'

        return response

    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'error': 'Method not allowed'
        })
    }
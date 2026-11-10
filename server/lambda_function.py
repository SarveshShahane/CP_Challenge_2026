import json
from users import get_users, add_user, HEADERS


def lambda_handler(event, context):

    http_method = (
        event.get('requestContext', {}).get('http', {}).get('method')
        or event.get('httpMethod', 'POST')
    ).upper()

    print("HTTP Method:", http_method)

    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({'message': 'Preflight check successful'})
        }

    if http_method == 'GET':

        response = get_users()

        if response['statusCode'] != 200:
            return response

        students = json.loads(response['body']).get('students', [])
        query_params = event.get('queryStringParameters') or {}
        requested_track = (query_params.get('track') or '').strip().lower()

        all_users = [
            {k: v for k, v in student.items() if k not in ('PK', 'SK')}
            for student in students
        ]

        # Beginner's Track: streak desc, tie-break: ac_count desc, active_days desc
        beginner_users = [
            u for u in all_users if 'beginner' in (u.get('track') or '').lower()
        ]
        beginner_users.sort(
            key=lambda u: (
                int(u.get('streak') or 0),
                int(u.get('ac_count') or 0),
                int(u.get('total_active_days') or 0),
            ),
            reverse=True,
        )

        # Competitive Track: total_contests desc, tie-break: rating_increment desc
        cp_users = [
            u for u in all_users if 'beginner' not in (u.get('track') or '').lower()
        ]
        cp_users.sort(
            key=lambda u: (
                int(u.get('total_contests') or 0),
                float(u.get('rating_increment') or 0),
            ),
            reverse=True,
        )

        if requested_track in ('beginner', 'beginner track', 'beginners'):
            return {
                'statusCode': 200,
                'headers': HEADERS,
                'body': json.dumps({
                    'message': "Beginner's Track leaderboard fetched successfully",
                    'track': 'beginner',
                    'count': len(beginner_users),
                    'users': beginner_users,
                }),
            }

        if requested_track in ('cp', 'competitive', 'competitive track'):
            return {
                'statusCode': 200,
                'headers': HEADERS,
                'body': json.dumps({
                    'message': 'Competitive Track leaderboard fetched successfully',
                    'track': 'competitive',
                    'count': len(cp_users),
                    'users': cp_users,
                }),
            }

        # Default (no track specified): return both tracks separately and combined
        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({
                'message': 'Leaderboards fetched successfully',
                'count': len(all_users),
                'beginner': beginner_users,
                'competitive': cp_users,
                'users': cp_users + beginner_users,
            }),
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
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Malformed JSON payload'
                })
            }

        enr_no = data.get('enr_no') or data.get('enrollment_number')
        if not data.get('name') or not enr_no:
            return {
                'statusCode': 400,
                'headers': HEADERS,
                'body': json.dumps({
                    'error': 'Name and enr_no are required'
                })
            }

        response = add_user(**data)
        response.setdefault('headers', {})
        response['headers'].update(HEADERS)

        return response

    return {
        'statusCode': 405,
        'headers': HEADERS,
        'body': json.dumps({
            'error': 'Method not allowed'
        })
    }
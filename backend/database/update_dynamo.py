from dotenv import load_dotenv
import os
import boto3
import base64

load_dotenv()

dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_REGION"))

table = dynamodb.Table('messaging-messages')


def migrate_read_field_to_base64():
    scan_kwargs = {}
    updated_count = 0

    while True:
        response = table.scan(**scan_kwargs)
        items = response.get('Items', [])

        for item in items:
            key = {k['AttributeName']: item[k['AttributeName']] for k in table.key_schema}
            if 'read' in item and isinstance(item['read'], bool):
                original_val = item['read']
                binary_val = b'\x01' if original_val else b'\x00'

                try:
                    # Then update
                    table.update_item(
                        Key=key,
                        UpdateExpression="SET #r = :val",
                        ExpressionAttributeNames={'#r': 'read'},
                        ExpressionAttributeValues={':val': binary_val}
                    )

                    updated_count += 1
                    print(f"✅ Updated item {key} → read: {binary_val} (was {original_val})")
                except Exception as e:
                    print(f"❌ Error updating {key}: {e}")

        if 'LastEvaluatedKey' in response:
            scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
        else:
            break

    print(f"\n🏁 Migration complete. Total items updated: {updated_count}")

# Run it
migrate_read_field_to_base64()

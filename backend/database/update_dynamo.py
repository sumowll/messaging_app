from dotenv import load_dotenv
import os
import boto3
import base64
from boto3.dynamodb.types import Binary
load_dotenv()

dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_REGION"))
table = dynamodb.Table('messaging-messages')


def migrate_read_field_binary_to_number():
    scan_kwargs = {}
    updated_count = 0
    print("🔄 Starting migration of 'read' field from binary to number...")

    while True:
        response = table.scan(**scan_kwargs)
        items = response.get('Items', [])
        print(f"🔍 Scanned {len(items)} items...")

        for item in items:
            read_val = item['read']
            print(f"🔍 Processing item {item['message_id']} with read value: {read_val}")

            # Handle Boto3's Binary type
            if isinstance(read_val, Binary):
                raw = read_val.value
                print(f"🔍 Found Binary type in item {item['id']}: {raw}")
            elif isinstance(read_val, (bytes, bytearray)):
                raw = read_val
                print(f"🔍 Found bytes in item {item['id']}: {raw}")
            elif isinstance(read_val, str):
                try:
                    raw = base64.b64decode(read_val)
                    print(f"🔍 Found base64 string in item {item['id']}: {raw}")
                except Exception:
                    print(f"❌ Skipping malformed base64 in item {item}")
                    continue
            else:
                print(f"🔍 Raw value for item {item['message_id']}: {item}")
                continue
                

            if raw == b'\x00':
                numeric = 0
            elif raw == b'\x01':
                numeric = 1
            else:
                print(f"❌ Skipping item with unknown binary: {raw}")
                continue  # ✅ prevents crash


            # Prepare the key
            key = {k['AttributeName']: item[k['AttributeName']] for k in table.key_schema}

            try:
                table.update_item(
                    Key=key,
                    UpdateExpression="SET #r = :val",
                    ExpressionAttributeNames={'#r': 'read'},
                    ExpressionAttributeValues={':val': numeric}
                )
                updated_count += 1
                print(f"✅ Updated item {key} → read: {numeric}")
            except Exception as e:
                print(f"❌ Error updating {key}: {e}")

        if 'LastEvaluatedKey' in response:
            scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
        else:
            break

    print(f"\n🏁 Migration complete. Total items updated: {updated_count}")


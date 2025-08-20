# tools/get_chat_with_profiles.py
from helpers.db import Database

db = Database()

def get_chat_with_profiles_tool(sender_phone, receiver_phone, limit=10):
    """
    Retrieves recent messages between two users along with their profile info.
    Expected args: {
        "sender_phone": "string",
        "receiver_phone": "string",
        "limit": 10
    }
    """
    if not sender_phone or not receiver_phone:
        return {"error": "Missing sender_phone or receiver_phone"}

    # Fetch latest messages
    messages_result = db.get_latest_messages(sender_phone, receiver_phone, limit)
    messages = messages_result.data if messages_result.data else []

    # Fetch profile info
    sender_profile = db.get_profile(sender_phone)
    receiver_profile = db.get_profile(receiver_phone)

    return {
        "messages": messages,
        "sender_profile": sender_profile,
        "receiver_profile": receiver_profile
    }


def send_message_to_user(sender_phone, receiver_phone, message, is_ai=False, reply_to_message=None):
    """
    Sends a message from sender to receiver.
    Expected args: {
        "sender_phone": "string",
        "receiver_phone": "string",
        "message": "string",
        "is_ai": True,
        "reply_to_message": "optional string"
    }
    """
    if not sender_phone or not receiver_phone or not message:
        return {"error": "Missing sender_phone, receiver_phone, or message"}

    result = db.send_message(
        sender_phone=sender_phone,
        receiver_phone=receiver_phone,
        message=message,
        is_ai=is_ai,
        reply_to_message=reply_to_message,
    )

    return {"success": True, "message": result}

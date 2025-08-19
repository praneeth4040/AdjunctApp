# tools/get_chat_with_profiles.py
from helpers.db import Database

db = Database()

def get_chat_with_profiles_tool(sender_phone,receiver_phone,limit=10):
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

# tools/dispatcher.py
from tools.emails import send_email_with_attachments
from tools.get_chat_with_profiles import get_chat_with_profiles_tool
# import other tools here as you create them

def dispatch_tool_call(tool_name: str, args: dict, sender_phone: str = None, receiver_phone: str = None):
    """
    Routes tool calls to the correct function, adapting arguments if needed.
    """
    try:
        if tool_name == "get_chat_with_profiles":
            return get_chat_with_profiles_tool(sender_phone,receiver_phone,args.get("limit",10))

        elif tool_name == "send_email_with_attachments":
            return send_email_with_attachments(
                to=args.get("to"),
                cc=args.get("cc"),
                bcc=args.get("bcc"),
                subject=args.get("subject", ""),
                body=args.get("body", ""),
                attachments=args.get("attachments")
            )

        # Add more tool mappings here
        else:
            return {"error": f"Tool '{tool_name}' not found"}

    except Exception as e:
        return {"error": str(e)}

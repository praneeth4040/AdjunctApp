from tools.emails import send_email_with_attachments
from tools.get_chat_with_profiles import get_chat_with_profiles_tool
from tools.ai_auto_responer import set_or_update_user_mode  # correct import


def dispatch_tool_call(tool_name: str, args: dict, sender_phone: str = None, receiver_phone: str = None):
    """
    Routes tool calls to the correct function, adapting arguments if needed.
    """
    try:
        if tool_name == "get_chat_with_profiles":
            return get_chat_with_profiles_tool({
                **args,
                "sender_phone": sender_phone,
                "receiver_phone": receiver_phone
            })

        elif tool_name == "send_email_with_attachments":
            return send_email_with_attachments(
                to=args.get("to"),
                cc=args.get("cc"),
                bcc=args.get("bcc"),
                subject=args.get("subject", ""),
                body=args.get("body", ""),
                attachments=args.get("attachments")
            )

            # desired_mode should be provided in args as True/False
            # desired_mode should be provided in args as True/False

        elif tool_name == "set_or_update_user_mode":
            # desired_mode should be provided in args as True/False
            return set_or_update_user_mode(
                user_phone=sender_phone,   # controlling own mode
                desired_mode=args.get("desired_mode")
            )

        else:
            return {"error": f"Tool '{tool_name}' not found"}

    except Exception as e:
        return {"error": str(e)}

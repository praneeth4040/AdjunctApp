from google.genai import types

# --- Tool: Get Chat with Profiles ---
get_chat_with_profiles_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="get_chat_with_profiles",
            description="Retrieve recent messages between two users along with their profile info.",
            parameters={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of recent messages to retrieve."
                    }
                },
                "required": []
            }
        )
    ]
)
# --- Tool: Send Message to User ---
send_message_to_user_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="send_message_to_user",
            description="Send a message from the AI to a particular user identified by their phone number.",
            parameters={
                "type": "object",
                "properties": {
                    "receiver_phone": {
                        "type": "string",
                        "description": "The phone number of the recipient."
                    },
                    "message": {
                        "type": "string",
                        "description": "The message text to send to the recipient."
                    }
                },
                "required": ["receiver_phone", "message"]
            }
        )
    ]
)
# --- Tool: Send Email ---
send_email_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="send_email_with_attachments",
            description="Send an email immediately to one or more recipients, with optional CC, BCC, and attachments.",
            parameters={
                "type": "object",
                "properties": {
                    "to": {
                        "type": "array",
                        "items": {"type": "string", "format": "email"},
                        "description": "List of primary recipient email addresses."
                    },
                    "cc": {
                        "type": "array",
                        "items": {"type": "string", "format": "email"},
                        "description": "Optional list of CC recipients."
                    },
                    "bcc": {
                        "type": "array",
                        "items": {"type": "string", "format": "email"},
                        "description": "Optional list of BCC recipients."
                    },
                    "subject": {
                        "type": "string",
                        "description": "Subject line of the email."
                    },
                    "body": {
                        "type": "string",
                        "description": "Email body content in plain text or HTML format."
                    },
                    "attachments": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "filename": {
                                    "type": "string",
                                    "description": "Name of the file as it should appear to the recipient."
                                },
                                "content": {
                                    "type": "string",
                                    "description": "Base64-encoded file content."
                                },
                                "mime_type": {
                                    "type": "string",
                                    "description": "MIME type of the file (e.g., application/pdf, image/png)."
                                }
                            },
                            "required": ["filename", "content", "mime_type"]
                        },
                        "description": "Optional list of files to attach."
                    }
                },
                "required": ["to", "subject", "body"]
            }
        )

    ]
)


# --- Tool: Set or Update User Mode ---
set_or_update_user_mode_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="set_or_update_user_mode",
            description="Set or update a user's activity mode (offline, semiactive, active). Creates user if not exists.",
            parameters={
                "type": "object",
                "properties": {
                    "user_phone": {
                        "type": "string",
                        "description": "Phone number of the user."
                    },
                    "desired_mode": {
                        "type": "string",
                        "enum": ["offline", "semiactive", "active"],
                        "description": "Desired mode to set for the user."
                    }
                },
                "required": ["user_phone", "desired_mode"]
            }
        )
    ]
)

# --- Export list for easy import ---
all_tools = [get_chat_with_profiles_tool, send_email_tool]

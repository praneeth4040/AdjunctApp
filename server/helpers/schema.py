# tools/schema.py

get_chat_with_profiles_schema = {
    "name": "get_chat_with_profiles",
    "description": "Retrieve recent messages between two users along with their profile info.",
    "parameters": {
        "type": "object",
        "properties": {
            "limit": {
                "type": "integer",
                "description": "Maximum number of recent messages to retrieve."
            }
        },
        "required": []
    }
}


send_email_schema = {
    "name": "send_email",
    "description": "Send an email immediately to one or more recipients, with optional CC, BCC, and attachments.",
    "parameters": {
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
}

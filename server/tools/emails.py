import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import os

def send_email_with_attachments(to, cc=None, bcc=None, subject="", body="", attachments=None):
    """
    Sends an email with optional attachments via Gmail API.
    
    Args:
        to (list[str]): List of recipient emails.
        cc (list[str]): List of CC emails.
        bcc (list[str]): List of BCC emails.
        subject (str): Email subject.
        body (str): Email body (HTML supported).
        attachments (list[dict]): Each dict: { "filename": "file.txt", "content": base64_string }
    Returns:
        str: Gmail message ID of the sent email.
    """

    if cc is None:
        cc = []
    if bcc is None:
        bcc = []
    if attachments is None:
        attachments = []

    # Load OAuth credentials
    creds_path = os.getenv("GMAIL_TOKEN_PATH", "token.json")
    creds = Credentials.from_authorized_user_file(creds_path, ["https://www.googleapis.com/auth/gmail.send"])
    service = build("gmail", "v1", credentials=creds)

    # Create base MIME message
    msg = MIMEMultipart()
    msg["To"] = ", ".join(to)
    if cc:
        msg["Cc"] = ", ".join(cc)
    if bcc:
        msg["Bcc"] = ", ".join(bcc)
    msg["Subject"] = subject

    # Email body
    msg.attach(MIMEText(body, "html"))

    # Add attachments
    for file in attachments:
        part = MIMEBase("application", "octet-stream")
        file_data = base64.b64decode(file["content"])
        part.set_payload(file_data)
        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f'attachment; filename="{file["filename"]}"',
        )
        msg.attach(part)

    # Encode & send
    raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    sent_message = service.users().messages().send(
        userId="me",
        body={"raw": raw_message}
    ).execute()

    return sent_message["id"]

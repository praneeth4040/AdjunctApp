import google.generativeai as genai
from supabase import create_client, Client

# --- CONFIG ---
GOOGLE_API_KEY = "AIzaSyDsDyoBB6x7Qni3_JoCKB40DEUk20wkj00"
SUPABASE_URL = "https://dkwafhgmhijsbdqpazzs.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd2FmaGdtaGlqc2JkcXBhenpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTM2OTksImV4cCI6MjA2OTQ2OTY5OX0.Pk0HgZhTgg2V_OsDyTxw9grdPqP7PAEA2uUdsyQ0ag0"

# --- INIT ---
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def ai_response(query, sender_phone, receiver_phone):
    try:
        # 1️⃣ Get last 10 messages between these two numbers
        messages_data = (
        supabase.table("messages")
        .select("*")
        .or_(
            f"and(sender_phone.eq.{sender_phone},receiver_phone.eq.{receiver_phone}),"
            f"and(sender_phone.eq.{receiver_phone},receiver_phone.eq.{sender_phone})"
        )
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

        messages = messages_data.data[::-1]  # Reverse to chronological order

        # 2️⃣ Build conversation log
        conversation_log = "\n".join([
            f"{'You' if msg['sender_phone'] == sender_phone else 'Them'}: {msg['message']}"
            for msg in messages
        ])

        # 3️⃣ Prepare AI prompt
        prompt = f"""
You are an AI assistant in a chat app.

Recent conversation:
{conversation_log}

The user command is: "{query}".

Rules:
- If the request is asking to summarize, recap, or say "what did we talk about", give ONLY the summary.
- Otherwise, respond normally using the conversation as context.
- Do not explain your choice to summarize or not.
"""

        # 4️⃣ Generate AI reply
        response = model.generate_content(prompt)
        return response.text.strip()

    except Exception as e:
        return f"AI Error: {str(e)}"

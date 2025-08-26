from supabase import create_client, Client
from datetime import datetime, timedelta, timezone

# 🔑 Supabase credentials
SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
SUPABASE_KEY = "YOUR_SERVICE_ROLE_KEY"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_and_update_todos(sender_phone: str):
    """
    Fetch tasks for a user and update:
      - One-time tasks -> mark as completed if expired
      - Repeating tasks -> shift reminder_time to next occurrence
    """

    # 1. Fetch tasks
    response = supabase.table("todos").select("*").eq("sender_phone", sender_phone).execute()

    if not response.data:
        print(f"No tasks found for {sender_phone}")
        return []

    tasks = response.data
    now = datetime.now(timezone.utc)

    updated_tasks = []

    for task in tasks:
        task_id = task.get("id")
        title = task.get("title")
        repeat = task.get("repeat")   # e.g. "daily", "weekly", "monthly", or None
        reminder_time = task.get("reminder_time")

        if reminder_time:
            reminder_time = datetime.fromisoformat(reminder_time.replace("Z", "+00:00"))

        if reminder_time and reminder_time < now:
            if not repeat:
                # One-time task → mark as completed
                supabase.table("todos").update({"status": "completed"}).eq("id", task_id).execute()
                print(f"✅ Task '{title}' marked as completed.")
                updated_tasks.append({**task, "status": "completed"})

            else:
                # Repeating task → shift time forward
                if repeat == "daily":
                    new_time = reminder_time + timedelta(days=1)
                elif repeat == "weekly":
                    new_time = reminder_time + timedelta(weeks=1)
                elif repeat == "monthly":
                    # Roughly 30 days shift
                    new_time = reminder_time + timedelta(days=30)
                else:
                    new_time = reminder_time  # fallback

                supabase.table("todos").update({"reminder_time": new_time.isoformat()}).eq("id", task_id).execute()
                print(f"🔄 Task '{title}' updated to next {repeat} reminder at {new_time}.")
                updated_tasks.append({**task, "reminder_time": new_time.isoformat()})
        else:
            updated_tasks.append(task)

    return updated_tasks
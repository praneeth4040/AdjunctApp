from supabase import create_client, Client


url = "https://dkwafhgmhijsbdqpazzs.supabase.co"
key= "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd2FmaGdtaGlqc2JkcXBhenpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTM2OTksImV4cCI6MjA2OTQ2OTY5OX0.Pk0HgZhTgg2V_OsDyTxw9grdPqP7PAEA2uUdsyQ0ag0"

supabase: Client = create_client(url, key)

def set_or_update_user_mode(user_phone: str, desired_mode: str):
    """
    Insert user if not exists, fetch current mode, and update if needed.
    Modes = ["offline", "semi_active", "active"]
    """
    if desired_mode not in ["offline", "semiactive", "active"]:
        return {"error": f"Invalid mode: {desired_mode}"}

    try:
        # 1️⃣ Fetch existing user
        response = supabase.table("usersmodes").select("mode").eq("phone", user_phone).execute()
        user_data = response.data

        if not user_data:  
            # 2️⃣ If no user, insert new
            supabase.table("usersmodes").insert({
                "phone": user_phone,
                "mode": desired_mode
            }).execute()
            return {
                "success": True,
                "message": f"New user created with mode '{desired_mode}'",
                "new_mode": desired_mode
            }

        # 3️⃣ User exists → check mode
        current_mode = user_data[0]["mode"]

        if current_mode == desired_mode:
            return {
                "success": True,
                "message": f"User is already in '{desired_mode}' mode (no change).",
                "new_mode": current_mode
            }

        # 4️⃣ Update mode
        supabase.table("usersmodes").update({
            "mode": desired_mode
        }).eq("phone", user_phone).execute()

        return {
            "success": True,
            "message": f"Mode changed from '{current_mode}' to '{desired_mode}'",
            "new_mode": desired_mode
        }

    except Exception as e:
        return {"error": str(e)}
        print("hi")


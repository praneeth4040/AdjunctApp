from supabase import create_client

SUPABASE_URL = "https://dkwafhgmhijsbdqpazzs.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrd2FmaGdtaGlqc2JkcXBhenpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTM2OTksImV4cCI6MjA2OTQ2OTY5OX0.Pk0HgZhTgg2V_OsDyTxw9grdPqP7PAEA2uUdsyQ0ag0"

class Database:
    def __init__(self) -> None:
        self.client = create_client(SUPABASE_URL, SUPABASE_KEY)

    def get_latest_messages(self, sender_phone: str, receiver_phone: str, limit: int = 10):
        """
        Retrieve the latest messages exchanged between two phone numbers,
        but return them in chronological order.
        """
        result = self.client.table("messages") \
            .select("*") \
            .or_(
                f"and(sender_phone.eq.{sender_phone},receiver_phone.eq.{receiver_phone})"
                f",and(sender_phone.eq.{receiver_phone},receiver_phone.eq.{sender_phone})"
            ) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()

        if result.data:
            result.data.reverse()

        return result
    
    def get_profile(self, phone_number: str):
        """
        Retrieve a single profile by phone number.
        """
        result = (
            self.client.table("profiles")
            .select("*")
            .eq("phone_number", phone_number)
            .single()
            .execute()
        )
        return result.data if result.data else None
    


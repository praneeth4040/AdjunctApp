# agent_server.py
import os
import json
import logging
from datetime import datetime
from supabase import create_client, Client
from userAgent import UserAgent
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

# Initialize Supabase client
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


class AgentServer:
    def __init__(self):
        """Initialize in-memory cache for user agents."""
        self.user_agents = {}

    def get_or_create_user_agent(self, user_id, agent_name=None, can_send=True, can_receive=True):
        """
        Fetch an agent from cache or DB, or create a new one.
        agent_name: Optional user-defined agent name
        can_send/can_receive: toggle flags for messaging
        """
        if user_id in self.user_agents:
            return self.user_agents[user_id]

        try:
            # Fetch agent from DB
            response = supabase.table("agents").select("*").eq("user_id", user_id).execute()
            agents = response.data

            if agents:
                agent_data = agents[0]
            else:
                # Create a new agent in DB
                agent_name = agent_name or f"Agent_{user_id[:8]}"
                new_agent = {
                    "user_id": user_id,
                    "agent_name": agent_name,
                    "metadata": {},
                    "can_send": can_send,
                    "can_receive": can_receive,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }
                response = supabase.table("agents").insert(new_agent).execute()
                agent_data = response.data[0]

            # Create UserAgent instance
            user_agent = UserAgent(
                user_id,
                server=self,
                metadata=agent_data.get("metadata", {})
            )
            self.user_agents[user_id] = user_agent
            return user_agent

        except Exception as e:
            logging.error(f"Error in get_or_create_user_agent: {e}")
            return None

    def save_agent_state(self, user_id):
        """Persist the agent's metadata/state back to the DB."""
        agent = self.user_agents.get(user_id)
        if not agent:
            logging.warning(f"Attempted to save state for unknown agent: {user_id}")
            return False

        try:
            metadata_json = json.dumps(agent.metadata or {})
            supabase.table("agents").update({
                "metadata": metadata_json,
                "updated_at": datetime.utcnow()
            }).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logging.error(f"Error saving agent state for {user_id}: {e}")
            return False

    def send_message(self, from_user, to_user, message):
        """
        Send a message from one user to another and log it in Supabase.
        Respects can_send and can_receive toggles.
        """
        try:
            # Fetch sender and receiver agent records
            sender = supabase.table("agents").select("*").eq("user_id", from_user).single().execute()
            receiver = supabase.table("agents").select("*").eq("user_id", to_user).single().execute()

            if not sender.data or not receiver.data:
                return "Error: Sender or receiver agent not found."

            sender_agent = sender.data
            receiver_agent = receiver.data

            if not sender_agent.get("can_send", True):
                return f"Agent '{sender_agent['agent_name']}' is not allowed to send messages."

            if not receiver_agent.get("can_receive", True):
                return f"Agent '{receiver_agent['agent_name']}' cannot receive messages."

            sender_agent_id = sender_agent["id"]
            receiver_agent_id = receiver_agent["id"]

            # Insert message into agent_messages table
            supabase.table("agent_messages").insert({
                "sender_agent_id": sender_agent_id,
                "receiver_agent_id": receiver_agent_id,
                "content": message,
                "status": "sent",
                "created_at": datetime.utcnow()
            }).execute()

            # Process the message in the receiver agent
            target_agent = self.get_or_create_user_agent(to_user)
            if not target_agent:
                return "Error: Receiver agent could not be initialized."

            response = target_agent.process_task(f"Message from {from_user}: {message}")
            return response

        except Exception as e:
            logging.error(f"Error in send_message from {from_user} to {to_user}: {e}")
            return f"Error sending message: {e}"


if __name__ == "__main__":
    server = AgentServer()
    print("🚀 Intra-Agent Chat Server Started")
    print("Type 'exit' anytime to quit.\n")

    while True:
        user_id = input("Enter your userId (or 'exit'): ").strip()
        if user_id.lower() == "exit":
            break

        # Optionally, ask for agent name and toggles here
        agent_name = input("Enter agent name (or leave blank for default): ").strip() or None
        can_send = input("Allow sending messages? (yes/no, default yes): ").strip().lower() != "no"
        can_receive = input("Allow receiving messages? (yes/no, default yes): ").strip().lower() != "no"

        user_agent = server.get_or_create_user_agent(user_id, agent_name, can_send, can_receive)
        if not user_agent:
            print(f"Error: Could not initialize agent for {user_id}")
            continue

        print(f"\n🟢 You are now chatting as {agent_name or f'Agent_{user_id[:8]}'}")
        print("Type your queries. Example:")
        print("- 'Send a message to user2: Hello'")
        print("- 'Call weather agent for Delhi'")
        print("- 'exit' to choose another user\n")

        while True:
            query = input(f"{user_id}> ").strip()
            if query.lower() == "exit":
                print("🔄 Switching user...\n")
                break

            response = user_agent.process_task(query)
            print(f"🤖 Agent Response: {response}\n")
            # Save agent state after each task
            server.save_agent_state(user_id)
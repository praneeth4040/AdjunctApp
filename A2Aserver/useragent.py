# user_agent.py
import os
import json
import logging
from dotenv import load_dotenv
from langchain.agents import AgentType, initialize_agent
from langchain.memory import ConversationBufferMemory
from langchain.tools import Tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import SystemMessage
from tools import get_available_agents, call_agent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

class UserAgent:
    def __init__(self, user_id: str, server, metadata: dict = None):
        """
        metadata: dictionary from DB (agents.metadata) containing chat history, etc.
        """
        load_dotenv()
        self.user_id = user_id
        self.server = server
        self.metadata = metadata or {}
        self.memory = ConversationBufferMemory(memory_key="chat_history")
        self._llm = None  # Lazy-loaded LLM
        self.agent_executor = None  # Lazy-loaded executor

        # Load memory if available
        chat_history = self.metadata.get("chat_history")
        if chat_history:
            self.memory.chat_memory.messages = chat_history

    @property
    def llm(self):
        if not self._llm:
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError("Google API key not found. Set it in environment variables.")
            self._llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=api_key
            )
        return self._llm

    def init_agent_executor(self):
        """Lazy initialize the LangChain agent executor."""
        if self.agent_executor:
            return

        system_message = SystemMessage(
            content=(
                "You are Adjunct, a helpful email assistant. "
                "Always use tools when appropriate and explain clearly what you are doing. "
                "If a request involves contacting another agent, always use the 'call_agent' tool. "
                "Always use the get_available_agents tool to know which agents are available for calling."
            )
        )

        tools = [
            Tool.from_function(
                func=self.send_message_to_user,
                name="send_message_to_user",
                description="Send a message to another user in the same server. Input format: 'target_user: message'"
            ),
            Tool.from_function(
                func=self.call_agent,
                name="call_agent",
                description="Call another agent by URL. Input JSON: {'url': '<url>', 'message': '<message>'}"
            ),
            Tool.from_function(
                func=self.get_available_agents,
                name="get_available_agents",
                description="Return available agents with their URL and capabilities."
            )
        ]

        self.agent_executor = initialize_agent(
            tools=tools,
            llm=self.llm,
            agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
            memory=self.memory,
            verbose=False
        )

    def send_message_to_user(self, input_str: str) -> str:
        """Send a message to another user via AgentServer."""
        try:
            target_user, msg = input_str.split(":", 1)
            response = self.server.send_message(
                from_user=self.user_id,
                to_user=target_user.strip(),
                message=msg.strip()
            )
            return response
        except Exception as e:
            logging.error(f"Error in send_message_to_user: {e}")
            return f"Error sending message: {e}"

    def process_task(self, task: str) -> str:
        """Process a task using the agent."""
        try:
            self.init_agent_executor()
            result = self.agent_executor.invoke({"input": task})
            # Save updated memory to metadata for persistence
            self.metadata["chat_history"] = self.memory.chat_memory.messages
            self.server.save_agent_state(self.user_id)
            return result.get("output", "No output from agent.")
        except Exception as e:
            logging.error(f"Error in process_task for user {self.user_id}: {e}")
            return f"Error processing task: {e}"

    def call_agent(self, input_string: str) -> str:
        """Call another agent by its URL using structured JSON input."""
        try:
            data = json.loads(input_string)
            url = data.get("url")
            message = data.get("message")
            if not url or not message:
                return "Error: JSON must contain 'url' and 'message' fields."
            payload = {"url": url, "message": message}
            return call_agent(json.dumps(payload))
        except json.JSONDecodeError:
            return "Error: Input must be valid JSON."
        except Exception as e:
            logging.error(f"Error in call_agent: {e}")
            return f"Error calling agent: {e}"

    def get_available_agents(self, input: str = None) -> str:
        """Return available agents with their URL and capabilities."""
        try:
            return str(get_available_agents())
        except Exception as e:
            logging.error(f"Error in get_available_agents: {e}")
            return f"Error fetching available agents: {e}"
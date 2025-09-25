#a2a client is defined here
from typing import Any
from a2a.client import A2ACardResolver , A2AClient
from a2a.types import MessageSendParams , Message , SendMessageRequest,MessageSendParams
import httpx, asyncio
import json

async def fetch_agent_card(url: str):
    async with httpx.AsyncClient(timeout=10) as client:
        resolver = A2ACardResolver(client, url)
        return await resolver.get_agent_card()


async def _call_agent_async(url: str, message: str) -> str:
    async with httpx.AsyncClient(timeout=100) as httpx_client:
        resolver = A2ACardResolver(httpx_client=httpx_client, base_url=url)  # <--- pass httpx_client and base_url
        client = A2AClient(httpx_client, agent_card=await resolver.get_agent_card())

        msg={
            "message":{
                "role":"user",
                "parts":[
                    {"kind":"text", "text":message}
                ],
                "messageId":"121231221"
            }

        }
        request = SendMessageRequest(
            id="09088980",params=MessageSendParams(**msg)
            )

        response = await client.send_message(request)
        return response.content if hasattr(response, "content") else str(response)



def get_available_agents():
    urls = ["http://localhost:9999","http://localhost:8080"] #db nunchi ravali
    cards = []

    async def gather_cards():
        for u in urls:
            try:
                card = await fetch_agent_card(u)
                cards.append({"url": u, "card": card.model_dump()})
            except Exception as e:
                cards.append({"url": u, "error": str(e)})
        return cards

    return asyncio.run(gather_cards())


def call_agent(agent_input: str) -> str:
    """
    Call another agent by its URL.
    Expects JSON string: {"url": "...", "payload": {"action": "...", ...}}
    """
    try:
        data = json.loads(agent_input)
        url = data["url"]
        payload = data["message"]
        return asyncio.run(_call_agent_async(url, payload))
    except Exception as e:
        return f"Error calling agent: {e}"

if __name__ == "__main__":
    print(get_available_agents())
    print("="*80)
    payload ={
        "url": "http://localhost:9999",
        "message":"can you please send email to dhaneshvaibhav@gmail.com with subject hello world and body hello world"
    }
    print(call_agent(json.dumps(payload)))
tools.py
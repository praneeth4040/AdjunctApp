from google import genai
from google.genai import types
from gemini_prompt import SYSTEM_PROMPT
from helpers.tool_dispatcher import dispatch_tool_call
from helpers.schema import all_tools


# --- CONFIG ---
GOOGLE_API_KEY = "AIzaSyA0UqcJn4QhKSot7m6f9pQx5ldUrRglgYE"

# ---TOOLS ---

# --- INIT ---
client = genai.Client(api_key=GOOGLE_API_KEY)
config = types.GenerateContentConfig(tools=all_tools,system_instruction=SYSTEM_PROMPT)

def ai_response(query,sender_phone,receiver_phone):
    """
    Generates an AI response using Gemini, supporting robust multi-tool chaining.
    - Uses the system prompt and current user message for context.
    - Handles multi-step tool calls with a max-iteration safeguard.
    - Includes error handling for Gemini and tool call failures.
    """
    MAX_ITERATIONS = 5
    context = []
    context.append(types.Content(role="user",parts=[types.Part(text=query)]))
    
    try:
        for _ in range(MAX_ITERATIONS):
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=context,
                config=config,
            )
            part = response.candidates[0].content.parts[0]

            if hasattr(part, "function_call") and part.function_call:
                function_call = part.function_call
                tool_call_msg = f"Tool call: {function_call.name}({function_call.args})"
                print(tool_call_msg)
                context.append(types.Content(role="model", parts=[types.Part(function_call=function_call)]))
                try:
                    result = dispatch_tool_call(function_call.name, function_call.args,sender_phone,receiver_phone)
                    tool_result_msg = f"Tool result: {result['result']}"
                    print(tool_result_msg)
                    context.append(types.Content(role="tool", parts=[types.Part(function_response=types.FunctionResponse(name=function_call.name, response=result))]))
                except Exception as tool_err:
                    tool_result_msg = f"Tool result: Error - {str(tool_err)}"
                    print(tool_result_msg)
                    context.append(types.Content(role="tool", parts=[types.Part(text=tool_result_msg)]))
            else:
                return response.text
        # If max iterations reached without a final response
        return "Sorry, I couldn't complete your request after several steps. Please try again."
    except Exception as e:
        print(f"ai_response error: {str(e)}")
        return "Sorry, something went wrong while processing your request."
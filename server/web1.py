# # client.py
# import asyncio
# import websockets

# async def connect():
#     uri = "ws://localhost:8765"
#     async with websockets.connect(uri) as websocket:
#         print("Connected to server")
        
#         async def send():
#             while True:
#                 msg = input("You: ")
#                 await websocket.send(msg)

#         async def receive():
#             while True:
#                 response = await websocket.recv()
#                 print("\nReceived:", response)

#         await asyncio.gather(send(), receive())

# asyncio.run(connect())
# connector.py (connects to listener)
import socket

host = input("Enter friend IP (e.g. 192.168.1.5): ")
port = 5000

client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client.connect((host, port))

print("Connected to friend!")

while True:
    data = client.recv(1024).decode()
    print("Friend:", data)

    msg = input("You: ")
    client.send(msg.encode())

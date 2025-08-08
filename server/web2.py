# # listener.py (acts as a temporary server)
# server.py
import socket

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind(("127.0.0.1", 5000))  # Bind to localhost
server.listen(1)

print("Waiting for connection...")
conn, addr = server.accept()
print(f"Connected with {addr}")

while True:
    msg = input("You: ")
    conn.send(msg.encode())
    data = conn.recv(1024).decode()
    print("Friend:", data)

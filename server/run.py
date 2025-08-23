from flask import Flask, request, jsonify
from gemini import ai_response
import firebase_admin
from firebase_admin import credentials, messaging
from supabase import create_client, Client
from datetime import datetime


app = Flask(__name__)

@app.route('/')
def home():
    return 'Hello, World!'


@app.route("/ask-ai", methods=["POST"])
def ask_ai():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    query = data.get("query")
    sender_phone = data.get("sender_phone")
    receiver_phone = data.get("receiver_phone")

    if not query or not sender_phone or not receiver_phone:
        return jsonify({"error": "Missing required fields"}), 400

    ai_reply = ai_response(query, sender_phone, receiver_phone)
    return jsonify({"reply": ai_reply})

# 🔔 New endpoint: Send Notification


if __name__ == '__main__':
    app.run(debug=True)

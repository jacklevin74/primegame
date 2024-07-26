import asyncio
import websockets
import json

async def connect_to_solana():
    uri = "ws://xolana.xen.network:8900"

    async with websockets.connect(uri) as websocket:
        # Constructing the subscription request
        subscribe_message = json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "logsSubscribe",
            "params": [
                {
                    "mentions": ["B4FMCpibTGdZhxHHNgWWnwk5PhhKdST37uFRY6TVksaj"]
                },
                {
                    "commitment": "finalized"
                }
            ]
        })

        # Send the subscription request
        await websocket.send(subscribe_message)
        print("WebSocket handshake and message sent successfully")

        # Listen for messages
        async for message in websocket:
            print(f"Received a message: {message}")

async def main():
    await connect_to_solana()

if __name__ == "__main__":
    asyncio.run(main())


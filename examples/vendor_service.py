"""Minimal x402-protected vendor agent for end-to-end AgentGuard demos.

Start this on one port, then run `examples/pay_for_service.py` from another
process. A buyer agent runs through AgentGuard's governance pipeline and,
when approved, pays this service via Circle Gateway. This service verifies
the EIP-712 payment header and returns a response.

Prereqs:
    pnpm infra up; pnpm dev (AgentGuard API + dashboard running)
    pip install "agentguard[circle]" flask
    set SELLER_ADDRESS to a wallet address that holds Gateway-deposited USDC.

Run:
    SELLER_ADDRESS=0x... python examples/vendor_service.py
"""
from __future__ import annotations

import asyncio
import os
import sys
import threading

from dotenv import load_dotenv

load_dotenv()

SELLER_ADDRESS = os.getenv("SELLER_ADDRESS")
PORT = int(os.getenv("PORT", "4021"))

if not SELLER_ADDRESS:
    print("error: set SELLER_ADDRESS to the wallet address that receives payments")
    sys.exit(1)

try:
    from circlekit import create_gateway_middleware
    from circlekit.x402 import PaymentInfo
    from flask import Flask, jsonify, request
except ImportError as exc:
    print(f"error: missing dependency ({exc}). Run: pip install 'agentguard[circle]' flask")
    sys.exit(1)

app = Flask(__name__)

gateway = create_gateway_middleware(
    seller_address=SELLER_ADDRESS,
    chain="arcTestnet",
)

_loop = asyncio.new_event_loop()


def _run_loop() -> None:
    asyncio.set_event_loop(_loop)
    _loop.run_forever()


threading.Thread(target=_run_loop, daemon=True).start()


def require_payment(price: str):
    payment_header = request.headers.get("Payment-Signature")
    future = asyncio.run_coroutine_threadsafe(
        gateway.process_request(
            payment_header=payment_header, path=request.path, price=price
        ),
        _loop,
    )
    result = future.result(timeout=10)
    if isinstance(result, PaymentInfo):
        return result
    resp = jsonify(result.get("body", result))
    resp.status_code = result.get("status", 402)
    for k, v in result.get("headers", {}).items():
        resp.headers[k] = v
    return resp


@app.get("/")
def info():
    return jsonify(
        {
            "agent": "data-vendor-agent-v1",
            "description": "Sells market stats to research agents",
            "endpoints": {"/report": "$0.001"},
            "gatewayNetworks": ["eip155:5042002"],
        }
    )


@app.get("/report")
def report():
    result = require_payment("$0.001")
    if not isinstance(result, PaymentInfo):
        return result
    resp = jsonify(
        {
            "report": {"q3_gdp_growth_pct": 2.1, "confidence": 0.9},
            "payment": {
                "amount": result.amount,
                "payer": result.payer,
                "transaction": result.transaction,
            },
        }
    )
    for k, v in result.response_headers.items():
        resp.headers[k] = v
    return resp


if __name__ == "__main__":
    print(f"vendor-agent x402 service listening at http://localhost:{PORT}")
    print(f"  seller: {SELLER_ADDRESS}")
    print(f"  route:  GET /report ($0.001)")
    print(f"  pay with: python examples/pay_for_service.py")
    print(f"            AGENTGUARD_TARGET_URL=http://localhost:{PORT}/report")
    app.run(host="0.0.0.0", port=PORT)

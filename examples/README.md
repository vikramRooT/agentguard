# AgentGuard examples

Runnable examples for the `agentguard-protocol` SDK. Every script expects
the AgentGuard API running on `http://localhost:4000` and the demo agents
registered. See [/README.md](../README.md#self-host) for setup.

## Quickstart order

| File | What it shows |
| --- | --- |
| [`quickstart.py`](quickstart.py) | The 3-line integration, happy path + blocked path. Start here. |
| [`legitimate_payment.py`](legitimate_payment.py) | Minimal A2A payment (research agent → data vendor). |
| [`claude_agent_sdk_integration.py`](claude_agent_sdk_integration.py) | Expose AgentGuard as a tool in the Claude Agent SDK. |
| [`langchain_integration.py`](langchain_integration.py) | AgentGuard as a LangChain `StructuredTool`. |
| [`a2a_attack.py`](a2a_attack.py) | Compromised agent tries to drain to an unlisted wallet. |
| [`pay_for_service.py`](pay_for_service.py) | Pay an x402-protected endpoint through Circle Gateway. |
| [`vendor_service.py`](vendor_service.py) | Run a local x402 vendor agent you can pay. |
| [`deposit_to_gateway.py`](deposit_to_gateway.py) | Deposit Arc USDC into Circle Gateway (needed for x402 path). |

## Run any example

```bash
pnpm infra:up
pnpm dev:api        # in another terminal
pnpm seed           # register demo agents + fund wallets
pip install -e apps/sdk/python
python examples/quickstart.py
```

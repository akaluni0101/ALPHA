"""
Server launcher for Sound-Based Machine Health Monitor.
Starts the FastAPI application with Uvicorn.
"""

import argparse

import uvicorn


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the machine health monitor API.")
    parser.add_argument("--host", default="127.0.0.1", help="Interface to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    args = parser.parse_args()

    print("=" * 65)
    print("  SOUND-BASED MACHINE HEALTH MONITOR")
    print("  Acoustic Condition Monitoring & Anomaly Detection Prototype")
    print("=" * 65)
    print(f"  Web Dashboard: http://{args.host}:{args.port}")
    print(f"  API Docs (Swagger): http://{args.host}:{args.port}/docs")
    print("=" * 65)
    uvicorn.run("src.app:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()

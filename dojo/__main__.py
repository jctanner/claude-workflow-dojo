"""Run the dojo server: `python -m dojo`."""

import uvicorn

from .app import create_app
from .config import Settings


def main() -> None:
    settings = Settings.from_env()
    # One worker: the live Claude session is in-process state.
    uvicorn.run(create_app(settings), host=settings.host, port=settings.port, workers=1, log_level="info")


if __name__ == "__main__":
    main()

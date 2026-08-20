import json
import logging
import traceback
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings

SUCCESS = 35
logging.addLevelName(SUCCESS, "SUCCESS")


def _success(self, message, *args, **kwargs):
    if self.isEnabledFor(SUCCESS):
        self._log(SUCCESS, message, args, **kwargs)


logging.Logger.success = _success

# Maximum number of log entries kept in the file before oldest are trimmed
MAX_LOG_LINES = 500


class JsonFormatter(logging.Formatter):
    """Format log records as structured JSON."""

    def format(self, record):
        log_record = {
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "process": record.process,
            "thread": record.thread,
        }

        if record.exc_info:
            log_record["exception"] = "".join(
                traceback.format_exception(*record.exc_info)
            )

        return json.dumps(log_record)


class _CappedFileHandler(logging.FileHandler):
    """File handler that keeps at most `max_lines` entries.

    When the line count exceeds `max_lines`, the oldest lines are deleted
    so only the most recent `max_lines` entries are retained.
    """

    def __init__(self, filename: str, max_lines: int = MAX_LOG_LINES, encoding: str = "utf-8") -> None:
        self.max_lines = max_lines
        self._line_count = 0
        _path = Path(filename)
        if _path.exists():
            try:
                self._line_count = sum(1 for _ in _path.open(encoding=encoding))
            except Exception:
                self._line_count = 0
        super().__init__(filename, mode="a", encoding=encoding)

    def emit(self, record: logging.LogRecord) -> None:
        super().emit(record)
        self._line_count += 1
        if self._line_count > self.max_lines:
            self._trim()

    def _trim(self) -> None:
        try:
            self.stream.flush()
            self.stream.close()
            path = Path(self.baseFilename)
            lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
            keep = lines[-self.max_lines :]
            path.write_text("".join(keep), encoding="utf-8")
            self._line_count = len(keep)
            self.stream = self._open()
        except Exception:
            pass


# Setup logger
logger = logging.getLogger("service_logger")
logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.WARNING))
logger.propagate = False

if not logger.handlers:
    formatter = JsonFormatter()

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler — capped at MAX_LOG_LINES entries; oldest trimmed when exceeded
    _log_dir = Path(__file__).resolve().parents[2] / ".logs"
    _log_dir.mkdir(exist_ok=True)
    file_handler = _CappedFileHandler(str(_log_dir / "app.log"), max_lines=MAX_LOG_LINES)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

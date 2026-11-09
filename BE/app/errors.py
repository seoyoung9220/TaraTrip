"""Error responses in the docs/API.md format: {"error": {"code", "message"}}."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        self.status = status
        self.code = code
        self.message = message


def _body(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(status_code=exc.status, content=_body(exc.code, exc.message))

    # FastAPI answers bad input with 422 + {"detail": ...}; the spec wants 400 INVALID_REQUEST.
    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else {}
        where = ".".join(str(p) for p in first.get("loc", ()) if p != "body")
        # Whole-body checks (model validators) have no field location; their msg says what's wrong.
        msg = str(first.get("msg", "invalid value")).removeprefix("Value error, ")
        message = f"{where}: {msg}" if where else msg
        return JSONResponse(status_code=400, content=_body("INVALID_REQUEST", message))

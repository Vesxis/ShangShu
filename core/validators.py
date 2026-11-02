"""Field types shared by DTOs across domains, alongside core.enum."""

from typing import Annotated

from pydantic import AfterValidator

MIN_PASSWORD_LENGTH = 8


def validate_password(value: str) -> str:
    if len(value) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"密码至少需要 {MIN_PASSWORD_LENGTH} 个字符")
    return value


Password = Annotated[str, AfterValidator(validate_password)]

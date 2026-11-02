from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from schemas.auth.input_dto import (
    ChangePasswordDTO,
    ChangeRoleDTO,
    ForgotPasswordDTO,
    RefreshRequestDTO,
    ResetPasswordDTO,
)
from schemas.auth.output_dto import RefreshOutputDTO, TokenOutputDTO
from schemas.client.input_dto import ClientCreateDTO
from schemas.client.output_dto import ClientOutputDTO
from services.auth_service import AuthService
from utils.dependencies import CurrentAdmin, CurrentClient, RateLimit

router_auth = APIRouter(prefix="/auth", tags=["账号认证"])


@router_auth.post("/register", summary="注册账号")
async def register_client(data: ClientCreateDTO, _: RateLimit):
    return await AuthService.register_client(data)

@router_auth.post("/client_login", response_model=TokenOutputDTO, summary="登录账号")
async def client_login(_: RateLimit, data: OAuth2PasswordRequestForm = Depends()) -> TokenOutputDTO:
    return await AuthService.client_login(data)

@router_auth.post("/refresh", response_model=RefreshOutputDTO, summary="刷新访问凭证")
async def refresh_token(data: RefreshRequestDTO) -> RefreshOutputDTO:
    access_token = AuthService.refresh_token(data.refresh_token)
    return RefreshOutputDTO(access_token=access_token)

@router_auth.post("/change_password", summary="修改密码")
async def change_password(data: ChangePasswordDTO, current_client: CurrentClient) -> dict:
    return await AuthService.change_password(data, current_client)

@router_auth.post("/change_role/{client_id}", response_model=ClientOutputDTO, summary="修改用户角色")
async def change_role(client_id: int, data: ChangeRoleDTO, _: CurrentAdmin):
    return await AuthService.change_role(client_id, data)

@router_auth.get("/verify/{token}", summary="验证邮箱")
async def verify_email(token: str):
    return await AuthService.verify_email(token)

@router_auth.post("/resend_verification", summary="重新发送验证邮件")
async def resend_verification(data: ForgotPasswordDTO, _: RateLimit):
    return await AuthService.resend_verification(data)

@router_auth.post("/forgot_password", summary="申请重置密码")
async def forgot_password(data: ForgotPasswordDTO, _: RateLimit):
    return await AuthService.forgot_password(data)

@router_auth.post("/reset_password", summary="重置密码")
async def reset_password(data: ResetPasswordDTO):
    return await AuthService.reset_password(data)

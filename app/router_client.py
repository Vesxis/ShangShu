from fastapi import APIRouter

from schemas.client.input_dto import ClientBalanceOperationDTO, ClientUpdateDTO
from schemas.client.output_dto import ClientOrdersCountDTO, ClientOutputDTO
from schemas.order.output_dto import OrderOutputDTO
from services.client_service import ClientService
from services.order_service import OrderService
from utils.dependencies import CurrentAdmin, CurrentClient, Limit, Offset

router_client = APIRouter(prefix="/client", tags=["用户"])


@router_client.get("/me", response_model=ClientOutputDTO, summary="查看我的资料")
async def get_me(current_client: CurrentClient) -> ClientOutputDTO:
    return current_client

@router_client.get("/me/stats", summary="查看我的消费统计")
async def get_my_stats(current_client: CurrentClient) -> dict:
    return await ClientService.get_client_stats(current_client)

@router_client.get("/me/orders", response_model=list[OrderOutputDTO], summary="查看我的订单")
async def get_my_orders(current_client: CurrentClient, limit: Limit = 10, offset: Offset = 0) -> list:
    return await OrderService.get_my_orders(current_client, limit, offset)

@router_client.post("/{client_id}/deposit", response_model=ClientOutputDTO, summary="充值演示余额")
async def client_deposit(
    client_id: int, deposit: ClientBalanceOperationDTO, current_client: CurrentClient
) -> ClientOutputDTO:
    return await ClientService.client_deposit(client_id, deposit.amount, current_client)

@router_client.post("/{client_id}/withdraw", response_model=ClientOutputDTO, summary="扣减账户余额")
async def client_withdraw(
    client_id: int, withdraw: ClientBalanceOperationDTO, current_client: CurrentClient
) -> ClientOutputDTO:
    return await ClientService.client_withdraw(client_id, withdraw.amount, current_client)

@router_client.get("/get_clients", response_model=list[ClientOutputDTO], summary="获取用户列表")
async def get_clients(_: CurrentAdmin, limit: Limit = 10, offset: Offset = 0) -> list:
    return await ClientService.get_all_client(limit, offset)

@router_client.get("/{client_id}", response_model=ClientOutputDTO, summary="查看用户资料")
async def get_client(client_id: int, current_client: CurrentClient) -> ClientOutputDTO:
    return await ClientService.get_client(client_id, current_client)

@router_client.put("/{client_id}", response_model=ClientOutputDTO, summary="更新用户资料")
async def client_update(
    client_id: int, data: ClientUpdateDTO, current_client: CurrentClient
) -> ClientOutputDTO:
    return await ClientService.client_update(client_id, data, current_client)

@router_client.delete("/{client_id}", response_model=ClientOutputDTO, summary="删除用户账号")
async def client_delete(client_id: int, current_client: CurrentClient) -> ClientOutputDTO:
    return await ClientService.client_delete(client_id, current_client)

@router_client.get("/{client_id}/orders/count", response_model=ClientOrdersCountDTO, summary="统计用户订单数量")
async def client_orders_count(client_id: int, current_client: CurrentClient) -> ClientOrdersCountDTO:
    return await ClientService.get_client_order_count(client_id, current_client)

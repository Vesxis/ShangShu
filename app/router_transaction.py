from fastapi import APIRouter

from schemas.transaction.output_dto import TransactionOutputDTO
from services.transaction_service import TransactionService
from utils.dependencies import CurrentClient, Limit, Offset

router_transaction = APIRouter(prefix="/transaction", tags=["交易"])


@router_transaction.get("/me/transactions", response_model=list[TransactionOutputDTO], summary="查看我的交易记录")
async def get_my_transactions(
    current_client: CurrentClient, limit: Limit = 10, offset: Offset = 0
) -> list:
    return await TransactionService.get_my_transactions(current_client, limit, offset)

@router_transaction.get("/{transaction_id}", response_model=TransactionOutputDTO, summary="查看交易详情")
async def get_transaction(
    transaction_id: int, current_client: CurrentClient
) -> TransactionOutputDTO:
    return await TransactionService.get_transaction(transaction_id, current_client)

@router_transaction.get(
    "/{client_id}/transactions", response_model=list[TransactionOutputDTO], summary="获取用户交易记录"
)
async def client_all_transactions(
    client_id: int, current_client: CurrentClient, limit: Limit = 10, offset: Offset = 0
) -> list:
    return await TransactionService.client_all_transactions(client_id, current_client, limit, offset)

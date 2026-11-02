from fastapi import APIRouter, Query

from schemas.order.input_dto import (
    OrderClientCreateDTO,
    OrderCreateDTO,
    OrderStatusUpdateDTO,
    OrderUpdateDTO,
)
from schemas.order.output_dto import OrderOutputDTO
from services.order_service import OrderService
from utils.dependencies import CurrentAdmin, CurrentClient, Limit, Offset

router_order = APIRouter(prefix="/order", tags=["订单"])


@router_order.post("/create_orders", response_model=OrderOutputDTO, summary="创建空订单")
async def create_order(order: OrderCreateDTO, current_client: CurrentClient) -> OrderOutputDTO:
    return await OrderService.create_order(title=order.title, current_client=current_client)

@router_order.get("/get_orders", response_model=list[OrderOutputDTO], summary="获取订单列表")
async def get_orders(_: CurrentAdmin, limit: Limit = 10, offset: Offset = 0) -> list:
    return await OrderService.get_orders(limit, offset)

@router_order.get("/{order_id}/orders", response_model=OrderOutputDTO, summary="查看订单")
async def get_order(order_id: int, current_client: CurrentClient) -> OrderOutputDTO:
    return await OrderService.get_order(order_id, current_client)

@router_order.post("/{order_id}/products/{products_id}", response_model=OrderOutputDTO, summary="向订单添加商品")
async def add_product_to_order(
    order_id: int,
    products_id: int,
    current_client: CurrentClient,
    quantity: int = Query(1, ge=1),
) -> OrderOutputDTO:
    return await OrderService.add_product_to_order(order_id, products_id, quantity, current_client)

@router_order.put("/order_update/{order_id}", response_model=OrderOutputDTO, summary="更新订单名称")
async def order_update(
    order_id: int, data: OrderUpdateDTO, current_client: CurrentClient
) -> OrderOutputDTO:
    return await OrderService.order_update(order_id, current_client, title=data.title)

@router_order.get("/order/{order_id}/total_price", summary="计算订单总金额")
async def order_client_sum(order_id: int, current_client: CurrentClient) -> dict:
    return await OrderService.order_client_sum(order_id, current_client)

@router_order.put("/{order_id}/status", response_model=OrderOutputDTO, summary="更新订单状态")
async def update_order_status(
    order_id: int, data: OrderStatusUpdateDTO, current_admin: CurrentAdmin
) -> OrderOutputDTO:
    return await OrderService.update_order_status(order_id, data.status, current_admin)

@router_order.post("/orders", response_model=OrderOutputDTO, summary="创建含商品的订单")
async def create_order_for_client(
    data: OrderClientCreateDTO, current_client: CurrentClient
) -> OrderOutputDTO:
    return await OrderService.create_order_client(
        current_client=current_client,
        client_id=data.client_id,
        product_id=data.product_id,
        title=data.title
    )

@router_order.get("/order_with_products/{order_id}", summary="查看订单及商品明细")
async def order_with_products(order_id: int, current_client: CurrentClient) -> dict:
    return await OrderService.get_order_with_products(order_id, current_client)

@router_order.delete("/{order_id}/order/{product_id}/product", response_model=OrderOutputDTO, summary="从订单移除商品")
async def delete_product_from_order_id(
    order_id: int, product_id: int, current_client: CurrentClient
) -> OrderOutputDTO:
    return await OrderService.delete_product_from_order(order_id, product_id, current_client)

@router_order.post("/{order_id}/checkout", response_model=OrderOutputDTO, summary="支付订单")
async def checkout(order_id: int, current_client: CurrentClient) -> OrderOutputDTO:
    return await OrderService.checkout(order_id, current_client)

@router_order.post("/{order_id}/refund", status_code=200, summary="取消订单并退款")
async def canceled_order(order_id: int, current_client: CurrentClient) -> dict:
    await OrderService.cancel_order(order_id, current_client)
    return {"message": "订单取消成功。"}

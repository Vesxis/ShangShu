from fastapi import APIRouter, Query

from schemas.product.input_dto import ProductCreateDTO, ProductStatusUpdateDTO, ProductUpdateDTO
from schemas.product.output_dto import ProductOutputDTO, ProductPageDTO
from services.product_service import ProductService
from utils.dependencies import (
    CurrentAdmin,
    CurrentClient,
    CurrentModerator,
    Limit,
    Offset,
)

router_product = APIRouter(prefix="/product", tags=["商品"])


@router_product.post("/", response_model=ProductOutputDTO, summary="创建商品")
async def create_product(data: ProductCreateDTO, _: CurrentClient) -> ProductOutputDTO:
    return await ProductService.create_product(data)

@router_product.get("/all", response_model=list[ProductOutputDTO], summary="获取已上架商品")
async def get_all_products(limit: Limit = 10, offset: Offset = 0) -> list:
    return await ProductService.get_products(limit, offset)

@router_product.get("/search", response_model=list[ProductOutputDTO], summary="按名称搜索商品")
async def search_products(name: str, limit: Limit = 25, offset: Offset = 0) -> list:
    return await ProductService.search_products(name, limit, offset)

@router_product.get("/filter", response_model=list[ProductOutputDTO], summary="按价格筛选商品")
async def filter_products(
    min_price: float | None = None, max_price: float | None = None,
    limit: Limit = 15, offset: Offset = 0
) -> list:
    return await ProductService.filter_by_price(min_price, max_price, limit, offset)

# Declared before /{product_id}: routes match in order, so a later /catalogue
# would be read as a product id and answered with a 422.
@router_product.get("/catalogue", response_model=ProductPageDTO, summary="分页浏览商品目录")
async def browse_catalogue(
    name: str | None = None,
    category_id: int | None = None,
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    limit: Limit = 12,
    offset: Offset = 0,
) -> ProductPageDTO:
    return await ProductService.browse(name, category_id, min_price, max_price, limit, offset)

@router_product.get("/{product_id}", response_model=ProductOutputDTO, summary="查看商品详情")
async def get_product(product_id: int) -> ProductOutputDTO:
    return await ProductService.get_product(product_id)

@router_product.put("/{product_id}", response_model=ProductOutputDTO, summary="更新商品")
async def update_product(
    product_id: int, data: ProductUpdateDTO, _: CurrentAdmin
) -> ProductOutputDTO:
    return await ProductService.update_product(product_id, data)

@router_product.delete("/{product_id}", response_model=ProductOutputDTO, summary="删除商品")
async def delete_product(product_id: int, _: CurrentAdmin) -> ProductOutputDTO:
    return await ProductService.delete_product(product_id)

@router_product.patch("/{product_id}/moderate", response_model=ProductOutputDTO, summary="审核商品上架状态")
async def update_product_status(product_id: int, data: ProductStatusUpdateDTO, _: CurrentModerator) -> ProductOutputDTO:
    return await ProductService.update_product_status(product_id, data.status)

@router_product.get("/color/{product_color}", response_model=list[ProductOutputDTO], summary="按颜色查找商品")
async def find_by_color(product_color: str, limit: Limit = 10, offset: Offset = 0) -> list[ProductOutputDTO]:
    return await ProductService.find_by_color(product_color, limit, offset)

@router_product.get("/admin/all", response_model=list[ProductOutputDTO], summary="获取所有状态的商品")
async def get_products_admin(_: CurrentAdmin, limit: Limit = 100, offset: Offset = 0):
    return await ProductService.get_products_any_status(limit, offset)

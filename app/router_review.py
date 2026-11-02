from fastapi import APIRouter

from schemas.review.input_dto import ReviewCreate
from schemas.review.output_dto import ReviewResponse
from services.review_service import ReviewService
from utils.dependencies import CurrentClient

router_review = APIRouter(prefix="/review", tags=["评价"])


@router_review.post("/", response_model=ReviewResponse, summary="提交商品评价")
async def create_review(current_client: CurrentClient, data: ReviewCreate) -> ReviewResponse:
    return await ReviewService.create_review(data, current_client.id)

@router_review.get("/product/{product_id}", response_model=list[ReviewResponse], summary="查看商品评价列表")
async def get_review_by_product_id(product_id: int) -> list[ReviewResponse]:
    return await ReviewService.get_reviews_by_product_id(product_id)

@router_review.get("/{review_id}", response_model=ReviewResponse, summary="查看评价详情")
async def get_review(review_id: int) -> ReviewResponse:
    return await ReviewService.get_review(review_id)

@router_review.delete("/{review_id}", status_code=204, summary="删除评价")
async def review_delete(review_id: int, current_client: CurrentClient) -> None:
    await ReviewService.delete_review(review_id, current_client)

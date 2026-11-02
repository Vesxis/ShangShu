from fastapi import HTTPException, status


class BaseAppException(HTTPException):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(status_code=status_code, detail=detail)

class OrderNotFoundError(BaseAppException):
    def __init__(self, order_id: int | None = None, title: str | None = None) -> None:
        if order_id is not None:
            detail = f"未找到编号为 {order_id} 的订单。"
        elif title:
            detail = f"未找到名称为“{title}”的订单。"
        else:
            detail = "订单不存在。"
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class ClientNotFoundError(BaseAppException):
    def __init__(self, client_id: int | None = None, email: str | None = None) -> None:
        if client_id is not None:
            detail = f"未找到编号为 {client_id} 的用户。"
        elif email:
            detail = f"未找到邮箱为“{email}”的用户。"
        else:
            detail = "用户不存在。"
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class ClientsNotFoundError(BaseAppException):
    def __init__(self) -> None:
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="暂无用户。")

class ProductsNotFound(BaseAppException):
    def __init__(self) -> None:
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="未找到商品。")

class ClientAlreadyError(BaseAppException):
    def __init__(self, email: str | None = None, client_id: int | None = None) -> None:
        if client_id is not None:
            detail = f"编号为 {client_id} 的用户已注册。"
        elif email:
            detail = f"邮箱“{email}”已注册。"
        else:
            detail = "用户已注册。"
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)

class ProductAlready(BaseAppException):
    def __init__(self) -> None:
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail="订单中已包含此商品。")

class ProductNotApprovedError(BaseAppException):
    def __init__(self, product_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"商品 {product_id} 尚未通过上架审核。"
        )

class OrderAlready(BaseAppException):
    def __init__(self) -> None:
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail="订单已完成，请勿重复操作。")

class InsufficientPermissionsError(BaseAppException):
    def __init__(self, required_role: str, client_role: str) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"权限不足。所需角色：{required_role}；当前角色：{client_role}。",
        )

class InvalidAmountError(BaseAppException):
    def __init__(self, amount: float) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"金额 {amount} 无效，金额必须大于零。",
        )

class ClientUpdateError(BaseAppException):
    def __init__(self, client_id: int, reason: str = "更新失败。") -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无法更新用户 {client_id}：{reason}",
        )

class OrderUpdateError(BaseAppException):
    def __init__(self, order_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"订单 {order_id} 不存在。",
        )

class OrderDeleteError(BaseAppException):
    def __init__(self, order_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无法删除订单 {order_id}。",
        )

class ClientDeleteError(BaseAppException):
    def __init__(self, client_id: int, reason: str = "删除失败。") -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无法删除用户 {client_id}：{reason}",
        )

class ClientTransactionNotFound(BaseAppException):
    def __init__(self, client_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"用户 {client_id} 暂无交易记录。",
        )

class NotEnoughMoneyError(BaseAppException):
    def __init__(self, client_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"用户 {client_id} 的账户余额不足。",
        )

class TokenExpiredError(BaseAppException):
    def __init__(self) -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录凭证已过期，请重新登录。")

class TokenInvalidError(BaseAppException):
    def __init__(self) -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail="凭证无效，请重新登录或申请新的链接。")

class VerifyPasswordError(BaseAppException):
    def __init__(self) -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail="密码错误。")
        
class TransactionNotFound(BaseAppException):
    def __init__(self) -> None:
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="交易记录不存在。")

class ProductNotFound(BaseAppException):
    def __init__(self, product_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"商品 {product_id} 不存在。",
        )

class OrderNotCompletedError(BaseAppException):
    def __init__(self, order_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"订单 {order_id} 尚未完成，无法退款。",
        )

class EmailNotVerifiedError(BaseAppException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="邮箱尚未验证，请点击验证邮件中的链接，或重新发送验证邮件。"
        )

class OrderCannotBeCancelledError(BaseAppException):
    def __init__(self, order_id: int):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"订单 {order_id} 已取消。"
        )

class InvalidOrderTransitionError(BaseAppException):
    def __init__(self, from_status, to_status) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无法将订单从 {from_status} 变更为 {to_status}。"
        )

class TooManyRequests(BaseAppException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="请求过于频繁，请稍后重试。"
        )

class OutOfStockError(BaseAppException):
    def __init__(self, product_id: int):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"商品 {product_id} 库存不足。"
        )

class CategoryNotFoundError(BaseAppException):
    def __init__(self, category_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"分类 {category_id} 不存在。"
        )
        
class ReviewNotFoundError(BaseAppException):
    def __init__(self, review_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"评价 {review_id} 不存在。"
        )

class ReviewsNotFoundError(BaseAppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="暂无评价。"
        )



class CategoryAlreadyExistsError(BaseAppException):
    def __init__(self, name: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"分类“{name}”已存在。"
        )


class ReviewAlreadyExistsError(BaseAppException):
    def __init__(self, product_id: int):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"你已评价过商品 {product_id}，请勿重复提交。"
        )


class InvalidWebhookSignatureError(BaseAppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="支付回调签名无效。"
        )

class EmailQueueError(BaseAppException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="邮件暂时无法发送，请稍后重试。",
        )

class LLMUnavailableError(BaseAppException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="智能助手暂时不可用，请稍后重试。",
        )

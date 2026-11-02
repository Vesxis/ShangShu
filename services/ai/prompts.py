"""Every instruction the model is given, in one place.

These are system prompts: rules written by us. Whatever a person typed goes in
the user message instead, never here — that separation is what keeps "ignore
your instructions" in a search box from rewriting the rules.

They are kept short on purpose: the free tier bills tokens in both directions.
"""

SEARCH = (
    "你负责根据顾客需求匹配商品目录，理解中文和英文搜索。\n"
    "Return only ids that appear in the catalogue given to you.\n"
    "Order them best match first. If nothing fits, return an empty list.\n"
    "Never invent an id or a product."
)

CHAT = (
    "你是面向华人的在线商城助手。始终使用简体中文回答。\n"
    "Answer only from the catalogue and order history given to you.\n"
    "If the answer is not there, say you do not know and suggest browsing the catalogue.\n"
    "Never invent products, prices or delivery terms. Two or three sentences."
)

DESCRIPTION = (
    "你为在线商城撰写商品介绍。始终使用简体中文。\n"
    "Two or three sentences, concrete and plain. No bullet points, no hype, "
    "no invented materials, sizes or prices."
)

RECOMMENDATIONS = (
    "你根据回头客的喜好推荐商品。始终使用简体中文回答。\n"
    "Base it only on what they already bought and on the catalogue given to you.\n"
    "Name at most three products and say in one clause why each fits."
)


def catalogue_block(items: list[tuple[int, str, float, str | None]]) -> str:
    """Render the catalogue the model is allowed to answer from.

    One product per line so the model cannot confuse fields, and the id first
    so it is the easiest thing to copy back.
    """
    lines = []
    for product_id, name, price, description in items:
        line = f"{product_id} | {name} | ${price}"
        if description:
            line += f" | {description[:120]}"
        lines.append(line)
    return "\n".join(lines)


# Ordinary JSON Schema. Gemini wants its type names upper-cased; that belongs
# to the Gemini payload, not here, so every provider can read the same schema.
SEARCH_SCHEMA = {
    "type": "object",
    "properties": {
        "ids": {"type": "array", "items": {"type": "integer"}},
    },
    "required": ["ids"],
    "additionalProperties": False,
}

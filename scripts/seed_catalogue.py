"""Fill an empty store with a demo catalogue.

    python -m scripts.seed_catalogue --products 2000

Products are generated from per-category templates with a fixed random seed, so
two runs with the same arguments produce the same catalogue. They are inserted
in round-robin category order: the AI endpoints read the first hundred products
by id, and that hundred should span every category rather than one.
"""

import argparse
import asyncio
import random
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import func, insert, select

import database.database as db_module
from core.enum import ProductStatus
from models.models import Category, Product
from utils import cache

BATCH_SIZE = 500


@dataclass(frozen=True)
class Template:
    category: str
    image_tag: str
    brands: tuple[str, ...]
    lines: tuple[str, ...]  # lines[i] is made by brands[i]
    price_range: tuple[int, int]
    colors: tuple[str, ...]
    uses: tuple[str, ...]
    features: tuple[str, ...]


TEMPLATES = (
    Template(
        "笔记本电脑", "laptop",
        ("Lenovo", "Dell", "HP", "Asus", "Acer", "Apple", "MSI"),
        ("ThinkPad", "XPS", "Pavilion", "ZenBook", "Swift", "MacBook Air", "Prestige"),
        (499, 2899),
        ("silver", "black", "gray", "white"),
        ("适合学习与旅行的轻薄笔记本", "面向开发者的高效工作笔记本",
         "适合办公的安静笔记本", "适合游戏的笔记本电脑"),
        ("14 英寸 IPS 屏幕", "16 GB 内存", "1 TB 固态硬盘", "全天续航",
         "背光键盘", "雷电 4 接口", "120 Hz 屏幕"),
    ),
    Template(
        "智能手机", "smartphone",
        ("Samsung", "Apple", "Google", "Xiaomi", "OnePlus", "Motorola", "Nothing"),
        ("Galaxy", "iPhone", "Pixel", "Redmi Note", "Nord", "Edge", "Phone"),
        (199, 1499),
        ("black", "blue", "white", "green", "purple"),
        ("适合拍照的旗舰手机", "经济实用的日常手机",
         "适合单手操作的小巧手机", "注重长续航的手机"),
        ("5000 万像素主摄", "5000 mAh 电池", "OLED 屏幕", "5G 网络支持",
         "有线快充", "IP68 防护等级", "两天续航"),
    ),
    Template(
        "耳机", "headphones",
        ("Sony", "Bose", "Sennheiser", "JBL", "Audio-Technica", "Beats", "Marshall"),
        ("WH", "QuietComfort", "Momentum", "Tune", "ATH", "Studio", "Major"),
        (39, 449),
        ("black", "white", "silver", "blue"),
        ("适合长途飞行的头戴式耳机", "适合健身的无线耳塞",
         "适合混音的监听耳机", "适合日常通勤的耳机"),
        ("主动降噪", "30 小时播放续航", "可折叠设计",
         "蓝牙 5.3", "内置麦克风", "防汗设计"),
    ),
    Template(
        "智能手表", "smartwatch",
        ("Apple", "Samsung", "Garmin", "Amazfit", "Fitbit", "Huawei"),
        ("Watch", "Galaxy Watch", "Forerunner", "GTR", "Versa", "Watch GT"),
        (79, 899),
        ("black", "silver", "rose gold", "green"),
        ("配备 GPS 的跑步手表", "支持通知与支付的智能手表",
         "记录睡眠和心率的运动手环", "适合徒步的耐用手表"),
        ("内置 GPS", "心率传感器", "睡眠监测", "一周续航",
         "50 米防水", "非接触支付"),
    ),
    Template(
        "平板电脑", "tablet",
        ("Apple", "Samsung", "Lenovo", "Xiaomi", "Amazon"),
        ("iPad", "Galaxy Tab", "Tab P", "Pad", "Fire HD"),
        (129, 1299),
        ("gray", "silver", "blue", "black"),
        ("适合阅读与视频的平板电脑", "支持手写笔绘画的平板电脑",
         "适合儿童使用的平板电脑", "可用于移动办公的平板电脑"),
        ("11 英寸屏幕", "手写笔支持", "键盘保护套", "立体声扬声器",
         "120 Hz 屏幕", "LTE 网络连接"),
    ),
    Template(
        "相机", "camera",
        ("Canon", "Nikon", "Sony", "Fujifilm", "Panasonic", "GoPro"),
        ("EOS R", "Z", "Alpha", "X-T", "Lumix", "Hero"),
        (299, 3499),
        ("black", "silver"),
        ("适合旅行的微单相机", "适合运动拍摄的运动相机",
         "适合拍摄视频日志的相机", "面向专业摄影的全画幅相机"),
        ("4K 视频拍摄", "机身防抖", "翻转屏幕", "2400 万像素传感器",
         "防尘防滴设计", "快速自动对焦"),
    ),
    Template(
        "键盘", "keyboard",
        ("Logitech", "Keychron", "Razer", "Corsair", "SteelSeries", "HyperX"),
        ("MX Keys", "K", "BlackWidow", "K70", "Apex", "Alloy"),
        (29, 249),
        ("black", "white", "gray"),
        ("适合打字的机械键盘", "适合办公室的静音键盘",
         "配备 RGB 灯效的游戏键盘", "适合旅行的紧凑键盘"),
        ("热插拔轴体", "无线连接", "RGB 背光",
         "75% 配列", "多设备配对", "可拆卸连接线"),
    ),
    Template(
        "显示器", "monitor",
        ("LG", "Dell", "Samsung", "Asus", "BenQ", "AOC"),
        ("UltraGear", "UltraSharp", "Odyssey", "ProArt", "PD", "Gaming"),
        (119, 1599),
        ("black", "white", "silver"),
        ("面向设计师的 4K 显示器", "适合游戏的高刷新率显示器",
         "适合编程的超宽显示器", "适合办公的护眼显示器"),
        ("27 英寸面板", "144 Hz 刷新率", "支持充电的 USB-C 接口",
         "出厂色彩校准", "可升降支架", "HDR 支持"),
    ),
    Template(
        "音箱", "speaker",
        ("JBL", "Bose", "Sonos", "Marshall", "Ultimate Ears", "Anker"),
        ("Flip", "SoundLink", "Era", "Emberton", "Boom", "Soundcore"),
        (29, 699),
        ("black", "blue", "red", "gray"),
        ("适合海滩的防水音箱", "适合客厅的智能音箱",
         "适合聚会的便携音箱", "适合居家听音乐的书架音箱"),
        ("20 小时播放续航", "防水设计", "语音助手支持",
         "多房间音频", "深沉低音", "Wi-Fi 音乐播放"),
    ),
    Template(
        "游戏主机", "console",
        ("Sony", "Microsoft", "Nintendo", "Valve", "Asus"),
        ("PlayStation", "Xbox Series", "Switch", "Steam Deck", "ROG Ally"),
        (249, 799),
        ("white", "black"),
        ("适合全家使用的家用游戏主机", "适合旅行的掌上游戏机",
         "支持 4K 游戏的主机", "可便携使用的游戏电脑"),
        ("1 TB 存储空间", "4K 输出", "双手柄", "7 英寸屏幕",
         "向下兼容", "在线多人游戏"),
    ),
)


def build_products(count: int, seed: int) -> list[dict]:
    """Generate products as rows, in round-robin category order.

    `category` holds the category name; the caller swaps it for an id.
    """
    rng = random.Random(seed)
    rows = []

    for index in range(count):
        template = TEMPLATES[index % len(TEMPLATES)]
        maker = rng.randrange(len(template.brands))
        brand, line = template.brands[maker], template.lines[maker]
        model = rng.randint(2, 99)
        low, high = template.price_range
        features = rng.sample(template.features, 2)

        rows.append({
            "name": f"{brand} {line} {model} {template.category}",
            "price": Decimal(rng.randint(low, high)) - Decimal("0.01"),
            "color": rng.choice(template.colors),
            "status": ProductStatus.accept,
            "image_url": f"https://loremflickr.com/600/600/{template.image_tag}?lock={index + 1}",
            "description": f"{rng.choice(template.uses)}，配备{features[0]}和{features[1]}。",
            "quantity": 0 if rng.random() < 0.05 else rng.randint(1, 200),
            "category": template.category,
        })

    return rows


async def ensure_categories(session) -> dict[str, int]:
    """Create the demo categories that are missing and return every id by name."""
    names = [template.category for template in TEMPLATES]
    found = await session.execute(select(Category.name).where(Category.name.in_(names)))
    existing = set(found.scalars())

    missing = [{"name": name} for name in names if name not in existing]
    if missing:
        await session.execute(insert(Category), missing)

    result = await session.execute(select(Category.name, Category.id).where(Category.name.in_(names)))
    return dict(result.all())


async def seed(count: int, seed_value: int, append: bool) -> int:
    """Insert the demo catalogue and return how many products were added."""
    async with db_module.async_session_maker() as session:
        existing = await session.scalar(select(func.count()).select_from(Product))
        if existing and not append:
            raise SystemExit(
                f"商城已有 {existing} 件商品。如需追加，请使用 --append。"
            )

        category_ids = await ensure_categories(session)
        rows = build_products(count, seed_value)
        for row in rows:
            row["category_id"] = category_ids[row.pop("category")]

        for start in range(0, len(rows), BATCH_SIZE):
            await session.execute(insert(Product), rows[start:start + BATCH_SIZE])
        await session.commit()

    # The storefront and the AI answers are cached per catalogue version.
    await cache.invalidate("product")
    await cache.invalidate("category")
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="为商城生成中文演示商品目录")
    parser.add_argument("--products", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=42, help="相同随机种子生成相同商品目录")
    parser.add_argument("--append", action="store_true", help="向已有商品的商城追加数据")
    args = parser.parse_args()

    async def run() -> int:
        try:
            return await seed(args.products, args.seed, args.append)
        finally:
            await db_module.async_engine.dispose()

    added = asyncio.run(run())
    print(f"已添加 {added} 件商品，共 {len(TEMPLATES)} 个分类。")


if __name__ == "__main__":
    main()

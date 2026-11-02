from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.models import ProcessedStripeEvent


class StripeEventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def claim(self, event_id: str) -> bool:
        """Try to mark an event as ours to process.

        Returns False when the row is already there, which means a previous
        delivery of the same event was handled and this one must be ignored.
        A unique primary key arbitrates concurrent deliveries. A savepoint
        isolates duplicate-key errors without rolling back the outer payment.
        """
        try:
            async with self.session.begin_nested():
                await self.session.execute(insert(ProcessedStripeEvent).values(event_id=event_id))
        except IntegrityError as exc:
            if exc.orig.args and exc.orig.args[0] == 1062:
                return False
            raise
        return True

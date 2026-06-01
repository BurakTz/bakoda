from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas import RoomOut
from src.services import room_service

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("", response_model=list[RoomOut])
async def list_rooms(
    check_in: date | None = Query(default=None),
    check_out: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    if (check_in is None) != (check_out is None):
        raise HTTPException(
            status_code=400, detail="Provide both check_in and check_out or neither"
        )
    if check_in and check_out and check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")
    return await room_service.list_rooms(db, check_in, check_out)


@router.get("/{room_id}", response_model=RoomOut)
async def get_room(room_id: int, db: AsyncSession = Depends(get_db)):
    room = await room_service.get_room(db, room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

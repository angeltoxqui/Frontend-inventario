from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_session
from app.db.models import Ingredient
from app.schemas.inventory import IngredientCreate, IngredientUpdate, IngredientResponse, IngredientStockAdjust

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

@router.get("/ingredients", response_model=List[IngredientResponse])
async def get_ingredients(
    tenant_id: int = Query(..., description="ID del tenant"),
    session: AsyncSession = Depends(get_session)
):
    query = select(Ingredient).where(Ingredient.tenant_id == tenant_id)
    result = await session.execute(query)
    return result.scalars().all()

@router.post("/ingredients", response_model=IngredientResponse)
async def create_ingredient(
    data: IngredientCreate,
    tenant_id: int = Query(..., description="ID del tenant"),
    session: AsyncSession = Depends(get_session)
):
    ingredient = Ingredient(
        tenant_id=tenant_id,
        name=data.name,
        unit=data.unit,
        cost=data.cost,
        current_stock=data.current_stock,
        notes=data.notes
    )
    session.add(ingredient)
    await session.commit()
    await session.refresh(ingredient)
    return ingredient

@router.put("/ingredients/{ingredient_id}", response_model=IngredientResponse)
async def update_ingredient(
    ingredient_id: int,
    data: IngredientUpdate,
    tenant_id: int = Query(..., description="ID del tenant"),
    session: AsyncSession = Depends(get_session)
):
    query = select(Ingredient).where(Ingredient.id == ingredient_id, Ingredient.tenant_id == tenant_id)
    result = await session.execute(query)
    ingredient = result.scalar_one_or_none()
    
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ingredient, key, value)
        
    session.add(ingredient)
    await session.commit()
    await session.refresh(ingredient)
    return ingredient

@router.delete("/ingredients/{ingredient_id}")
async def delete_ingredient(
    ingredient_id: int,
    tenant_id: int = Query(..., description="ID del tenant"),
    session: AsyncSession = Depends(get_session)
):
    query = select(Ingredient).where(Ingredient.id == ingredient_id, Ingredient.tenant_id == tenant_id)
    result = await session.execute(query)
    ingredient = result.scalar_one_or_none()
    
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
        
    await session.delete(ingredient)
    await session.commit()
    return {"message": "Ingredient deleted"}

@router.post("/ingredients/{ingredient_id}/adjust-stock", response_model=IngredientResponse)
async def adjust_stock(
    ingredient_id: int,
    data: IngredientStockAdjust,
    tenant_id: int = Query(..., description="ID del tenant"),
    session: AsyncSession = Depends(get_session)
):
    query = select(Ingredient).where(Ingredient.id == ingredient_id, Ingredient.tenant_id == tenant_id)
    result = await session.execute(query)
    ingredient = result.scalar_one_or_none()
    
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    ingredient.current_stock += data.amount
    # Here you might log the 'reason' to a StockLog table if one existed
    
    session.add(ingredient)
    await session.commit()
    await session.refresh(ingredient)
    return ingredient

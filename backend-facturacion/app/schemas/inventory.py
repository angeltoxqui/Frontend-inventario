from typing import Optional, List
from pydantic import BaseModel

class IngredientBase(BaseModel):
    name: str
    unit: str
    cost: float = 0
    current_stock: float = 0
    notes: Optional[str] = None

class IngredientCreate(IngredientBase):
    pass

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    cost: Optional[float] = None
    # stock is updated via adjust-stock endpoint usually, but allowing here for admin edits
    current_stock: Optional[float] = None 
    notes: Optional[str] = None

class IngredientResponse(IngredientBase):
    id: int
    tenant_id: int

    class Config:
        from_attributes = True

class IngredientStockAdjust(BaseModel):
    amount: float
    reason: Optional[str] = None

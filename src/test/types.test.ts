import { describe, it, expect } from 'vitest';
import { PantryItem, ShoppingItem, StructuredRecipe, SavedRecipe, DayPlan, MealPlanItem } from '../../../types';

describe('Type Definitions', () => {
  it('should create a valid PantryItem', () => {
    const item: PantryItem = {
      item: 'Milk',
      category: 'Dairy',
      quantity_estimate: '2 liters',
    };

    expect(item.item).toBe('Milk');
    expect(item.category).toBe('Dairy');
    expect(item.quantity_estimate).toBe('2 liters');
  });

  it('should create a valid ShoppingItem', () => {
    const item: ShoppingItem = {
      id: '123',
      item: 'Bread',
      category: 'Bakery',
      checked: false,
    };

    expect(item.id).toBe('123');
    expect(item.item).toBe('Bread');
    expect(item.category).toBe('Bakery');
    expect(item.checked).toBe(false);
  });

  it('should create a valid StructuredRecipe', () => {
    const recipe: StructuredRecipe = {
      title: 'Pasta Carbonara',
      description: 'Classic Italian pasta dish',
      ingredients: ['200g spaghetti', '100g pancetta', '2 eggs', '50g parmesan'],
      instructions: ['Boil pasta', 'Cook pancetta', 'Mix eggs and cheese', 'Combine all'],
      cookTime: '20 minutes',
      type: 'Main Course',
    };

    expect(recipe.title).toBe('Pasta Carbonara');
    expect(recipe.ingredients).toHaveLength(4);
    expect(recipe.instructions).toHaveLength(4);
    expect(recipe.cookTime).toBe('20 minutes');
  });

  it('should create a valid SavedRecipe extending StructuredRecipe', () => {
    const savedRecipe: SavedRecipe = {
      id: 'recipe-123',
      title: 'Pasta Carbonara',
      description: 'Classic Italian pasta dish',
      ingredients: ['200g spaghetti', '100g pancetta', '2 eggs', '50g parmesan'],
      instructions: ['Boil pasta', 'Cook pancetta', 'Mix eggs and cheese', 'Combine all'],
      cookTime: '20 minutes',
      dateSaved: '2024-01-15',
      imagePlaceholder: '#FF5733',
    };

    expect(savedRecipe.id).toBe('recipe-123');
    expect(savedRecipe.dateSaved).toBe('2024-01-15');
    expect(savedRecipe.imagePlaceholder).toBe('#FF5733');
  });

  it('should create a valid DayPlan', () => {
    const dayPlan: DayPlan = {
      date: '2024-01-15',
      dayName: 'Monday',
      meals: [],
    };

    expect(dayPlan.date).toBe('2024-01-15');
    expect(dayPlan.dayName).toBe('Monday');
    expect(dayPlan.meals).toEqual([]);
  });

  it('should create a valid MealPlanItem', () => {
    const recipe: StructuredRecipe = {
      title: 'Test Recipe',
      description: 'Test description',
      ingredients: ['ingredient 1'],
      instructions: ['step 1'],
      cookTime: '10 minutes',
    };

    const mealItem: MealPlanItem = {
      id: 'meal-123',
      recipe: recipe,
    };

    expect(mealItem.id).toBe('meal-123');
    expect(mealItem.recipe.title).toBe('Test Recipe');
  });
});
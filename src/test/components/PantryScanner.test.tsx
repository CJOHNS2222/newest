import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PantryScanner } from '../../../components/PantryScanner';
import { PantryItem, LoadingState } from '../../../types';

// Mock Capacitor Camera
vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn(),
  },
  CameraResultType: {
    DataUrl: 'dataUrl',
  },
  CameraSource: {
    Camera: 'camera',
  },
}));

// Mock Gemini service
vi.mock('../../../services/geminiService', () => ({
  analyzePantryImage: vi.fn(),
}));

describe('PantryScanner Component', () => {
  const mockSetInventory = vi.fn();
  const mockAddToShoppingList = vi.fn();

  const initialInventory: PantryItem[] = [
    { item: 'Milk', category: '', quantity_estimate: '2' },
    { item: 'Bread', category: '', quantity_estimate: '1' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with initial inventory', () => {
    render(
      <PantryScanner
        inventory={initialInventory}
        setInventory={mockSetInventory}
        addToShoppingList={mockAddToShoppingList}
      />
    );

    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
  });

  it('renders the component title', () => {
    render(
      <PantryScanner
        inventory={initialInventory}
        setInventory={mockSetInventory}
        addToShoppingList={mockAddToShoppingList}
      />
    );

    expect(screen.getByText('My Pantry')).toBeInTheDocument();
  });

  it('shows the scan prompt', () => {
    render(
      <PantryScanner
        inventory={initialInventory}
        setInventory={mockSetInventory}
        addToShoppingList={mockAddToShoppingList}
      />
    );

    expect(screen.getByText('Scan receipt or pantry')).toBeInTheDocument();
  });
});
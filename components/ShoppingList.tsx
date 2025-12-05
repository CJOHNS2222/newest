import React from 'react';
import { ShoppingBasket, Check, Trash2, Archive, Plus } from 'lucide-react';
import { ShoppingItem } from '../types';

interface ShoppingListProps {
  items: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  onMoveToPantry: (items: ShoppingItem[]) => void;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ items, setItems, onMoveToPantry }) => {
  const [newItem, setNewItem] = React.useState('');

  const toggleCheck = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const remove = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setItems(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        item: newItem,
        category: 'Manual',
        checked: false
    }]);
    setNewItem('');
  };

  const handleCheckout = () => {
    const purchased = items.filter(i => i.checked);
    if (purchased.length === 0) return;
    
    if (confirm(`Move ${purchased.length} items to pantry?`)) {
        onMoveToPantry(purchased);
        setItems(prev => prev.filter(i => !i.checked));
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif font-bold text-theme-secondary">Shopping List</h2>
        <p className="text-theme-secondary opacity-60 text-sm mt-1">Items to purchase</p>
      </div>

      <form onSubmit={addItem} className="relative z-10">
        <input 
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item to buy..."
          className="w-full bg-theme-secondary border border-theme rounded-lg px-4 py-3 text-theme-primary shadow-sm focus:border-[var(--accent-color)] outline-none transition-all placeholder:opacity-40"
        />
        <button type="submit" className="absolute right-3 top-3 text-[var(--accent-color)] hover:scale-110 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {items.length > 0 && (
          <div className="flex justify-end">
              <button 
                onClick={handleCheckout}
                disabled={!items.some(i => i.checked)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    items.some(i => i.checked) 
                    ? 'bg-[var(--accent-color)] text-white shadow-lg' 
                    : 'bg-theme-secondary text-theme-secondary opacity-50 cursor-not-allowed'
                }`}
              >
                  <Archive className="w-4 h-4" /> Move Checked to Pantry
              </button>
          </div>
      )}

      <div className="space-y-2">
        {items.map((item) => (
            <div 
                key={item.id} 
                onClick={() => toggleCheck(item.id)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${
                    item.checked 
                    ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)]/30' 
                    : 'bg-theme-secondary border-theme hover:border-[var(--accent-color)]/50'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        item.checked ? 'bg-[var(--accent-color)] border-[var(--accent-color)]' : 'border-theme'
                    }`}>
                        {item.checked && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                        <span className={`font-medium ${item.checked ? 'line-through opacity-50' : 'text-theme-primary'}`}>
                            {item.item}
                        </span>
                        <div className="text-[10px] uppercase tracking-wider opacity-50 text-theme-secondary">
                            {item.category}
                        </div>
                    </div>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); remove(item.id); }}
                    className="p-2 text-theme-secondary opacity-30 hover:opacity-100 hover:text-red-500 transition-opacity"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        ))}
        {items.length === 0 && (
             <div className="text-center py-12 opacity-30 flex flex-col items-center">
                <ShoppingBasket className="w-12 h-12 mb-2" />
                <p>List is empty</p>
             </div>
        )}
      </div>
    </div>
  );
};
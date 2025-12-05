import React, { useState, useRef } from 'react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Camera, Upload, Loader2, Plus, Trash2, CheckCircle2, ShoppingBasket } from 'lucide-react';
import { analyzePantryImage } from '../services/geminiService';
import { PantryItem, LoadingState } from '../types';

interface PantryScannerProps {
  inventory: PantryItem[];
  setInventory: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  addToShoppingList: (items: string[]) => void;
}

export const PantryScanner: React.FC<PantryScannerProps> = ({ inventory, setInventory, addToShoppingList }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawBase64, setRawBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [newItemText, setNewItemText] = useState('');
  

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use Capacitor Camera for mobile
  const handleTakePhoto = async () => {
    try {
      const photo = await CapacitorCamera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 80,
      });
      setImagePreview(photo.dataUrl || null);
      if (photo.dataUrl) {
        const base64Data = photo.dataUrl.split(',')[1];
        setRawBase64(base64Data);
        setMimeType(photo.format ? `image/${photo.format}` : 'image/jpeg');
      }
    } catch (err) {
      // User cancelled or error
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingState(LoadingState.IDLE);
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      const base64Data = result.split(',')[1];
      setRawBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!rawBase64) return;
    setLoadingState(LoadingState.LOADING);

    try {
      const items = await analyzePantryImage(rawBase64, mimeType);
      if (items.length > 0) {
        setInventory(prev => [...prev, ...items]);
        setLoadingState(LoadingState.SUCCESS);
      } else {
          setLoadingState(LoadingState.ERROR);
      }
    } catch (err) {
      console.error(err);
      setLoadingState(LoadingState.ERROR);
    }
  };

  const removeItem = (index: number) => {
    setInventory(prev => prev.filter((_, i) => i !== index));
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    setInventory(prev => [...prev, { item: newItemText, category: 'Manual', quantity_estimate: '1' }]);
    setNewItemText('');
  };

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif font-bold text-theme-secondary">My Pantry</h2>
        <p className="text-theme-secondary opacity-60 text-sm mt-1">Items currently in stock</p>
      </div>

      <div className="bg-theme-secondary p-6 rounded-2xl border border-theme shadow-lg relative overflow-hidden">
        <div 
          className="relative group cursor-pointer transition-all duration-300 z-10"
          onClick={async () => {
            // Use Capacitor Camera if available, else fallback to file input
            if ((window as any).Capacitor) {
              await handleTakePhoto();
            } else {
              fileInputRef.current?.click();
            }
          }}
        >
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden aspect-video ring-2 ring-[var(--accent-color)]">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-80" />
            </div>
          ) : (
            <div className="border-2 border-dashed border-theme rounded-xl bg-theme-primary hover:bg-[var(--accent-color)]/5 transition-all aspect-video flex flex-col items-center justify-center gap-4">
              <div className="p-3 bg-theme-secondary rounded-full shadow-lg group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-[var(--accent-color)]" />
              </div>
              <p className="text-theme-secondary opacity-70 text-sm font-medium">Scan receipt or pantry</p>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
        </div>

        {imagePreview && loadingState !== LoadingState.SUCCESS && (
          <button
            onClick={handleAnalyze}
            disabled={loadingState === LoadingState.LOADING}
            className="w-full mt-4 py-3 rounded-lg font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 bg-[var(--accent-color)] text-white shadow-lg"
          >
            {loadingState === LoadingState.LOADING ? <Loader2 className="animate-spin" /> : "Process Image"}
          </button>
        )}
      </div>

      <form onSubmit={handleManualAdd} className="relative z-10">
        <input 
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Quick add item..."
          className="w-full bg-theme-secondary border border-theme rounded-lg px-4 py-3 text-theme-primary shadow-sm outline-none"
        />
        <button type="submit" className="absolute right-3 top-3 text-[var(--accent-color)] hover:scale-110">
          <Plus className="w-5 h-5" />
        </button>
      </form>

      <div className="space-y-1">
        {inventory.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 border-b border-theme bg-theme-secondary rounded-lg">
             <div className="flex-1">
                <div className="text-theme-primary font-medium">{item.item}</div>
                <div className="text-theme-secondary opacity-50 text-xs">{item.category}</div>
             </div>
             <div className="flex gap-2">
                <button 
                    onClick={() => { removeItem(idx); addToShoppingList([item.item]); }}
                    className="text-[var(--accent-color)] text-[10px] font-bold uppercase border border-[var(--accent-color)]/30 px-2 py-1 rounded hover:bg-[var(--accent-color)] hover:text-white transition-colors"
                >
                    Buy More
                </button>
                <button 
                    onClick={() => removeItem(idx)}
                    className="text-theme-secondary opacity-30 hover:opacity-100 p-1"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { User, Household, Member } from '../types';
import { Users, Mail, Plus, X, UserCircle2 } from 'lucide-react';

interface HouseholdManagerProps {
  user: User;
  household: Household;
  setHousehold: React.Dispatch<React.SetStateAction<Household>>;
  onClose: () => void;
}

export const HouseholdManager: React.FC<HouseholdManagerProps> = ({ user, household, setHousehold, onClose }) => {
  const [inviteEmail, setInviteEmail] = useState('');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newMember: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name: inviteEmail.split('@')[0], // Placeholder name
      email: inviteEmail,
      role: 'Member',
      status: 'Invited'
    };

    setHousehold(prev => ({
      ...prev,
      members: [...prev.members, newMember]
    }));
    setInviteEmail('');
  };

  const removeMember = (id: string) => {
    setHousehold(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== id)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#3F1016] border border-amber-500/30 w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
        
        <div className="p-4 border-b border-red-900/50 flex justify-between items-center bg-[#2A0A10]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <h2 className="font-serif font-bold text-amber-50 text-lg">{household.name}</h2>
          </div>
          <button onClick={onClose} className="text-red-200/50 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="bg-[#2A0A10]/50 p-4 rounded-xl border border-red-900/30 mb-6">
            <h3 className="text-sm font-bold text-amber-500 uppercase mb-3">Invite Family Member</h3>
            <form onSubmit={handleInvite} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-red-900/50" />
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full bg-[#2A0A10] border border-red-900/50 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-amber-500 outline-none"
                />
              </div>
              <button 
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>
            <p className="text-xs text-red-200/40 mt-2">
              Invited members can view inventory and edit the meal schedule.
            </p>
          </div>

          <h3 className="text-sm font-bold text-amber-500 uppercase mb-3 px-1">Group Members</h3>
          <div className="space-y-2">
            {household.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between bg-[#2A0A10] p-3 rounded-lg border border-red-900/30">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    member.email === user.email ? 'bg-amber-500 text-[#2A0A10]' : 'bg-red-900/50 text-red-200'
                  }`}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      {member.name} 
                      {member.email === user.email && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 rounded">YOU</span>}
                    </div>
                    <div className="text-xs text-red-200/50">{member.role} • {member.status}</div>
                  </div>
                </div>
                {member.email !== user.email && (
                  <button 
                    onClick={() => removeMember(member.id)}
                    className="text-red-900/50 hover:text-red-400 p-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-[#2A0A10] border-t border-red-900/50 text-center">
            <p className="text-xs text-red-200/30">Changes are saved to your family group instantly.</p>
        </div>
      </div>
    </div>
  );
};
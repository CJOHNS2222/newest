import React, { useState } from 'react';
import { User, Household, Member } from '../types';
import { Users, Mail, Plus, X, UserCircle2, Send } from 'lucide-react';
import { sendHouseholdInvitation } from '../services/emailService';
import { addMemberToHousehold } from '../services/householdService';
import { db } from '../firebaseConfig';
import { doc, updateDoc, arrayUnion, deleteField } from 'firebase/firestore';

interface HouseholdManagerProps {
  user: User;
  household: Household;
  setHousehold: React.Dispatch<React.SetStateAction<Household>>;
  onClose: () => void;
}

export const HouseholdManager: React.FC<HouseholdManagerProps> = ({ user, household, setHousehold, onClose }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setInviteMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setInviteLoading(true);
    setInviteMessage(null);

    try {
      // Check if member already exists
      const memberExists = household.members.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase());
      if (memberExists) {
        setInviteMessage({ type: 'error', text: 'This member is already in your household' });
        setInviteLoading(false);
        return;
      }

      // Create new member object
      const newMember: Member = {
        id: Math.random().toString(36).substr(2, 9),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: 'Member',
        status: 'Invited',
        invitedAt: new Date().toISOString(),
        invitedBy: user.email
      };

      // Send invitation email
      const emailResult = await sendHouseholdInvitation(
        inviteEmail,
        household.name,
        user.displayName || user.email
      );

      // Save to Firebase first
      if (household.id) {
        try {
          await addMemberToHousehold(household.id, newMember);
        } catch (firestoreError) {
          console.error('Error saving to Firebase:', firestoreError);
          throw firestoreError;
        }
      }

      // Update local state after successful Firebase save
      setHousehold(prev => ({
        ...prev,
        members: [...prev.members, newMember]
      }));

      setInviteEmail('');
      setInviteMessage({
        type: 'success',
        text: emailResult.success 
          ? `Invitation sent to ${inviteEmail}` 
          : `Member added. Email delivery status: ${emailResult.message}`
      });

      // Clear message after 3 seconds
      setTimeout(() => setInviteMessage(null), 3000);
    } catch (error) {
      setInviteMessage({
        type: 'error',
        text: `Error: ${error instanceof Error ? error.message : 'Failed to send invitation'}`
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const removeMember = async (id: string) => {
    const memberToRemove = household.members.find(m => m.id === id);
    
    // Update Firebase first
    if (household.id && memberToRemove) {
      try {
        const householdRef = doc(db, 'households', household.id);
        // Remove by filtering
        const updatedMembers = household.members.filter(m => m.id !== id);
        await updateDoc(householdRef, {
          members: updatedMembers
        });
        
        // Only update local state after Firebase succeeds
        setHousehold(prev => ({
          ...prev,
          members: prev.members.filter(m => m.id !== id)
        }));
      } catch (error) {
        console.error('Error removing member from Firebase:', error);
        // Don't update local state on error - leave it as is
      }
    } else {
      // Fallback if no Firebase ID (shouldn't happen in normal flow)
      setHousehold(prev => ({
        ...prev,
        members: prev.members.filter(m => m.id !== id)
      }));
    }
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
                  disabled={inviteLoading}
                  className="w-full bg-[#2A0A10] border border-red-900/50 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-amber-500 outline-none disabled:opacity-50"
                />
              </div>
              <button 
                type="submit"
                disabled={inviteLoading}
                className="bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {inviteLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
            
            {inviteMessage && (
              <div className={`mt-3 text-xs p-2 rounded-lg ${
                inviteMessage.type === 'success' 
                  ? 'bg-green-900/30 text-green-200 border border-green-700/50'
                  : 'bg-red-900/30 text-red-200 border border-red-700/50'
              }`}>
                {inviteMessage.text}
              </div>
            )}

            <p className="text-xs text-red-200/40 mt-2">
              Invited members can view inventory and edit the meal schedule.
            </p>
          </div>

          <h3 className="text-sm font-bold text-amber-500 uppercase mb-3 px-1">Group Members</h3>
          <div className="space-y-2">
            {household.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between bg-[#2A0A10] p-3 rounded-lg border border-red-900/30">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    member.email === user.email ? 'bg-amber-500 text-[#2A0A10]' : 'bg-red-900/50 text-red-200'
                  }`}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      {member.name} 
                      {member.email === user.email && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 rounded">YOU</span>}
                      {member.role === 'Admin' && <span className="text-[10px] bg-red-900/30 text-red-300 px-1.5 rounded">ADMIN</span>}
                    </div>
                    <div className="text-xs text-red-200/50">{member.role} • {member.status}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Admin can remove other members */}
                  {user.email === household.members.find(m => m.role === 'Admin')?.email && member.email !== user.email && (
                    <button 
                      onClick={() => {
                        if (confirm(`Remove ${member.name} from household?`)) {
                          removeMember(member.id);
                        }
                      }}
                      className="text-red-900/50 hover:text-red-400 p-2 transition-colors"
                      title="Remove member"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {/* Member can leave household */}
                  {member.email === user.email && member.role !== 'Admin' && (
                    <button 
                      onClick={() => {
                        if (confirm('Leave this household? You can rejoin if invited again.')) {
                          removeMember(member.id);
                        }
                      }}
                      className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-300 px-2 py-1 rounded transition-colors"
                    >
                      Leave
                    </button>
                  )}
                </div>
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
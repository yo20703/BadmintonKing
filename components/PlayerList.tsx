import React, { useState } from 'react';
import { Player, PlayerLevel, Gender } from '../types';
import { LEVEL_COLORS, GENDER_COLORS } from '../constants';
import { Button } from './Button';
import { Plus, Trash2, PauseCircle, PlayCircle, User, GripVertical, Activity, Clock, Pencil, Check, X, Users } from 'lucide-react';

interface PlayerListProps {
  players: Player[];
  onAddPlayer: (name: string, level: PlayerLevel, gender: Gender) => void;
  onRemovePlayer: (id: string) => void;
  onUpdatePlayer: (id: string, updates: Partial<Player>) => void;
  onTogglePause: (id: string) => void;
  onCourtPlayerIds: string[];
  inQueuePlayerIds: string[];
}

export const PlayerList: React.FC<PlayerListProps> = ({ 
  players, 
  onAddPlayer, 
  onRemovePlayer, 
  onUpdatePlayer,
  onTogglePause,
  onCourtPlayerIds,
  inQueuePlayerIds
}) => {
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState<string>('8');
  const [newGender, setNewGender] = useState<Gender>('male');
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState<string>('8');
  const [editGender, setEditGender] = useState<Gender>('male');

  // Generate levels 1-18
  const allLevels = Array.from({ length: 18 }, (_, i) => (i + 1).toString());

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddPlayer(newName.trim(), newLevel as PlayerLevel, newGender);
      setNewName('');
      setNewGender('male'); // Reset to default
    }
  };

  const startEditing = (player: Player) => {
    setEditingId(player.id);
    setEditName(player.name);
    setEditLevel(player.level as string);
    setEditGender(player.gender || 'male');
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = (id: string) => {
    if (editName.trim()) {
        onUpdatePlayer(id, {
            name: editName.trim(),
            level: editLevel,
            gender: editGender
        });
        setEditingId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, player: Player) => {
    if (player.isPaused) {
        e.preventDefault();
        return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'bench',
      player: player
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isPaused !== b.isPaused) return a.isPaused ? 1 : -1;
    return a.gamesPlayed - b.gamesPlayed;
  });

  const getLevelColorClass = (levelStr: string | PlayerLevel) => {
    const level = parseInt(levelStr as string);
    if (isNaN(level)) return "bg-gray-100 text-gray-800 border-gray-200";
    if (level <= 5) return LEVEL_COLORS[PlayerLevel.BEGINNER];
    if (level <= 10) return LEVEL_COLORS[PlayerLevel.INTERMEDIATE];
    if (level <= 14) return LEVEL_COLORS[PlayerLevel.ADVANCED];
    return LEVEL_COLORS[PlayerLevel.PRO];
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full ring-1 ring-gray-900/5">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 backdrop-blur-sm">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          球員名單 <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{players.filter(p => !p.isPaused).length} / {players.length}</span>
        </h2>
      </div>

      <div className="p-3 border-b border-gray-100 bg-white">
        <form onSubmit={handleAdd} className="flex gap-2 items-center">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="新球員..."
            className="flex-1 min-w-[60px] rounded-lg border-gray-200 bg-gray-50 shadow-sm focus:bg-white focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 text-sm transition-all"
          />
          <select
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
            className="rounded-lg border-gray-200 bg-gray-50 shadow-sm focus:bg-white focus:border-blue-500 focus:ring-blue-500 border px-2 py-2 text-sm w-[65px]"
          >
            {allLevels.map((l) => (
              <option key={l} value={l}>{l} 級</option>
            ))}
          </select>
          
          {/* Gender Toggle for New Player */}
          <select
            value={newGender}
            onChange={(e) => setNewGender(e.target.value as Gender)}
            className={`rounded-lg border-gray-200 bg-gray-50 shadow-sm focus:bg-white focus:border-blue-500 focus:ring-blue-500 border px-2 py-2 text-sm w-[60px] ${
                newGender === 'male' ? 'text-blue-600' : 'text-pink-600'
            }`}
          >
            <option value="male">男</option>
            <option value="female">女</option>
          </select>

          <Button type="submit" size="sm" icon={<Plus className="w-4 h-4"/>} className="shrink-0 w-9 h-9 p-0 flex items-center justify-center" />
        </form>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
        {sortedPlayers.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm flex flex-col items-center">
            <User className="w-8 h-8 mb-2 opacity-20" />
            尚未新增球員
          </div>
        ) : (
          sortedPlayers.map((player) => {
            const isEditing = editingId === player.id;

            if (isEditing) {
                return (
                    <div key={player.id} className="p-2 rounded-xl border border-blue-200 bg-blue-50/50 shadow-sm">
                        <div className="flex gap-2 mb-2">
                            <input 
                                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                autoFocus
                            />
                             <select
                                value={editLevel}
                                onChange={(e) => setEditLevel(e.target.value)}
                                className="rounded border border-gray-300 px-1 py-1 text-sm w-[60px]"
                            >
                                {allLevels.map((l) => (
                                <option key={l} value={l}>{l} 級</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-between items-center">
                             {/* Gender Toggle in Edit Mode */}
                             <button
                                type="button"
                                onClick={() => setEditGender(prev => prev === 'male' ? 'female' : 'male')}
                                className={`px-2 py-1 rounded text-xs font-bold border transition-colors flex items-center gap-1 ${
                                    editGender === 'male' 
                                    ? 'bg-blue-100 border-blue-300 text-blue-700' 
                                    : 'bg-pink-100 border-pink-300 text-pink-700'
                                }`}
                            >
                                <User className="w-3 h-3" /> {editGender === 'male' ? '男' : '女'}
                            </button>
                            
                            <div className="flex gap-1">
                                <button onClick={() => onRemovePlayer(player.id)} className="p-1 text-red-500 hover:bg-red-100 rounded" title="刪除球員">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                                <button onClick={cancelEditing} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
                                    <X className="w-4 h-4" />
                                </button>
                                <button onClick={() => saveEditing(player.id)} className="p-1 text-green-600 hover:bg-green-100 rounded">
                                    <Check className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            }

            const colorClass = getLevelColorClass(player.level);
            const textColorClass = colorClass.split(' ')[1] || 'text-gray-600';
            const [bgClass] = colorClass.split(' ');
            
            // Use gender-specific border/ring if needed, or just avatar color
            const genderBorder = player.gender === 'female' ? 'ring-2 ring-pink-100' : '';
            
            const isOnCourt = onCourtPlayerIds.includes(player.id);
            const isInQueue = inQueuePlayerIds.includes(player.id);
            const isDraggable = !player.isPaused;
            
            return (
              <div 
                key={player.id} 
                draggable={isDraggable}
                onDragStart={(e) => handleDragStart(e, player)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all select-none group relative ${
                  player.isPaused 
                    ? 'bg-gray-50 border-gray-100 opacity-60' 
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md cursor-grab active:cursor-grabbing'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden flex-1 pr-14 relative">
                  <div className={`flex-shrink-0 transition-colors ${isDraggable ? 'text-gray-300' : 'text-gray-200'}`}>
                    <GripVertical className="w-4 h-4" />
                  </div>
                  
                  <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${bgClass} ${genderBorder} shadow-sm font-bold text-sm ${textColorClass} relative`}>
                    {player.level}
                    {isOnCourt && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div className="min-w-0 flex flex-col justify-center gap-0.5 flex-1">
                    {/* Top: Name */}
                    <div className="flex items-center gap-2 w-full">
                        <div className={`font-bold truncate leading-tight text-sm ${player.gender === 'female' ? 'text-pink-700' : 'text-gray-800'}`}>
                        {player.name}
                        </div>
                        {isOnCourt && (
                             <span className="text-[9px] bg-green-100 text-green-700 px-1.5 rounded-full font-medium shrink-0 flex items-center gap-0.5">
                                <Activity className="w-3 h-3" /> 比賽中
                             </span>
                        )}
                        {isInQueue && (
                             <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 rounded-full font-medium shrink-0 flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> 待賽中
                             </span>
                        )}
                    </div>

                    {/* Bottom: Level and Games */}
                    <div className="text-[10px] text-gray-400 leading-none flex items-center gap-2 truncate">
                      <span className="shrink-0">級數：<span className={`font-semibold ${textColorClass}`}>{player.level}</span></span>
                      <span className="w-px h-3 bg-gray-300 shrink-0"></span>
                      <span className="shrink-0">場數：<span className="font-semibold text-gray-600">{player.gamesPlayed}</span></span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-gray-100 z-10">
                  <button
                    onClick={() => onTogglePause(player.id)}
                    className={`p-1.5 rounded-md transition-colors ${
                      player.isPaused 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-amber-500 hover:bg-amber-50'
                    }`}
                    title={player.isPaused ? "恢復上場" : "暫停/休息"}
                  >
                    {player.isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => startEditing(player)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                    title="編輯"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Player } from '../types';
import { Button } from './Button';
import { X, Search, RefreshCw } from 'lucide-react';

interface PlayerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onSelect: (playerId: string) => void;
  currentPlayerId?: string; // The player being replaced
  getPlayerStatus?: (playerId: string) => string | null; // Optional: Returns status like "Court 1"
}

export const PlayerSelectModal: React.FC<PlayerSelectModalProps> = ({
  isOpen,
  onClose,
  players,
  onSelect,
  currentPlayerId,
  getPlayerStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Filter out the player currently being replaced
  const availableOptions = players.filter(p => p.id !== currentPlayerId);
  
  const filteredOptions = availableOptions.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">更換球員</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜尋球員..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {filteredOptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">找不到符合的球員</div>
          ) : (
            <div className="space-y-1">
              {filteredOptions.map(player => {
                const status = getPlayerStatus ? getPlayerStatus(player.id) : null;
                
                return (
                  <button
                    key={player.id}
                    onClick={() => onSelect(player.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors border group ${
                        status 
                        ? 'bg-yellow-50 hover:bg-yellow-100 border-yellow-100' 
                        : 'bg-white hover:bg-blue-50 border-transparent hover:border-blue-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                          status ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-100 text-gray-600 group-hover:bg-blue-200 group-hover:text-blue-800'
                      }`}>
                         {player.name.slice(0, 2)}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900 truncate">{player.name}</div>
                            {status && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-200 text-yellow-800 font-medium shrink-0 flex items-center">
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    {status}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                           {player.level} • 已打 {player.gamesPlayed} 場
                           {player.isPaused && <span className="ml-2 text-amber-500">(休息中)</span>}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded transition-colors ml-2 shrink-0 ${
                        status 
                        ? 'bg-yellow-200 text-yellow-800' 
                        : 'bg-gray-100 text-gray-600 group-hover:bg-blue-600 group-hover:text-white'
                    }`}>
                      {status ? '交換' : '選擇'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl text-right">
          <Button variant="secondary" size="sm" onClick={onClose}>取消</Button>
        </div>
      </div>
    </div>
  );
};
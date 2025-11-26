import React, { useState } from 'react';
import { Court, Player, PlayerLevel } from '../types';
import { Button } from './Button';
import { getMatchAnalysis } from '../services/geminiService';
import { LEVEL_COLORS, isPlaceholder, GENDER_COLORS } from '../constants';
import { Check, Sparkles, Trophy, Loader2, RotateCw, Trash2 } from 'lucide-react';

interface CourtDisplayProps {
  court: Court;
  availablePlayerCount: number;
  nextMatchInQueue: boolean;
  onFinishMatch: (courtId: number) => void;
  onAssignNext: (courtId: number) => void;
  onPlayerClick: (courtId: number, player: Player) => void;
  onDropPlayer: (data: any, targetCourtId: number, targetSlotIndex: number) => void;
  onClearCourt?: (courtId: number) => void;
  isFullScreen?: boolean;
}

export const CourtDisplay: React.FC<CourtDisplayProps> = ({ 
  court, 
  nextMatchInQueue,
  onFinishMatch,
  onAssignNext,
  onPlayerClick,
  onDropPlayer,
  onClearCourt,
  isFullScreen = false
}) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isDragOver, setIsDragOver] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!court.currentMatch) return;
    setIsLoadingAnalysis(true);
    setAnalysis(null);
    try {
      const result = await getMatchAnalysis(court.currentMatch);
      setAnalysis(result);
    } catch (e) {
      setAnalysis("分析比賽時發生錯誤。");
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleDragOver = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault(); 
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (isDragOver !== slotIndex) {
        setIsDragOver(slotIndex);
    }
  };

  const handleDragEnter = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(slotIndex);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we are really leaving the cell, not entering a child
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
    }
    setIsDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(null);
    try {
        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;
        
        const data = JSON.parse(dataStr);
        onDropPlayer(data, court.id, slotIndex);
    } catch (err) {
        console.error("Drop failed", err);
    }
  };

  const handleDragStart = (e: React.DragEvent, player: Player, slotIndex: number) => {
      e.stopPropagation(); // Stop propagation so the parent cell doesn't get confused
      e.dataTransfer.setData('application/json', JSON.stringify({
          type: 'court',
          player: player,
          sourceCourtId: court.id,
          sourceSlotIndex: slotIndex
      }));
  };

  const getPlayerStyle = (player: Player) => {
    // Default Level Colors fallback
    let baseStyle = LEVEL_COLORS[PlayerLevel.PRO]; // Default fallback
    const level = parseInt(player.level as string);
    
    if (!isNaN(level)) {
       if (level <= 5) baseStyle = LEVEL_COLORS[PlayerLevel.BEGINNER];
       else if (level <= 10) baseStyle = LEVEL_COLORS[PlayerLevel.INTERMEDIATE];
       else if (level <= 14) baseStyle = LEVEL_COLORS[PlayerLevel.ADVANCED];
    }

    // Gender Override if present
    if (player.gender) {
        if (player.gender === 'female') return GENDER_COLORS.FEMALE;
        if (player.gender === 'male') return GENDER_COLORS.MALE;
    }
    
    return baseStyle;
  };

  const renderCourtPlayer = (player: Player | undefined, slotIndex: number, label: string) => {
    const isOver = isDragOver === slotIndex;
    
    // For actual players, we keep the card size consistent
    const cardStyle = isFullScreen 
        ? { width: '20vh', height: '14vh' } 
        : { width: '100%', height: '100%' }; // Let grid control size

    const nameSize = isFullScreen ? '2.8vh' : '0.85rem';
    const levelSize = isFullScreen ? '1.8vh' : '0.6rem';
    const gameSize = isFullScreen ? '1.8vh' : '0.6rem';

    // Render placeholder or empty slot visual
    if (!player || isPlaceholder(player)) {
       return (
         <div 
            className={`w-full h-full rounded-xl border-2 transition-all duration-200 flex items-center justify-center relative pointer-events-none ${
                isOver 
                    ? 'bg-white/40 border-yellow-400 shadow-lg scale-105' 
                    : 'bg-slate-500/10 border-dashed border-white/40'
            }`}
            style={{ minHeight: isFullScreen ? '14vh' : '3.5rem' }}
         >
             <div className="flex flex-col items-center">
                 <span className={`font-bold transition-colors ${isOver ? 'text-yellow-200' : 'text-white/40'}`} style={{ fontSize: isFullScreen ? '2.5vh' : '0.75rem' }}>
                     {isOver ? "放開加入" : "空位"}
                 </span>
                 {!isOver && (
                     <span className="text-white/30 text-[9px] mt-0.5" style={{ fontSize: isFullScreen ? '1.5vh' : '9px' }}>
                         (拖曳加入)
                     </span>
                 )}
             </div>
         </div>
       );
    }

    const colorClass = getPlayerStyle(player);
    
    return (
      <div 
        className={`relative flex flex-col items-center justify-between py-0.5 px-1 rounded-xl shadow-md border-2 border-white/90 transition-all duration-200 cursor-grab active:cursor-grabbing group overflow-hidden ${colorClass} ${isOver ? 'scale-105 ring-4 ring-yellow-400 z-30' : 'hover:shadow-lg z-20'}`}
        style={cardStyle}
        draggable
        onDragStart={(e) => handleDragStart(e, player, slotIndex)}
        onClick={(e) => { e.stopPropagation(); onPlayerClick(court.id, player); }}
      >
        <div className="w-full text-center leading-none opacity-80 truncate px-0.5 pointer-events-none" style={{ fontSize: levelSize }}>
           級數：<span className="font-bold pointer-events-none">{player.level}</span>
        </div>
        <div className="font-bold w-full text-center truncate px-0.5 flex-1 flex items-center justify-center leading-tight pointer-events-none" style={{ fontSize: nameSize }}>
           {player.name}
        </div>
        <div className="w-full text-center leading-none opacity-80 truncate px-0.5 pb-0.5 pointer-events-none" style={{ fontSize: gameSize }}>
           場數：<span className="font-bold pointer-events-none">{player.gamesPlayed}</span>
        </div>
        <div className={`absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}>
             <RotateCw className={`text-current opacity-40 ${isFullScreen ? "w-4 h-4" : "w-2.5 h-2.5"}`} />
        </div>
      </div>
    );
  };

  // Helper for rendering a drop zone cell
  const renderZone = (player: Player | undefined, slotIndex: number, label: string, borderClass: string) => (
      <div 
        className={`p-1 flex items-center justify-center relative transition-colors ${borderClass} ${isDragOver === slotIndex ? 'bg-white/10' : ''}`}
        onDragOver={(e) => handleDragOver(e, slotIndex)}
        onDragEnter={(e) => handleDragEnter(e, slotIndex)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, slotIndex)}
      >
         {renderCourtPlayer(player, slotIndex, label)}
      </div>
  );
  
  // Calculate if the match is full (4 real players)
  const realPlayersCount = court.currentMatch 
    ? [
        court.currentMatch.teamA.player1,
        court.currentMatch.teamA.player2,
        court.currentMatch.teamB.player1,
        court.currentMatch.teamB.player2
      ].filter(p => !isPlaceholder(p)).length
    : 0;
  
  const isMatchFull = realPlayersCount === 4;

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col relative ring-1 ring-gray-900/5 transition-all ${isFullScreen ? 'h-full shadow-2xl ring-4 ring-blue-500/20' : 'h-full'}`}>
      {/* Header */}
      <div className={`bg-white border-b border-gray-100 flex justify-between items-center z-10 relative flex-none ${isFullScreen ? 'p-3' : 'p-2'}`}>
        <div className="flex items-center gap-2">
            <div className={`${isFullScreen ? 'w-4 h-4' : 'w-2.5 h-2.5'} rounded-full ${court.currentMatch ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
            <h3 className={`font-bold text-gray-800 ${isFullScreen ? 'text-xl' : 'text-sm'}`}>{court.name}</h3>
        </div>
        
        {court.currentMatch ? (
            <div className="flex gap-2 items-center">
                {!isFullScreen && !analysis && isMatchFull && (
                    <button 
                        onClick={handleAnalyze}
                        disabled={isLoadingAnalysis}
                        className="text-[10px] flex items-center text-indigo-600 font-medium hover:bg-indigo-50 px-2 py-0.5 rounded-full transition-colors mr-1"
                    >
                        {isLoadingAnalysis ? <Loader2 className="w-2.5 h-2.5 animate-spin mr-1"/> : <Sparkles className="w-2.5 h-2.5 mr-1" />}
                        AI
                    </button>
                )}
                
                {/* Clear Button - Always Visible when match exists */}
                <Button 
                    variant="secondary"
                    size={isFullScreen ? "lg" : "sm"}
                    className={`${isFullScreen ? "text-base py-1 px-4" : "py-0 px-2 text-[10px] h-6"} text-red-600 bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300`}
                    onClick={() => onClearCourt && onClearCourt(court.id)}
                    icon={<Trash2 className={isFullScreen ? "w-4 h-4" : "w-2.5 h-2.5"} />}
                >
                    清空
                </Button>

                {isMatchFull && (
                    <Button 
                        variant="danger"
                        size={isFullScreen ? "lg" : "sm"}
                        className={isFullScreen ? "text-base py-1 px-4" : "py-0 px-2 text-[10px] h-6"}
                        onClick={() => onFinishMatch(court.id)}
                    >
                        比賽結束
                    </Button>
                )}
            </div>
        ) : (
             <Button 
                onClick={() => onAssignNext(court.id)} 
                disabled={!nextMatchInQueue}
                size="sm"
                className="py-0 px-2 text-[10px] h-6"
                icon={nextMatchInQueue ? <Check className="w-2.5 h-2.5" /> : undefined}
             >
                {nextMatchInQueue ? "安排下一場" : "等待賽程"}
             </Button>
        )}
      </div>

      {/* Court Visuals - ALWAYS RENDERED */}
      <div className={`relative flex-1 min-h-0 bg-slate-50 flex items-center justify-center overflow-hidden ${isFullScreen ? 'p-4 bg-slate-100' : 'p-2 min-h-[200px]'}`}>
           
           <div className={`relative h-full w-auto aspect-[6.1/7] bg-emerald-600 rounded-lg shadow-inner border-[3px] border-white/90 select-none max-w-full object-contain mx-auto`}>
              
              {/* Court Markings - Z-0 */}
              <div className="absolute inset-[5%] border border-white/60 opacity-80 pointer-events-none z-0"></div>
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40 pointer-events-none z-0"></div>
              
              {/* The Net - Z-0 */}
              <div className="absolute top-1/2 left-[-2%] right-[-2%] h-1 bg-white/90 transform -translate-y-1/2 shadow-sm z-0 flex items-center justify-center pointer-events-none">
                 <div className="w-full h-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjwqoAbECkIcIP68qgAAwASpAsR029jMwAAAABJRU5ErkJggg==')] opacity-50"></div>
                 <div className="bg-white text-emerald-700 font-bold px-2 py-0.5 rounded-full shadow-sm absolute z-10 border border-emerald-500" style={isFullScreen ? { fontSize: '1.5vh' } : { fontSize: '8px', padding: '0 4px' }}>
                    NET
                 </div>
              </div>

              <div className="absolute top-[5%] bottom-[5%] left-1/2 w-0.5 bg-white/60 transform -translate-x-1/2 pointer-events-none z-0"></div>

              {/* Player Zones - Z-10 Container */}
              <div className="absolute inset-0 grid grid-rows-2 z-10">
                  {/* Top Half (Team B) */}
                  <div className="grid grid-cols-2">
                       {renderZone(court.currentMatch?.teamB?.player1, 2, "B1", "border-r border-transparent")}
                       {renderZone(court.currentMatch?.teamB?.player2, 3, "B2", "")}
                  </div>

                  {/* Bottom Half (Team A) */}
                  <div className="grid grid-cols-2">
                       {renderZone(court.currentMatch?.teamA?.player1, 0, "A1", "border-r border-transparent")}
                       {renderZone(court.currentMatch?.teamA?.player2, 1, "A2", "")}
                  </div>
              </div>
           </div>
      </div>
      
      {!isFullScreen && analysis && (
        <div className="bg-indigo-50 p-2 border-t border-indigo-100 text-[10px] text-indigo-900 animate-slideUp max-h-24 overflow-y-auto">
           <div className="font-bold flex items-center gap-1 mb-0.5 text-indigo-700">
             <Sparkles className="w-2.5 h-2.5" /> AI 戰術分析
           </div>
           {analysis}
        </div>
      )}
    </div>
  );
};
import { PlayerLevel, Player } from "./types";
import { User, Shield, Zap, Crown } from "lucide-react";

export const DEFAULT_COURT_COUNT = 2;

export const LEVEL_COLORS = {
  [PlayerLevel.BEGINNER]: "bg-green-100 text-green-800 border-green-200",
  [PlayerLevel.INTERMEDIATE]: "bg-blue-100 text-blue-800 border-blue-200",
  [PlayerLevel.ADVANCED]: "bg-purple-100 text-purple-800 border-purple-200",
  [PlayerLevel.PRO]: "bg-orange-100 text-orange-800 border-orange-200",
};

// New Gender Colors Constant
export const GENDER_COLORS = {
  MALE: "bg-blue-50 border-blue-200 text-blue-800",
  FEMALE: "bg-pink-50 border-pink-200 text-pink-800"
};

export const LEVEL_ICONS = {
  [PlayerLevel.BEGINNER]: User,
  [PlayerLevel.INTERMEDIATE]: Shield,
  [PlayerLevel.ADVANCED]: Zap,
  [PlayerLevel.PRO]: Crown,
};

export const PLACEHOLDER_PLAYER: Player = {
  id: 'placeholder',
  name: '空缺',
  level: '0',
  gamesPlayed: 0,
  isPaused: false,
  isPlaceholder: true,
  gender: 'male'
};

export const isPlaceholder = (p: Player | undefined): boolean => {
  return !p || p.id === 'placeholder' || !!p.isPlaceholder;
};
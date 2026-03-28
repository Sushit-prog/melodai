import { Users } from 'lucide-react';

export const PresenceAvatars = ({ presence = [], maxVisible = 5 }) => {
  if (presence.length === 0) return null;

  const visibleUsers = presence.slice(0, maxVisible);
  const overflowCount = presence.length - maxVisible;

  return (
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-zinc-400" />
      <span className="text-sm text-zinc-400">
        {presence.length} {presence.length === 1 ? 'listener' : 'listeners'}
      </span>
      
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <div
            key={user.socketId || user.userId}
            className="relative"
            title={user.username}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-7 h-7 rounded-full border-2 border-zinc-900"
              />
            ) : (
              <div className="w-7 h-7 bg-purple-600 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {user.username?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-zinc-900" />
          </div>
        ))}
        
        {overflowCount > 0 && (
          <div className="w-7 h-7 bg-zinc-700 rounded-full border-2 border-zinc-900 flex items-center justify-center">
            <span className="text-zinc-300 text-xs font-medium">
              +{overflowCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresenceAvatars;

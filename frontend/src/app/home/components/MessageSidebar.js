'use client'

export default function MessageSidebar({ chatUsers, showMessages, setShowMessages, openChat }) {
  return (
    <div
      className={`fixed top-0 left-0 h-full w-72 bg-gray-900 shadow-lg transform transition-transform duration-300 z-40 ${showMessages ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-400">📨 Messages</h2>
        <button
          onClick={() => setShowMessages(false)}
          className="text-gray-400 hover:text-white"
        >
          ✖
        </button>
      </div>

      <div className="overflow-y-auto max-h-[calc(100%-56px)]">
        {chatUsers.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-800 p-2 rounded-md"
            onClick={() => openChat(u)}
          >
            <img src={u.avatar || '/avatar.png'} className="w-8 h-8 rounded-full" alt="avatar" />
            <span className="text-sm font-medium text-white">{u.full_name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

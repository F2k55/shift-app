export default function Home() {
  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-2">シフト管理アプリ</h1>
      <p className="text-gray-500 mb-10">ログインしてください</p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <a href="/login/owner" className="bg-blue-600 text-white text-center py-4 rounded-xl text-lg font-semibold">
          🏪 店舗側
        </a>
        <a href="/login/staff" className="bg-green-500 text-white text-center py-4 rounded-xl text-lg font-semibold">
          👤 スタッフ側
        </a>
      </div>
    </div>
  )
}
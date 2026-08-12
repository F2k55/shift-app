'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function ManageManual() {
  const router = useRouter()
  const [storeId, setStoreId] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [manuals, setManuals] = useState<any[]>([])
  const [openCategories, setOpenCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [newManualTitle, setNewManualTitle] = useState('')
  const [newManualContent, setNewManualContent] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [showAddManual, setShowAddManual] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedManual, setSelectedManual] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: owner } = await supabase
      .from('owners')
      .select('store_id')
      .eq('user_id', user.id)
      .single()

    if (!owner) return
    setStoreId(owner.store_id)

    const { data: categoriesData } = await supabase
      .from('manual_categories')
      .select('*')
      .eq('store_id', owner.store_id)
      .order('created_at')

    if (categoriesData) setCategories(categoriesData)

    const { data: manualsData } = await supabase
      .from('manuals')
      .select('*')
      .eq('store_id', owner.store_id)
      .order('created_at')

    if (manualsData) setManuals(manualsData)
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return
    const supabase = createClient()
    await supabase.from('manual_categories').insert({ store_id: storeId, name: newCategory })
    setNewCategory('')
    fetchData()
  }

  const handleDeleteCategory = async (categoryId: string) => {
    const supabase = createClient()
    await supabase.from('manuals').delete().eq('category_id', categoryId)
    await supabase.from('manual_categories').delete().eq('id', categoryId)
    fetchData()
  }

  const handleUploadFile = async (file: File) => {
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${storeId}/${Date.now()}.${fileExt}`
    const { data: uploadData, error } = await supabase.storage
      .from('manuals')
      .upload(fileName, file)

    if (error || !uploadData) return null

    const { data: urlData } = supabase.storage
      .from('manuals')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  }

  const isImage = (url: string) => {
    return url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  }

  const handleAddManual = async () => {
    if (!newManualTitle.trim() || !selectedCategoryId) return
    setLoading(true)
    const supabase = createClient()

    let fileUrl = null
    if (uploadFile) {
      setUploading(true)
      fileUrl = await handleUploadFile(uploadFile)
      setUploading(false)
    }

    await supabase.from('manuals').insert({
      store_id: storeId,
      category_id: selectedCategoryId,
      title: newManualTitle,
      content: newManualContent,
      file_url: fileUrl,
    })

    setNewManualTitle('')
    setNewManualContent('')
    setUploadFile(null)
    setShowAddManual(false)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    fetchData()
  }

  const handleDeleteManual = async (manualId: string) => {
    const supabase = createClient()
    await supabase.from('manuals').delete().eq('id', manualId)
    setSelectedManual(null)
    fetchData()
  }

  const handleEditManual = async () => {
    if (!editTitle.trim()) return
    setLoading(true)
    const supabase = createClient()

    let fileUrl = selectedManual.file_url
    if (uploadFile) {
      setUploading(true)
      fileUrl = await handleUploadFile(uploadFile)
      setUploading(false)
    }

    await supabase
      .from('manuals')
      .update({ title: editTitle, content: editContent, file_url: fileUrl })
      .eq('id', selectedManual.id)

    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setEditMode(false)
    setUploadFile(null)
    setSelectedManual({ ...selectedManual, title: editTitle, content: editContent, file_url: fileUrl })
    fetchData()
  }

  const toggleCategory = (categoryId: string) => {
    if (openCategories.includes(categoryId)) {
      setOpenCategories(openCategories.filter(id => id !== categoryId))
    } else {
      setOpenCategories([...openCategories, categoryId])
    }
  }

  const getManualsForCategory = (categoryId: string) => {
    return manuals.filter(m => m.category_id === categoryId)
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="bg-white shadow-sm px-4 md:px-8 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/manage/dashboard')} className="text-gray-400 text-xl">←</button>
        <h1 className="text-xl md:text-2xl font-bold">📚 マニュアル管理</h1>
      </div>

      <div className="p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">

          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-medium text-gray-500 mb-4">マニュアル一覧</h2>

              {categories.length === 0 && (
                <p className="text-gray-400 text-center py-8">まだカテゴリがありません</p>
              )}

              <div className="flex flex-col gap-3">
                {categories.map((cat: any) => (
                  <div key={cat.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div
                      className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-blue-50"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">
                          {openCategories.includes(cat.id) ? 'v' : '>'}
                        </span>
                        <p className="font-semibold">{cat.name}</p>
                        <span className="text-sm text-gray-400">({getManualsForCategory(cat.id).length}件)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCategoryId(cat.id)
                            setShowAddManual(true)
                            setSelectedManual(null)
                            setEditMode(false)
                            setUploadFile(null)
                          }}
                          className="text-blue-500 border border-blue-200 px-2 py-1 rounded-lg text-sm"
                        >
                          +追加
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCategory(cat.id)
                          }}
                          className="text-red-400 text-sm"
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    {openCategories.includes(cat.id) && (
                      <div className="flex flex-col">
                        {getManualsForCategory(cat.id).length === 0 && (
                          <p className="text-sm text-gray-400 px-4 py-3">まだマニュアルがありません</p>
                        )}
                        {getManualsForCategory(cat.id).map((manual: any) => (
                          <div
                            key={manual.id}
                            onClick={() => {
                              setSelectedManual(manual)
                              setShowAddManual(false)
                              setEditMode(false)
                              setUploadFile(null)
                            }}
                            className={`flex items-center justify-between px-4 py-3 border-t border-gray-100 cursor-pointer hover:bg-blue-50 ${selectedManual?.id === manual.id ? 'bg-blue-50' : ''}`}
                          >
                            <div className="flex items-center gap-2">
                              <p>{manual.title}</p>
                              {manual.file_url && isImage(manual.file_url) && (
                                <span className="text-sm text-green-500">📷</span>
                              )}
                              {manual.file_url && !isImage(manual.file_url) && (
                                <span className="text-sm text-red-400">📄</span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteManual(manual.id)
                              }}
                              className="text-sm text-red-400"
                            >
                              削除
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 mt-6">
                <input
                  type="text"
                  placeholder="新しいカテゴリ名"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                />
                <button
                  onClick={handleAddCategory}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold"
                >
                  追加
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            {showAddManual ? (
              <div className="flex flex-col gap-4">
                <h2 className="font-medium text-gray-500">マニュアルを追加</h2>
                <div>
                  <p className="text-sm text-gray-400 mb-2">タイトル</p>
                  <input
                    type="text"
                    placeholder="例：オープン作業手順"
                    value={newManualTitle}
                    onChange={(e) => setNewManualTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">内容</p>
                  <textarea
                    placeholder="マニュアルの内容を入力してください"
                    value={newManualContent}
                    onChange={(e) => setNewManualContent(e.target.value)}
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 resize-none"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">画像・PDFファイル（任意）</p>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    ref={fileInputRef}
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border border-dashed border-gray-300 rounded-lg px-4 py-3 text-gray-400 hover:bg-gray-50"
                  >
                    {uploadFile ? uploadFile.name : '📷 画像 / 📄 PDFをアップロード'}
                  </button>
                  {uploadFile && uploadFile.type.startsWith('image/') && (
                    <img
                      src={URL.createObjectURL(uploadFile)}
                      alt="preview"
                      className="mt-2 w-full rounded-lg object-contain"
                    />
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowAddManual(false); setUploadFile(null) }}
                    className="flex-1 border border-gray-300 text-gray-500 py-3 rounded-xl"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddManual}
                    disabled={loading || uploading || !newManualTitle.trim()}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                  >
                    {uploading ? 'アップロード中...' : loading ? '追加中...' : '追加する'}
                  </button>
                </div>
              </div>
            ) : selectedManual ? (
              <div>
                {editMode ? (
                  <div className="flex flex-col gap-4">
                    <h2 className="font-medium text-gray-500">編集</h2>
                    <div>
                      <p className="text-sm text-gray-400 mb-2">タイトル</p>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-2">内容</p>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={5}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 resize-none"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-2">画像・PDFファイル（任意）</p>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        ref={editFileInputRef}
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <button
                        onClick={() => editFileInputRef.current?.click()}
                        className="w-full border border-dashed border-gray-300 rounded-lg px-4 py-3 text-gray-400 hover:bg-gray-50"
                      >
                        {uploadFile ? uploadFile.name : selectedManual.file_url ? 'ファイルを変更する' : '📷 画像 / 📄 PDFをアップロード'}
                      </button>
                      {uploadFile && uploadFile.type.startsWith('image/') && (
                        <img
                          src={URL.createObjectURL(uploadFile)}
                          alt="preview"
                          className="mt-2 w-full rounded-lg object-contain"
                        />
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setEditMode(false); setUploadFile(null) }}
                        className="flex-1 border border-gray-300 text-gray-500 py-3 rounded-xl"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleEditManual}
                        disabled={loading || uploading}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                      >
                        {uploading ? 'アップロード中...' : saved ? '保存しました！' : loading ? '保存中...' : '保存する'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-medium text-gray-500">マニュアル詳細</h2>
                      <button
                        onClick={() => {
                          setEditMode(true)
                          setEditTitle(selectedManual.title)
                          setEditContent(selectedManual.content || '')
                        }}
                        className="text-blue-500 border border-blue-200 px-3 py-1 rounded-lg"
                      >
                        編集
                      </button>
                    </div>
                    <p className="text-xl font-bold mb-4">{selectedManual.title}</p>
                    {selectedManual.content && (
                      <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedManual.content}</p>
                      </div>
                    )}
                    {selectedManual.file_url && isImage(selectedManual.file_url) && (
                      <img
                        src={selectedManual.file_url}
                        alt={selectedManual.title}
                        className="w-full rounded-xl object-contain mb-3"
                      />
                    )}
                    {selectedManual.file_url && !isImage(selectedManual.file_url) && (
                      
                        href={selectedManual.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 font-semibold"
                      >
                        📄 PDFを開く
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-center min-h-40">
                左からマニュアルを選択するか<br />カテゴリの+追加を押してください
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
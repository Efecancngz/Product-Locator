import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Search, Store, List, Map as MapIcon, Loader2, Sparkles, Bell, BellOff, Trash2, X, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProductSearch } from '@/hooks/useProductSearch'
import { StoreMap } from '@/components/map/StoreMap'
import { LocationSelector } from '@/components/filters/LocationSelector'
import { CategoryFilter, StoreCategory } from '@/components/filters/CategoryFilter'
import { ProductListWithPagination } from '@/components/ProductListWithPagination'
import { AdminDashboard } from '@/components/AdminDashboard'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/api/client'

const queryClient = new QueryClient()

// Typing effect placeholder texts
const PLACEHOLDER_TEXTS = [
  'iPhone 15 Pro',
  'Dyson V15 Detect',
  'Nike Air Max',
  'Samsung Galaxy S24',
  'PlayStation 5',
  'MacBook Air M3',
]

function SearchApp() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchId, setSearchId] = useState(0)
  const [currentSearchQuery, setCurrentSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory>('all')
  const [placeholderText, setPlaceholderText] = useState('')

  const [watchlist, setWatchlist] = useState<any[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanMessage, setScanMessage] = useState<string | null>(null)

  // Load watchlist on mount
  useEffect(() => {
    // Initial load from localStorage for instant display
    const local = localStorage.getItem('watchlist')
    if (local) {
      try {
        setWatchlist(JSON.parse(local))
      } catch (e) {
        console.error(e)
      }
    }

    const fetchWatchlist = async () => {
      try {
        const { data } = await apiClient.get('/watchlist')
        if (data && data.items) {
          setWatchlist(data.items)
          localStorage.setItem('watchlist', JSON.stringify(data.items))
        }
      } catch (err) {
        console.error('Failed to sync watchlist with server', err)
      }
    }
    fetchWatchlist()
  }, [])

  const onToggleFollow = async (product: any) => {
    const isFollowed = watchlist.some(
      item =>
        item.product_name === product.product_name &&
        item.store_name === product.store_location.store_name &&
        item.city === product.store_location.city &&
        (item.branch || '') === (product.store_location.branch || '')
    )

    if (isFollowed) {
      // Find the item to unfollow
      const itemToUnfollow = watchlist.find(
        item =>
          item.product_name === product.product_name &&
          item.store_name === product.store_location.store_name &&
          item.city === product.store_location.city &&
          (item.branch || '') === (product.store_location.branch || '')
      )
      if (itemToUnfollow) {
        // Optimistic UI update
        const updatedWatchlist = watchlist.filter(item => item.id !== itemToUnfollow.id)
        setWatchlist(updatedWatchlist)
        localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist))

        try {
          await apiClient.delete(`/watchlist/${itemToUnfollow.id}`)
        } catch (err) {
          console.error('Failed to delete watchlist item on backend', err)
        }
      }
    } else {
      // Create new watchlist item
      const newWatchlistItemPayload = {
        product_name: product.product_name,
        category: selectedCategory || 'all',
        city: product.store_location.city || selectedCity || 'Unknown',
        district: product.store_location.district || selectedDistrict || null,
        store_name: product.store_location.store_name,
        branch: product.store_location.branch || null,
        price: product.price,
        currency: product.currency || 'TRY',
        source_url: product.source_url || 'http://placeholder.com',
        notifications_enabled: true
      }

      // Optimistic UI update
      const tempId = `temp-${Date.now()}`
      const tempItem = {
        id: tempId,
        user_id: 'dev-user',
        ...newWatchlistItemPayload,
        last_stock_status: product.stock_status || 'UNKNOWN',
        last_price: product.price,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      const updatedWatchlist = [...watchlist, tempItem]
      setWatchlist(updatedWatchlist)
      localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist))

      try {
        const { data } = await apiClient.post('/watchlist', newWatchlistItemPayload)
        setWatchlist(prev => {
          const replaced = prev.map(item => item.id === tempId ? data : item);
          localStorage.setItem('watchlist', JSON.stringify(replaced));
          return replaced;
        })
      } catch (err) {
        console.error('Failed to add watchlist item to backend', err)
        // Revert state
        const reverted = watchlist.filter(item => item.id !== tempId)
        setWatchlist(reverted)
        localStorage.setItem('watchlist', JSON.stringify(reverted))
      }
    }
  }

  const handleUnfollowById = async (itemId: string) => {
    // Optimistic UI update
    const updatedWatchlist = watchlist.filter(item => item.id !== itemId)
    setWatchlist(updatedWatchlist)
    localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist))

    try {
      await apiClient.delete(`/watchlist/${itemId}`)
    } catch (err) {
      console.error('Failed to delete watchlist item on backend', err)
    }
  }

  const handleToggleNotifications = async (itemId: string, currentStatus: boolean) => {
    // Optimistic UI update
    const updatedWatchlist = watchlist.map(item =>
      item.id === itemId ? { ...item, notifications_enabled: !currentStatus } : item
    )
    setWatchlist(updatedWatchlist)
    localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist))

    try {
      await apiClient.patch(`/watchlist/${itemId}/toggle`, null, {
        params: { enabled: !currentStatus }
      })
    } catch (err) {
      console.error('Failed to toggle notifications on backend', err)
      // Revert state
      const reverted = watchlist.map(item =>
        item.id === itemId ? { ...item, notifications_enabled: currentStatus } : item
      )
      setWatchlist(reverted)
      localStorage.setItem('watchlist', JSON.stringify(reverted))
    }
  }

  const handleRunScanCheck = async () => {
    setIsScanning(true)
    setScanMessage(null)
    try {
      await apiClient.post('/watchlist/check')
      // Refetch watchlist to see updated values (e.g. stock/price checks)
      const { data: updatedData } = await apiClient.get('/watchlist')
      if (updatedData && updatedData.items) {
        setWatchlist(updatedData.items)
        localStorage.setItem('watchlist', JSON.stringify(updatedData.items))
      }
      setScanMessage('Denetleme tamamlandı! Değişimler algılandıysa bildirimler tetiklendi.')
    } catch (err) {
      console.error('Scan check failed', err)
      setScanMessage('Denetleme sırasında bir hata oluştu.')
    } finally {
      setIsScanning(false)
      // Hide message after 5 seconds
      setTimeout(() => setScanMessage(null), 5000)
    }
  }

  const { data, isLoading, isError } = useProductSearch(
    searchId,
    currentSearchQuery,
    selectedCity,
    selectedDistrict,
    selectedCategory
  )

  // Typing effect for placeholder
  useEffect(() => {
    let textIdx = 0
    let charIdx = 0
    let isDeleting = false
    let timeout: ReturnType<typeof setTimeout>

    const type = () => {
      const current = PLACEHOLDER_TEXTS[textIdx]

      if (!isDeleting) {
        setPlaceholderText(current.substring(0, charIdx + 1))
        charIdx++
        if (charIdx === current.length) {
          timeout = setTimeout(() => { isDeleting = true; type() }, 2000)
          return
        }
        timeout = setTimeout(type, 80)
      } else {
        setPlaceholderText(current.substring(0, charIdx))
        charIdx--
        if (charIdx === 0) {
          isDeleting = false
          textIdx = (textIdx + 1) % PLACEHOLDER_TEXTS.length
          timeout = setTimeout(type, 400)
          return
        }
        timeout = setTimeout(type, 40)
      }
    }

    type()
    return () => clearTimeout(timeout)
  }, [])

  const handleSearch = () => {
    if (searchQuery.trim().length > 2) {
      setCurrentSearchQuery(searchQuery)
      setSearchId(prev => prev + 1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleReset = () => {
    setSearchId(0)
    setSearchQuery('')
    setCurrentSearchQuery('')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">

      {/* Animated grid background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: searchId > 0 ? 0.25 : 1 }}
        transition={{ duration: 1.0, ease: 'easeInOut' }}
        className="fixed inset-0 grid-bg grid-bg-fade gradient-mesh pointer-events-none z-0"
      />

      {/* Navbar */}
      <header className="glass-strong z-50 sticky top-0">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 font-bold text-xl cursor-pointer group"
            onClick={handleReset}
          >
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="tracking-tight">Product Locator</span>
          </div>

          <nav className="flex gap-3 items-center">
            {data && (
              <div className="flex glass rounded-lg p-1 gap-1">
                <Button
                  variant={viewMode === 'map' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                  className={`h-8 text-xs ${viewMode === 'map' ? 'gradient-primary text-white shadow-md' : ''}`}
                >
                  <MapIcon className="w-3.5 h-3.5 mr-1.5" /> Harita
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-8 text-xs ${viewMode === 'list' ? 'gradient-primary text-white shadow-md' : ''}`}
                >
                  <List className="w-3.5 h-3.5 mr-1.5" /> Liste
                </Button>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDrawerOpen(true)}
              className="h-8 text-xs glass border-amber-500/30 hover:border-amber-500/60 text-amber-400 hover:text-amber-400 transition-all duration-300 font-semibold relative"
            >
              <Star className="w-3.5 h-3.5 mr-1.5 text-amber-400 fill-amber-400" />
              Takip Listem
              {watchlist.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-background">
                  {watchlist.length}
                </span>
              )}
            </Button>

            <Link to="/admin">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs glass border-primary/30 hover:border-primary/60 text-primary hover:text-primary transition-all duration-300 font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary animate-pulse" /> Admin Panel
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10">

        {/* Search Overlay */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className={`z-20 w-full flex flex-col items-center pointer-events-none absolute left-0 right-0
            ${searchId > 0 ? 'top-4 translate-y-0' : 'top-1/2 -translate-y-1/2'}
          `}
        >
          <div className="pointer-events-auto w-full max-w-3xl px-4 flex flex-col items-center gap-6">

            {/* Hero Text */}
            <AnimatePresence>
              {searchId === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.4 }}
                  className="text-center space-y-5 mb-2 w-full"
                >
                  <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
                    Aradığın ürünü{' '}
                    <br />
                    <span className="gradient-text">şehrinde bul.</span>
                  </h1>
                  <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto">
                    25+ mağazanın stokunu tarıyoruz,
                    <br className="hidden md:block" />{' '}
                    en yakın mağazayı haritada gösteriyoruz.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Bar */}
            <motion.div
              layout
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: searchId > 0 ? 0.92 : 1 }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              className="w-full max-w-4xl glass-strong rounded-2xl shadow-xl glow-primary flex flex-col md:flex-row gap-2 p-2 pointer-events-auto"
            >
              <div className="flex-1 flex gap-2 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder={placeholderText ? `${placeholderText}|` : 'Ürün ara...'}
                    className="pl-11 h-12 text-lg border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent placeholder:text-muted-foreground/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto flex-wrap">
                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  className="flex-1 md:flex-none"
                />
                <LocationSelector
                  selectedCity={selectedCity}
                  selectedDistrict={selectedDistrict}
                  onCityChange={setSelectedCity}
                  onDistrictChange={setSelectedDistrict}
                  className="flex-1 md:flex-none"
                />
                <Button
                  size="lg"
                  className="h-12 px-8 text-base gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={handleSearch}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Bul
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Results Area */}
        <AnimatePresence>
          {searchId > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex-1 w-full pt-28 px-4 pb-4 container mx-auto"
              style={{ minHeight: '500px' }}
            >
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    {/* Radar loading animation */}
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full gradient-primary opacity-20 animate-ping" />
                      <div className="absolute inset-2 rounded-full gradient-primary opacity-30 animate-ping" style={{ animationDelay: '0.3s' }} />
                      <div className="absolute inset-4 rounded-full gradient-primary opacity-60 flex items-center justify-center">
                        <Search className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <p className="text-muted-foreground text-lg font-medium">Mağazalar taranıyor...</p>
                    <p className="text-muted-foreground/60 text-sm mt-2">Bu işlem 30-120 saniye sürebilir</p>
                  </div>
                </div>
              ) : isError ? (
                <div className="w-full h-full flex items-center justify-center text-destructive min-h-[400px]">
                  <div className="text-center glass-strong rounded-2xl p-8">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">⚠️</span>
                    </div>
                    <p className="text-lg font-semibold mb-2">Bir hata oluştu</p>
                    <p className="text-muted-foreground text-sm">Lütfen tekrar deneyin.</p>
                  </div>
                </div>
              ) : (
                <div
                  className="w-full glass-strong rounded-2xl overflow-hidden shadow-xl relative"
                  style={{ minHeight: viewMode === 'map' ? '500px' : 'auto' }}
                >
                  {viewMode === 'map' ? (
                    <div style={{ height: '500px', width: '100%' }}>
                      <StoreMap products={data?.found_products || []} />
                    </div>
                  ) : (
                    <ProductListWithPagination
                      products={data?.found_products || []}
                      totalFound={data?.total_found || 0}
                      watchlist={watchlist}
                      onToggleFollow={onToggleFollow}
                    />
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      {searchId === 0 && (
        <footer className="py-6 text-center text-sm text-muted-foreground/50 relative z-10">
          © 2026 Product Locator — Tüm stoklar, tek tıkla.
        </footer>
      )}

      {/* Watchlist sliding drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-card/95 backdrop-blur-md border-l border-border/50 shadow-2xl z-[101] flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <h2 className="text-xl font-bold tracking-tight">Takip Listem</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {watchlist.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-full p-0 flex items-center justify-center hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {scanMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3.5 rounded-xl text-xs font-semibold bg-primary/10 border border-primary/25 text-primary-foreground/90 text-center"
                  >
                    {scanMessage}
                  </motion.div>
                )}

                {watchlist.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Star className="w-8 h-8" />
                    </div>
                    <div className="space-y-1 max-w-xs">
                      <p className="font-semibold text-foreground">Takip listeniz boş</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Arama sonuçlarında beğendiğiniz ürünlerin yanındaki yıldız (⭐) butonuna basarak takibe alabilirsiniz.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {watchlist.map((item) => (
                      <div
                        key={item.id}
                        className="glass-strong rounded-xl p-4 border border-border/60 hover:border-primary/30 transition-all flex flex-col gap-3 relative group"
                      >
                        {/* Title & Store */}
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-sm text-foreground leading-tight line-clamp-2">
                              {item.product_name}
                            </h4>
                            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              item.last_stock_status === 'IN_STOCK'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {item.last_stock_status === 'IN_STOCK' ? 'Stokta' : 'Stok Yok'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-1.5">
                            <span className="font-semibold text-foreground/80">{item.store_name}</span>
                            {item.branch && <span className="text-primary">📍 {item.branch}</span>}
                            <span>• {item.city}</span>
                          </div>
                        </div>

                        {/* Price & Actions */}
                        <div className="flex justify-between items-center pt-2 border-t border-border/40">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground">Fiyat</span>
                            <span className="font-bold text-sm text-foreground">
                              {typeof item.price === 'number'
                                ? item.price.toLocaleString('tr-TR')
                                : item.price} {item.currency || 'TRY'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {/* Notification Toggle */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleNotifications(item.id, item.notifications_enabled)}
                              className={`h-7 px-2 rounded-lg border border-transparent ${
                                item.notifications_enabled
                                  ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                  : 'text-muted-foreground hover:bg-muted'
                              }`}
                              title={item.notifications_enabled ? 'Bildirimler açık' : 'Bildirimler kapalı'}
                            >
                              {item.notifications_enabled ? (
                                <Bell className="w-3.5 h-3.5" />
                              ) : (
                                <BellOff className="w-3.5 h-3.5" />
                              )}
                            </Button>

                            {/* Unfollow button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnfollowById(item.id)}
                              className="h-7 px-2 rounded-lg text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
                              title="Takibi bırak"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              {watchlist.length > 0 && (
                <div className="p-6 border-t border-border/50 bg-background/50 flex flex-col gap-3">
                  <Button
                    size="default"
                    onClick={handleRunScanCheck}
                    disabled={isScanning}
                    className="w-full gradient-primary text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="animate-spin w-4 h-4 mr-2" />
                        Stoklar taranıyor...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 text-white animate-pulse" />
                        Şimdi Denetle (Stok ve Fiyat Kontrolü)
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground leading-normal">
                    Bu işlem takip ettiğiniz tüm ürünlerin güncel stok durumunu tarar ve bir değişiklik algılarsa tanımladığınız SMTP, Telegram veya Webhook kanallarına bildirim gönderir.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <SearchApp />
          </motion.div>
        } />
        <Route path="/admin" element={
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <AdminDashboard />
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AnimatedRoutes />
      </Router>
    </QueryClientProvider>
  )
}

export default App

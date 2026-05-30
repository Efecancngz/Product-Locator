import { useState, useRef, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Search, Store, List, Map as MapIcon, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProductSearch } from '@/hooks/useProductSearch'
import { StoreMap } from '@/components/map/StoreMap'
import { LocationSelector } from '@/components/filters/LocationSelector'
import { CategoryFilter, StoreCategory } from '@/components/filters/CategoryFilter'
import { ProductListWithPagination } from '@/components/ProductListWithPagination'
import { AdminDashboard } from '@/components/AdminDashboard'
import gsap from 'gsap'

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

  // Refs for GSAP
  const heroRef = useRef<HTMLDivElement>(null)
  const searchBarRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const heroTitleRef = useRef<HTMLHeadingElement>(null)
  const heroSubRef = useRef<HTMLParagraphElement>(null)
  const gridBgRef = useRef<HTMLDivElement>(null)

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

  // Hero entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.fromTo(gridBgRef.current, { opacity: 0 }, { opacity: 1, duration: 1.5 })
        .fromTo(heroTitleRef.current, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, '-=1')
        .fromTo(heroSubRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.5')
        .fromTo(searchBarRef.current, { y: 40, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.8 }, '-=0.4')
    })

    return () => ctx.revert()
  }, [])

  // Transition: Hero → Results
  useEffect(() => {
    if (searchId > 0 && heroRef.current && searchBarRef.current) {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } })

        // Fade out hero text
        if (heroTitleRef.current && heroSubRef.current) {
          tl.to([heroTitleRef.current, heroSubRef.current], {
            y: -30, opacity: 0, duration: 0.4, stagger: 0.05
          })
        }

        // Shrink grid bg
        if (gridBgRef.current) {
          tl.to(gridBgRef.current, { opacity: 0.3, duration: 0.5 }, '-=0.3')
        }

        // Move search bar to top
        tl.to(searchBarRef.current, {
          scale: 0.92, duration: 0.5
        }, '-=0.3')
      })
      return () => ctx.revert()
    }
  }, [searchId])

  // Animate results area
  useEffect(() => {
    if (!isLoading && data && resultsRef.current) {
      gsap.fromTo(resultsRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
      )
    }
  }, [isLoading, data])

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

    // Animate back
    if (heroTitleRef.current && heroSubRef.current) {
      gsap.fromTo([heroTitleRef.current, heroSubRef.current],
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
      )
    }
    if (gridBgRef.current) {
      gsap.to(gridBgRef.current, { opacity: 1, duration: 0.8 })
    }
    if (searchBarRef.current) {
      gsap.to(searchBarRef.current, { scale: 1, duration: 0.4 })
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">

      {/* Animated grid background */}
      <div
        ref={gridBgRef}
        className="fixed inset-0 grid-bg grid-bg-fade gradient-mesh pointer-events-none z-0"
      />

      {/* Navbar */}
      <header ref={navRef} className="glass-strong z-50 sticky top-0">
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
        <div
          ref={heroRef}
          className={`transition-all duration-500 ease-in-out z-20 w-full flex flex-col items-center pointer-events-none
            ${searchId > 0 ? 'absolute top-4' : 'absolute top-1/2 -translate-y-1/2'}
          `}
        >
          <div className="pointer-events-auto w-full max-w-3xl px-4 flex flex-col items-center gap-6">

            {/* Hero Text */}
            {searchId === 0 && (
              <div className="text-center space-y-5 mb-2">
                <h1
                  ref={heroTitleRef}
                  className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]"
                >
                  Aradığın ürünü{' '}
                  <br />
                  <span className="gradient-text">şehrinde bul.</span>
                </h1>
                <p
                  ref={heroSubRef}
                  className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto"
                >
                  25+ mağazanın stokunu tarıyoruz,
                  <br className="hidden md:block" />{' '}
                  en yakın mağazayı haritada gösteriyoruz.
                </p>
              </div>
            )}

            {/* Search Bar */}
            <div
              ref={searchBarRef}
              className="w-full max-w-4xl glass-strong rounded-2xl shadow-xl glow-primary flex flex-col md:flex-row gap-2 p-2"
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
            </div>
          </div>
        </div>

        {/* Results Area */}
        {searchId > 0 && (
          <div
            ref={resultsRef}
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
                  <ProductListWithPagination products={data?.found_products || []} totalFound={data?.total_found || 0} />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      {searchId === 0 && (
        <footer className="py-6 text-center text-sm text-muted-foreground/50 relative z-10">
          © 2026 Product Locator — Tüm stoklar, tek tıkla.
        </footer>
      )}
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<SearchApp />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft, Store, Plus, Trash2, Edit3, Globe, FolderOpen, 
  ExternalLink, X, Sparkles, Check, AlertCircle, Loader2, Search,
  Cpu, Database, Activity, Play, Terminal, Bell, Send, Mail, MessageCircle,
  Settings2, CheckCircle2
} from 'lucide-react'
import { apiClient } from '../api/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import gsap from 'gsap'

// Define interfaces for store configuration
export interface StoreSelectors {
  product_container?: string;
  product_name?: string;
  product_price?: string;
  [key: string]: string | undefined;
}

export interface StoreConfig {
  key: string;
  name: string;
  domain: string;
  search_url_template: string;
  category: 'electronics' | 'appliances' | 'clothing' | 'sports' | 'cosmetics';
  enabled: boolean;
  selectors?: StoreSelectors;
}

// Category design styles helper
const CATEGORY_STYLES = {
  electronics: {
    bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    dot: 'bg-indigo-400',
    label: 'Electronics'
  },
  appliances: {
    bg: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
    dot: 'bg-teal-400',
    label: 'Appliances'
  },
  clothing: {
    bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    dot: 'bg-rose-400',
    label: 'Clothing'
  },
  sports: {
    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    dot: 'bg-amber-400',
    label: 'Sports'
  },
  cosmetics: {
    bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    dot: 'bg-purple-400',
    label: 'Cosmetics'
  }
}

export function AdminDashboard() {
  const [stores, setStores] = useState<StoreConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Form State
  const [formKey, setFormKey] = useState('')
  const [formName, setFormName] = useState('')
  const [formDomain, setFormDomain] = useState('')
  const [formSearchUrl, setFormSearchUrl] = useState('')
  const [formCategory, setFormCategory] = useState<'electronics' | 'appliances' | 'clothing' | 'sports' | 'cosmetics'>('electronics')
  const [formEnabled, setFormEnabled] = useState(true)
  const [formContainerSelector, setFormContainerSelector] = useState('')
  const [formNameSelector, setFormNameSelector] = useState('')
  const [formPriceSelector, setFormPriceSelector] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Refs for GSAP animation
  const gridBgRef = useRef<HTMLDivElement>(null)
  const dashboardHeaderRef = useRef<HTMLDivElement>(null)
  const cardsGridRef = useRef<HTMLDivElement>(null)

  // Health Metrics State
  const [health, setHealth] = useState<{
    mongodb: { status: string; latency_ms: number };
    redis?: { status: string; latency_ms: number; used_memory_mb?: number };
    gemini: { status: string };
    report_system?: { status: string };
    system: { cpu_load_percent: number };
  } | null>(null)

  // Notification Center State
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifTelegramToken, setNotifTelegramToken] = useState('')
  const [notifTelegramChatId, setNotifTelegramChatId] = useState('')
  const [notifSmtpHost, setNotifSmtpHost] = useState('smtp.gmail.com')
  const [notifSmtpPort, setNotifSmtpPort] = useState('587')
  const [notifSmtpUser, setNotifSmtpUser] = useState('')
  const [notifSmtpPass, setNotifSmtpPass] = useState('')
  const [notifSmtpFrom, setNotifSmtpFrom] = useState('')
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)
  const [notifTestResult, setNotifTestResult] = useState<string | null>(null)
  const [notifTesting, setNotifTesting] = useState(false)

  // Load notification settings on mount
  useEffect(() => {
    const loadNotifSettings = async () => {
      try {
        const { data } = await apiClient.get('/admin/reports/settings')
        if (data) {
          setNotifTelegramToken(data.telegram_bot_token || '')
          setNotifTelegramChatId(data.telegram_chat_id || '')
          setNotifSmtpHost(data.smtp_host || 'smtp.gmail.com')
          setNotifSmtpPort(data.smtp_port || '587')
          setNotifSmtpUser(data.smtp_username || '')
          setNotifSmtpPass(data.smtp_password || '')
          setNotifSmtpFrom(data.smtp_from || '')
        }
      } catch (err) {
        console.error('Could not load notification settings:', err)
      }
    }
    loadNotifSettings()
  }, [])

  // Save notification settings handler
  const handleSaveNotifSettings = async () => {
    setNotifSaving(true)
    setNotifSaved(false)
    try {
      await apiClient.post('/admin/reports/settings', {
        telegram_bot_token: notifTelegramToken,
        telegram_chat_id: notifTelegramChatId,
        smtp_host: notifSmtpHost,
        smtp_port: notifSmtpPort,
        smtp_username: notifSmtpUser,
        smtp_password: notifSmtpPass,
        smtp_from: notifSmtpFrom
      })
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 3000)
    } catch (err) {
      console.error('Could not save notification settings:', err)
    } finally {
      setNotifSaving(false)
    }
  }

  // Test notification trigger handler
  const handleTestNotification = async () => {
    setNotifTesting(true)
    setNotifTestResult(null)
    try {
      const { data } = await apiClient.post('/admin/reports/test-trigger')
      setNotifTestResult(data?.result?.success ? '✅ Test bildirimi başarıyla gönderildi!' : '⚠️ ReportSystem yanıt verdi ancak gönderim başarısız olabilir.')
    } catch (err: any) {
      setNotifTestResult('❌ Bağlantı hatası: ReportSystem servisi erişilebilir değil.')
    } finally {
      setNotifTesting(false)
    }
  }

  // Scraper Simulation State
  const [simulating, setSimulating] = useState(false)
  const [simQuery, setSimQuery] = useState('iphone 15')
  const [simLogs, setSimLogs] = useState<string[]>([])
  const [simResult, setSimResult] = useState<any[] | null>(null)
  const [simError, setSimError] = useState<string | null>(null)

  // Load stores from API
  const loadStores = async () => {
    try {
      setLoading(true)
      const { data } = await apiClient.get<StoreConfig[]>('/admin/stores')
      setStores(data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to load stores:', err)
      setError('Could not establish connection to the backend database registry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStores()
  }, [])

  // Dynamic server health metric loop
  const loadHealth = async () => {
    try {
      const { data } = await apiClient.get('/admin/health')
      setHealth(data)
    } catch (err) {
      console.error('Failed to load health metrics:', err)
    }
  }

  useEffect(() => {
    loadHealth()
    const timer = setInterval(loadHealth, 10000)
    return () => clearInterval(timer)
  }, [])

  // Scraper Simulation Handler
  const handleRunSimulation = async () => {
    setSimulating(true)
    setSimLogs(['⚙️ Initializing dynamic request simulation sequence...'])
    setSimResult(null)
    setSimError(null)
    
    try {
      const payload = {
        query: simQuery.trim() || 'iphone 15',
        store: {
          key: formKey.trim() || 'temp-test',
          name: formName.trim() || 'Test Store',
          domain: formDomain.trim() || 'test.com',
          search_url_template: formSearchUrl.trim() || 'https://www.test.com/search?q={query}',
          category: formCategory,
          enabled: true,
          selectors: {
            product_container: formContainerSelector.trim() || undefined,
            product_name: formNameSelector.trim() || undefined,
            product_price: formPriceSelector.trim() || undefined
          }
        }
      }
      
      const { data } = await apiClient.post('/admin/stores/test-scrape', payload)
      
      // Dynamic log stagger animation for authentic terminal look & feel
      if (data.logs && data.logs.length > 0) {
        let currentLogs: string[] = []
        for (let i = 0; i < data.logs.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 200))
          currentLogs = [...currentLogs, data.logs[i]]
          setSimLogs(currentLogs)
        }
      }
      
      if (data.success) {
        setSimResult(data.products)
      } else {
        setSimError(data.error || 'Scraping simulation completed with no parsed products. Verify CSS selectors.')
      }
    } catch (err: any) {
      console.error('Simulation request failed:', err)
      setSimError(err.response?.data?.detail || 'Scraping simulation connection failed.')
    } finally {
      setSimulating(false)
    }
  }

  // Mount animation using GSAP
  useEffect(() => {
    if (!loading && stores.length > 0) {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        
        tl.fromTo(gridBgRef.current, { opacity: 0 }, { opacity: 0.25, duration: 1.2 })
          .fromTo(dashboardHeaderRef.current, { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.8')
          .fromTo('.store-card', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05 }, '-=0.5')
      })
      return () => ctx.revert()
    }
  }, [loading])

  // Toggle store status (active/passive)
  const handleToggleStore = async (key: string) => {
    const originalStores = [...stores]
    // Optimistic UI Update
    setStores(prev => prev.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s))
    
    try {
      // Find element & animate with GSAP
      const cardEl = document.querySelector(`[data-store-key="${key}"]`)
      if (cardEl) {
        gsap.fromTo(cardEl, { scale: 0.98 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' })
      }
      
      await apiClient.patch(`/admin/stores/${key}/toggle`)
    } catch (err) {
      console.error('Failed to toggle store:', err)
      // Rollback on failure
      setStores(originalStores)
    }
  }

  // Delete Store
  const handleDeleteStore = async (key: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the store configuration for '${key}'?`)) {
      return
    }

    try {
      // Animate fade-out first
      const cardEl = document.querySelector(`[data-store-key="${key}"]`)
      if (cardEl) {
        await gsap.to(cardEl, { scale: 0.8, opacity: 0, duration: 0.4, ease: 'power2.in' })
      }
      
      await apiClient.delete(`/admin/stores/${key}`)
      setStores(prev => prev.filter(s => s.key !== key))
    } catch (err) {
      console.error('Failed to delete store:', err)
      alert('Could not delete the store. Please verify database connection.')
      loadStores() // Reload list to restore UI state
    }
  }

  // Open modal for editing
  const handleOpenEditModal = (store: StoreConfig) => {
    setIsEditMode(true)
    setFormKey(store.key)
    setFormName(store.name)
    setFormDomain(store.domain)
    setFormSearchUrl(store.search_url_template)
    setFormCategory(store.category)
    setFormEnabled(store.enabled)
    setFormContainerSelector(store.selectors?.product_container || '')
    setFormNameSelector(store.selectors?.product_name || '')
    setFormPriceSelector(store.selectors?.product_price || '')
    setFormError(null)
    
    // Reset simulation state
    setSimLogs([])
    setSimResult(null)
    setSimError(null)
    
    setIsModalOpen(true)
  }

  // Open modal for creating new store
  const handleOpenAddModal = () => {
    setIsEditMode(false)
    setFormKey('')
    setFormName('')
    setFormDomain('')
    setFormSearchUrl('')
    setFormCategory('electronics')
    setFormEnabled(true)
    setFormContainerSelector('')
    setFormNameSelector('')
    setFormPriceSelector('')
    setFormError(null)
    
    // Reset simulation state
    setSimLogs([])
    setSimResult(null)
    setSimError(null)
    
    setIsModalOpen(true)
  }

  // Submit modal form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Field validations
    if (!formKey.trim() || formKey.length < 2) {
      setFormError('Store key is required and must be at least 2 characters.')
      return
    }
    if (!formName.trim() || formName.length < 3) {
      setFormError('Store name is required and must be at least 3 characters.')
      return
    }
    if (!formDomain.trim() || formDomain.length < 4) {
      setFormError('Store domain is required (e.g., store.com).')
      return
    }
    if (!formSearchUrl.trim() || !formSearchUrl.includes('{query}')) {
      setFormError('Search URL template must contain {query} placeholder.')
      return
    }

    const payload: StoreConfig = {
      key: formKey.trim().toLowerCase(),
      name: formName.trim(),
      domain: formDomain.trim().toLowerCase(),
      search_url_template: formSearchUrl.trim(),
      category: formCategory,
      enabled: formEnabled,
      selectors: {
        product_container: formContainerSelector.trim() || undefined,
        product_name: formNameSelector.trim() || undefined,
        product_price: formPriceSelector.trim() || undefined
      }
    }

    try {
      setSubmitting(true)
      await apiClient.post('/admin/stores', payload)
      
      // Reload stores dynamically
      await loadStores()
      setIsModalOpen(false)
    } catch (err: any) {
      console.error('Failed to submit store config:', err)
      const serverMsg = err.response?.data?.detail
      setFormError(serverMsg ? JSON.stringify(serverMsg) : 'Failed to register configuration. Schema validation error.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter stores according to category & query
  const filteredStores = stores.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.domain.toLowerCase().includes(searchQuery.toLowerCase())
      
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden pb-12">
      {/* Dynamic backdrop grid */}
      <div
        ref={gridBgRef}
        className="fixed inset-0 grid-bg grid-bg-fade gradient-mesh pointer-events-none z-0"
        style={{ opacity: 0.15 }}
      />

      {/* Admin Dashboard Header */}
      <header className="glass-strong z-40 sticky top-0 border-b border-border/40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2.5 font-bold text-lg">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="tracking-tight">SaaS Admin Registry</span>
            </div>
          </div>

          {/* Real-time System Diagnostics Widgets */}
          <div className="hidden lg:flex items-center gap-4">
            {/* MongoDB Latency Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-border/40 text-xs">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-muted-foreground font-medium">DB:</span>
              {health ? (
                <span className={`font-mono font-bold flex items-center gap-1.5 ${health.mongodb.status === 'connected' ? 'text-emerald-400' : 'text-red-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${health.mongodb.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  {health.mongodb.status === 'connected' ? `${health.mongodb.latency_ms}ms` : 'Offline'}
                </span>
              ) : (
                <span className="text-muted-foreground/40 font-mono">pinging...</span>
              )}
            </div>

            {/* Redis Cache Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-border/40 text-xs">
              <Database className="w-3.5 h-3.5 text-red-400" />
              <span className="text-muted-foreground font-medium">Redis:</span>
              {health ? (
                <span className={`font-mono font-bold flex items-center gap-1.5 ${health.redis?.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${health.redis?.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {health.redis?.status === 'connected' ? `${health.redis.latency_ms}ms` : 'Offline'}
                </span>
              ) : (
                <span className="text-muted-foreground/40 font-mono">pinging...</span>
              )}
            </div>
            {/* Gemini AI Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-border/40 text-xs">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-muted-foreground font-medium">Gemini AI:</span>
              {health ? (
                <span className={`font-bold flex items-center gap-1.5 ${health.gemini.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${health.gemini.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {health.gemini.status === 'active' ? 'Ready' : health.gemini.status === 'missing_key' ? 'No Key' : 'Error'}
                </span>
              ) : (
                <span className="text-muted-foreground/40 font-mono">checking...</span>
              )}
            </div>

            {/* CPU Load Metric Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-border/40 text-xs">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-muted-foreground font-medium">CPU Load:</span>
              {health ? (
                <span className={`font-mono font-bold flex items-center gap-1.5 ${health.system.cpu_load_percent < 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {health.system.cpu_load_percent}%
                </span>
              ) : (
                <span className="text-muted-foreground/40 font-mono">calibrating...</span>
              )}
            </div>

            {/* ReportSystem Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-border/40 text-xs">
              <Bell className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-muted-foreground font-medium">Reports:</span>
              {health ? (
                <span className={`font-bold flex items-center gap-1.5 ${health.report_system?.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${health.report_system?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  {health.report_system?.status === 'ok' ? 'Online' : 'Offline'}
                </span>
              ) : (
                <span className="text-muted-foreground/40 font-mono">checking...</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              variant={showNotifPanel ? 'default' : 'outline'}
              className={`h-9 px-4 text-sm transition-all duration-300 ${
                showNotifPanel 
                  ? 'gradient-primary text-white shadow-lg' 
                  : 'glass border-border/50 hover:border-primary/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bell className="w-4 h-4 mr-2" /> Bildirimler
            </Button>
            <Button
              onClick={handleOpenAddModal}
              className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] h-9 px-4 text-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Store
            </Button>
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <main ref={dashboardHeaderRef} className="container mx-auto px-4 pt-8 relative z-10 flex-1 flex flex-col gap-6">

        {/* ===== Notification Center Panel (Rapor & Bildirim Merkezi) ===== */}
        {showNotifPanel && (
          <div className="glass-strong rounded-2xl p-6 shadow-xl border border-indigo-500/20 animate-in slide-in-from-top-2 duration-300" style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.06) 100%)'}}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #6366f1, #a855f7)'}}>
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Rapor & Bildirim Merkezi</h3>
                  <p className="text-xs text-muted-foreground">ReportSystem mikroservis entegrasyonu — Telegram, E-posta ve SMS kanalları</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowNotifPanel(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Telegram Channel Configuration */}
              <div className="glass rounded-xl p-4 border border-border/40 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                  <span>Telegram Kanalı</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ücretsiz</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Bot Token</label>
                    <Input
                      placeholder="123456:ABC-DEF..."
                      value={notifTelegramToken}
                      onChange={(e) => setNotifTelegramToken(e.target.value)}
                      className="h-8 text-xs bg-card/50 border-border/50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Chat ID</label>
                    <Input
                      placeholder="-100123456789"
                      value={notifTelegramChatId}
                      onChange={(e) => setNotifTelegramChatId(e.target.value)}
                      className="h-8 text-xs bg-card/50 border-border/50 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SMTP Email Channel Configuration */}
              <div className="glass rounded-xl p-4 border border-border/40 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span>SMTP E-posta Kanalı</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ücretsiz</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">SMTP Host</label>
                    <Input
                      placeholder="smtp.gmail.com"
                      value={notifSmtpHost}
                      onChange={(e) => setNotifSmtpHost(e.target.value)}
                      className="h-8 text-xs bg-card/50 border-border/50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Port</label>
                    <Input
                      placeholder="587"
                      value={notifSmtpPort}
                      onChange={(e) => setNotifSmtpPort(e.target.value)}
                      className="h-8 text-xs bg-card/50 border-border/50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Kullanıcı Adı</label>
                    <Input
                      placeholder="you@gmail.com"
                      value={notifSmtpUser}
                      onChange={(e) => setNotifSmtpUser(e.target.value)}
                      className="h-8 text-xs bg-card/50 border-border/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1 block">Şifre / App Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={notifSmtpPass}
                      onChange={(e) => setNotifSmtpPass(e.target.value)}
                      className="h-8 text-xs bg-card/50 border-border/50"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-muted-foreground mb-1 block">Gönderen Adres (From)</label>
                    <Input
                      placeholder="notifications@yourdomain.com"
                      value={notifSmtpFrom}
                      onChange={(e) => setNotifSmtpFrom(e.target.value)}
                      className="h-8 text-xs bg-card/50 border-border/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons & Status */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-border/30">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveNotifSettings}
                  disabled={notifSaving}
                  className="h-9 px-5 text-xs font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white'}}
                >
                  {notifSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Settings2 className="w-4 h-4 mr-2" />}
                  Ayarları Kaydet
                </Button>
                {notifSaved && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium animate-in fade-in duration-300">
                    <CheckCircle2 className="w-4 h-4" /> Kaydedildi!
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleTestNotification}
                  disabled={notifTesting}
                  variant="outline"
                  className="h-9 px-5 text-xs font-semibold border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 transition-all"
                >
                  {notifTesting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Test Bildirimi Gönder
                </Button>
                {notifTestResult && (
                  <span className={`text-xs font-medium animate-in fade-in duration-300 ${
                    notifTestResult.startsWith('✅') ? 'text-emerald-400' : notifTestResult.startsWith('⚠') ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {notifTestResult}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        
        {/* Filters and Search Bar Container */}
        <div className="glass-strong rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {['all', 'electronics', 'appliances', 'clothing', 'sports', 'cosmetics'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-300 capitalize
                  ${activeCategory === cat 
                    ? 'gradient-primary text-white border-transparent shadow-md' 
                    : 'glass text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 border-border/50'
                  }
                `}
              >
                {cat === 'all' ? 'All Stores' : cat}
              </button>
            ))}
          </div>

          {/* Search bar inside admin */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search store brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs glass border-border/50 focus-visible:ring-primary focus-visible:ring-1 focus-visible:ring-offset-0 bg-transparent placeholder:text-muted-foreground/45"
            />
          </div>
        </div>

        {/* Dynamic Loading State */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="animate-spin text-primary w-10 h-10 mb-4" />
            <p className="text-muted-foreground text-sm font-medium">Fetching secure configurations...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <div className="text-center glass-strong rounded-2xl p-8 max-w-md border-destructive/20 glow-danger">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-lg font-bold mb-2">Connection Failure</p>
              <p className="text-muted-foreground text-sm mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={loadStores}>
                Retry Connection
              </Button>
            </div>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] glass-strong rounded-2xl border-dashed border-border p-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm font-medium">No matching retail stores found.</p>
            <p className="text-muted-foreground/50 text-xs mt-1">Add a new store dynamically using the 'Add Store' trigger.</p>
          </div>
        ) : (
          /* Cards Grid */
          <div ref={cardsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map((store) => {
              const catDesign = CATEGORY_STYLES[store.category] || {
                bg: 'bg-muted border-border text-muted-foreground',
                dot: 'bg-muted-foreground',
                label: store.category
              }
              
              return (
                <div
                  key={store.key}
                  data-store-key={store.key}
                  className={`store-card glass-strong rounded-2xl p-5 flex flex-col justify-between relative shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.01] hover:border-primary/20
                    ${!store.enabled ? 'opacity-65 grayscale-[35%]' : ''}
                  `}
                >
                  {/* Category Pill Tag */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border capitalize tracking-wider flex items-center gap-1.5 ${catDesign.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${catDesign.dot}`} />
                      {catDesign.label}
                    </span>
                    
                    {/* Active/Passive Switcher Toggle */}
                    <button
                      onClick={() => handleToggleStore(store.key)}
                      className={`w-11 h-6 rounded-full transition-colors duration-300 relative flex items-center px-1 cursor-pointer
                        ${store.enabled ? 'gradient-primary glow-primary' : 'bg-muted border border-border'}
                      `}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center
                        ${store.enabled ? 'translate-x-5' : 'translate-x-0'}
                      `}>
                        {store.enabled && <Check className="w-2.5 h-2.5 text-primary" />}
                      </div>
                    </button>
                  </div>

                  {/* Brand & Key Info */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold tracking-tight mb-1 flex items-center gap-2">
                      {store.name}
                      <span className="text-[10px] text-muted-foreground/60 font-mono font-medium px-1.5 py-0.5 rounded bg-muted">
                        {store.key}
                      </span>
                      {(!store.selectors?.product_container || !store.selectors?.product_name || !store.selectors?.product_price) && (
                        <span 
                          className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 animate-pulse cursor-help"
                          title="Low-Code CSS selectors missing. Falling back to generic crawler parsing."
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </h3>
                    <div className="text-muted-foreground text-xs flex items-center gap-1.5 mt-2">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground/60" />
                      <span className="font-mono">{store.domain}</span>
                      <a 
                        href={`https://${store.domain}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-muted-foreground/40 hover:text-foreground transition-colors ml-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Scrape URL Pattern Template */}
                  <div className="glass rounded-xl p-3 bg-muted/20 border border-border/30 mb-5">
                    <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                      Search URL Template
                    </span>
                    <span className="text-xs font-mono break-all line-clamp-1 block text-muted-foreground/90">
                      {store.search_url_template}
                    </span>
                  </div>

                  {/* Dynamic Custom Selectors indicators */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground/60 border-t border-border/40 pt-4 mt-auto">
                    <div className="flex gap-2">
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[9px]
                        ${store.selectors?.product_container ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground/40'}
                      `}>
                        .container
                      </span>
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[9px]
                        ${store.selectors?.product_name ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground/40'}
                      `}>
                        .name
                      </span>
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[9px]
                        ${store.selectors?.product_price ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground/40'}
                      `}>
                        .price
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2.5">
                      <button 
                        onClick={() => handleOpenEditModal(store)}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit Store"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteStore(store.key)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete Store"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* CRUD Overlay Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          
          {/* Form Content */}
          <div className="relative w-full max-w-xl glass-strong rounded-2xl shadow-2xl p-6 border border-border overflow-hidden z-10 animate-pulse-glow">
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {isEditMode ? `Edit Store: ${formName}` : 'Add New Store Config'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Store Key */}
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    Store Key *
                  </label>
                  <Input
                    placeholder="teknosa"
                    disabled={isEditMode}
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    className="h-9 glass border-border/50 text-xs focus-visible:ring-primary focus-visible:ring-1"
                  />
                </div>
                
                {/* Store Name */}
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    Store Name *
                  </label>
                  <Input
                    placeholder="Teknosa"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-9 glass border-border/50 text-xs focus-visible:ring-primary focus-visible:ring-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Store Domain */}
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    Domain *
                  </label>
                  <Input
                    placeholder="teknosa.com"
                    value={formDomain}
                    onChange={(e) => setFormDomain(e.target.value)}
                    className="h-9 glass border-border/50 text-xs focus-visible:ring-primary focus-visible:ring-1"
                  />
                </div>
                
                {/* Category Selector */}
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-border/50 bg-card text-foreground px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="electronics">Electronics</option>
                    <option value="appliances">Appliances</option>
                    <option value="clothing">Clothing</option>
                    <option value="sports">Sports</option>
                    <option value="cosmetics">Cosmetics</option>
                  </select>
                </div>
              </div>

              {/* Search Url Template */}
              <div>
                <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                  Search URL Template *
                </label>
                <Input
                  placeholder="https://www.teknosa.com/arama/?s={query}"
                  value={formSearchUrl}
                  onChange={(e) => setFormSearchUrl(e.target.value)}
                  className="h-9 glass border-border/50 text-xs focus-visible:ring-primary focus-visible:ring-1"
                />
                <span className="text-[9px] text-muted-foreground/50 mt-1 block">
                  Must include the <code className="text-primary font-bold">{'{query}'}</code> placeholder dynamically.
                </span>
              </div>

              {/* CSS Selectors (No-Code section) */}
              <div className="border-t border-border/40 pt-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Low-Code Scraping CSS Selectors (Optional)
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                  {/* Container Selector */}
                  <div>
                    <label className="text-[9px] text-muted-foreground/50 font-bold block mb-1">
                      Product Container
                    </label>
                    <Input
                      placeholder=".prd-item"
                      value={formContainerSelector}
                      onChange={(e) => setFormContainerSelector(e.target.value)}
                      className="h-8 glass border-border/50 text-[10px] focus-visible:ring-primary focus-visible:ring-1"
                    />
                  </div>

                  {/* Name Selector */}
                  <div>
                    <label className="text-[9px] text-muted-foreground/50 font-bold block mb-1">
                      Product Name
                    </label>
                    <Input
                      placeholder="h3.title"
                      value={formNameSelector}
                      onChange={(e) => setFormNameSelector(e.target.value)}
                      className="h-8 glass border-border/50 text-[10px] focus-visible:ring-primary focus-visible:ring-1"
                    />
                  </div>

                  {/* Price Selector */}
                  <div>
                    <label className="text-[9px] text-muted-foreground/50 font-bold block mb-1">
                      Product Price
                    </label>
                    <Input
                      placeholder=".price-value"
                      value={formPriceSelector}
                      onChange={(e) => setFormPriceSelector(e.target.value)}
                      className="h-8 glass border-border/50 text-[10px] focus-visible:ring-primary focus-visible:ring-1"
                    />
                  </div>
                </div>
              </div>

              {/* Stealth Scrape Simulator (Dry-run Panel) */}
              <div className="border-t border-border/40 pt-4 bg-muted/10 rounded-xl p-3 border border-border/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-primary animate-pulse" />
                    Stealth Scrape Simulator (Dry-Run)
                  </h3>
                  
                  {/* Test Input Query */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="iphone 15"
                      value={simQuery}
                      onChange={(e) => setSimQuery(e.target.value)}
                      className="h-7 w-28 text-[10px] glass focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <Button
                      type="button"
                      disabled={simulating}
                      onClick={handleRunSimulation}
                      size="sm"
                      className="h-7 px-3 text-[10px] gradient-primary text-white flex items-center gap-1 font-bold"
                    >
                      {simulating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      Test Selectors
                    </Button>
                  </div>
                </div>

                {/* Simulation Logs / Results view */}
                {(simLogs.length > 0 || simError || simResult) && (
                  <div className="space-y-3 mt-2">
                    {/* Console Logger Output */}
                    <div className="bg-black/80 font-mono text-[9px] text-green-400 p-3 rounded-lg border border-green-500/20 max-h-32 overflow-y-auto scrollbar-thin">
                      {simLogs.map((log, lIdx) => (
                        <div key={lIdx} className="line-clamp-1">
                          {log}
                        </div>
                      ))}
                      {simulating && (
                        <div className="flex items-center gap-1 mt-1 text-primary animate-pulse">
                          <span>▋</span>
                          <span className="text-[8px] italic">Scraper processing page DOM concurrently...</span>
                        </div>
                      )}
                    </div>

                    {/* Extracted Product Preview Card */}
                    {simResult && simResult.length > 0 && (
                      <div className="glass-strong border border-emerald-500/30 rounded-xl p-3 flex items-start gap-3 bg-emerald-500/5 shadow-md">
                        {simResult[0].image_url && (
                          <img 
                            src={simResult[0].image_url} 
                            alt={simResult[0].name}
                            className="w-12 h-12 object-contain rounded-lg bg-white p-1 border border-border"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider mb-0.5">
                            🟢 Verified Selector Match
                          </span>
                          <h4 className="text-[11px] font-bold text-foreground truncate">
                            {simResult[0].name}
                          </h4>
                          <span className="text-xs font-mono font-bold text-primary block mt-0.5">
                            {typeof simResult[0].price === 'number' ? simResult[0].price.toLocaleString('tr-TR') : simResult[0].price} TRY
                          </span>
                          {/* Highlight Branch / District Info */}
                          <span className="text-[9px] text-muted-foreground block mt-0.5">
                            📍 Elden Alım Şubesi: {simResult[0].store_info.district}, {simResult[0].store_info.city} ({simResult[0].store_info.branch})
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Simulation Error Info */}
                    {simError && (
                      <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[10px] rounded-lg p-2.5 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{simError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-6">
                {/* Enabled checkbox toggle */}
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={formEnabled}
                    onChange={(e) => setFormEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-card"
                  />
                  <span>Active in Search</span>
                </label>

                {/* Form Actions */}
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsModalOpen(false)}
                    className="text-xs h-9 px-4 rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="gradient-primary text-white shadow-lg text-xs h-9 px-5 rounded-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      'Save Configuration'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft, Store, Plus, Trash2, Edit3, Globe, FolderOpen, 
  ExternalLink, X, Sparkles, Check, AlertCircle, Loader2, Search,
  Cpu, Database, Activity, Play, Terminal, Bell, Send, Mail, MessageCircle,
  Settings2, CheckCircle2, MapPin, Package, Clock, RefreshCw, Pause, Calendar,
  FileSpreadsheet, FileText
} from 'lucide-react'
import { apiClient } from '../api/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { Map as PigeonMap, Marker as PigeonMarker } from 'pigeon-maps'

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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 120,
      damping: 14
    }
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

  // ===== Tab State =====
  const [activeTab, setActiveTab] = useState<'stores' | 'manual' | 'scheduler'>('stores')

  // ===== Scheduler Tab State =====
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null)
  const [scanHistory, setScanHistory] = useState<any[]>([])
  const [schedulerHistoryTotal, setSchedulerHistoryTotal] = useState(0)
  const [schedulerPage, setSchedulerPage] = useState(1)
  const [schedulerPerPage] = useState(10)
  const [schedulerLoading, setSchedulerLoading] = useState(false)
  const [runNowLoading, setRunNowLoading] = useState(false)
  const [schedulerConfigHours, setSchedulerConfigHours] = useState<number>(24)
  const [schedulerConfigCronHour, setSchedulerConfigCronHour] = useState<number>(0)
  const [schedulerConfigCronMinute, setSchedulerConfigCronMinute] = useState<number>(0)
  const [schedulerMode, setSchedulerMode] = useState<'interval' | 'cron'>('interval')
  const [schedulerUpdating, setSchedulerUpdating] = useState(false)
  const [schedulerError, setSchedulerError] = useState<string | null>(null)

  // ===== Export State =====
  const [exportDownloading, setExportDownloading] = useState<string | null>(null)

  // Manual Products list / search / pagination
  const [manualProducts, setManualProducts] = useState<any[]>([])
  const [manualTotal, setManualTotal] = useState(0)
  const [manualLoading, setManualLoading] = useState(false)
  const [manualPage, setManualPage] = useState(1)
  const [manualPerPage] = useState(10)
  const [manualSearchQuery, setManualSearchQuery] = useState('')
  const [manualCategory, setManualCategory] = useState('all')
  const [manualCity, setManualCity] = useState('')

  // Manual Product Form & Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [isManualEditMode, setIsManualEditMode] = useState(false)
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [manualFormError, setManualFormError] = useState<string | null>(null)

  // Manual Product Form Fields
  const [mpId, setMpId] = useState('')
  const [mpProductName, setMpProductName] = useState('')
  const [mpPrice, setMpPrice] = useState<string>('')
  const [mpCurrency, setMpCurrency] = useState('TRY')
  const [mpCategory, setMpCategory] = useState<'electronics' | 'appliances' | 'clothing' | 'sports' | 'cosmetics'>('electronics')
  const [mpStoreName, setMpStoreName] = useState('')
  const [mpBranch, setMpBranch] = useState('')
  const [mpCity, setMpCity] = useState('İzmir')
  const [mpDistrict, setMpDistrict] = useState('')
  const [mpAddress, setMpAddress] = useState('')
  const [mpLatitude, setMpLatitude] = useState<number | ''>('')
  const [mpLongitude, setMpLongitude] = useState<number | ''>('')
  const [mpInStock, setMpInStock] = useState(true)
  const [mpNotes, setMpNotes] = useState('')

  // Load manual products
  const loadManualProducts = async () => {
    try {
      setManualLoading(true)
      const params = new URLSearchParams()
      if (manualCategory !== 'all') params.append('category', manualCategory)
      if (manualCity.trim()) params.append('city', manualCity.trim())
      if (manualSearchQuery.trim()) params.append('query', manualSearchQuery.trim())
      params.append('page', manualPage.toString())
      params.append('per_page', manualPerPage.toString())

      const { data } = await apiClient.get(`/admin/manual-products?${params.toString()}`)
      setManualProducts(data.products || [])
      setManualTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to load manual products:', err)
    } finally {
      setManualLoading(false)
    }
  }

  // Load manual products on activeTab changes or query/filters changes
  useEffect(() => {
    if (activeTab === 'manual') {
      loadManualProducts()
    }
  }, [activeTab, manualPage, manualCategory, manualCity, manualSearchQuery])

  // ===== Scheduler API Operations =====
  
  const loadSchedulerStatus = async () => {
    try {
      setSchedulerLoading(true)
      const { data } = await apiClient.get('/admin/scheduler/status')
      setSchedulerStatus(data)
      if (data) {
        setSchedulerConfigHours(data.interval_hours || 24)
        setSchedulerConfigCronHour(data.cron_hour || 0)
        setSchedulerConfigCronMinute(data.cron_minute || 0)
        setSchedulerMode(data.interval_hours > 0 ? 'interval' : 'cron')
      }
      setSchedulerError(null)
    } catch (err: any) {
      console.error('Failed to load scheduler status:', err)
      setSchedulerError('Zamanlayıcı durumu alınamadı.')
    } finally {
      setSchedulerLoading(false)
    }
  }

  const loadScanHistory = async () => {
    try {
      const params = new URLSearchParams()
      params.append('page', schedulerPage.toString())
      params.append('per_page', schedulerPerPage.toString())
      const { data } = await apiClient.get(`/admin/scheduler/history?${params.toString()}`)
      setScanHistory(data.scans || [])
      setSchedulerHistoryTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to load scan history:', err)
    }
  }

  const handleStartScheduler = async () => {
    try {
      setSchedulerUpdating(true)
      const { data } = await apiClient.post('/admin/scheduler/start')
      setSchedulerStatus(data)
    } catch (err) {
      console.error('Failed to start scheduler:', err)
    } finally {
      setSchedulerUpdating(false)
    }
  }

  const handleStopScheduler = async () => {
    try {
      setSchedulerUpdating(true)
      const { data } = await apiClient.post('/admin/scheduler/stop')
      setSchedulerStatus(data)
    } catch (err) {
      console.error('Failed to stop scheduler:', err)
    } finally {
      setSchedulerUpdating(false)
    }
  }

  const handleConfigureScheduler = async () => {
    try {
      setSchedulerUpdating(true)
      const payload: any = {
        enabled: schedulerStatus?.enabled ?? true
      }
      if (schedulerMode === 'interval') {
        payload.interval_hours = schedulerConfigHours
        payload.cron_hour = 0
        payload.cron_minute = 0
      } else {
        payload.interval_hours = 0
        payload.cron_hour = schedulerConfigCronHour
        payload.cron_minute = schedulerConfigCronMinute
      }

      const { data } = await apiClient.post('/admin/scheduler/configure', payload)
      setSchedulerStatus(data)
      alert('Zamanlayıcı başarıyla güncellendi.')
    } catch (err) {
      console.error('Failed to configure scheduler:', err)
      alert('Zamanlayıcı yapılandırılması güncellenemedi.')
    } finally {
      setSchedulerUpdating(false)
    }
  }

  const handleRunScanNow = async () => {
    try {
      setRunNowLoading(true)
      await apiClient.post('/admin/scheduler/run-now')
      alert('Manuel tarama başarıyla tetiklendi ve tamamlandı.')
      loadSchedulerStatus()
      loadScanHistory()
    } catch (err) {
      console.error('Failed to trigger scan:', err)
      alert('Tarama başlatılamadı.')
    } finally {
      setRunNowLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'scheduler') {
      loadSchedulerStatus()
      loadScanHistory()
    }
  }, [activeTab, schedulerPage])

  // ===== Export Download Helper =====
  const handleExportDownload = async (endpoint: string, format: 'excel' | 'pdf', label: string) => {
    const key = `${endpoint}-${format}`
    setExportDownloading(key)
    try {
      const separator = endpoint.includes('?') ? '&' : '?'
      const response = await apiClient.get(`${endpoint}${separator}format=${format}`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = format === 'excel' ? '.xlsx' : '.pdf'
      a.download = `${label}${ext}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error(`Export failed (${format}):`, err)
      alert(`Dışa aktarma başarısız oldu. Lütfen tekrar deneyin.`)
    } finally {
      setExportDownloading(null)
    }
  }

  // Form handlers for Manual Product
  const handleManualFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setManualFormError(null)

    if (!mpProductName.trim()) {
      setManualFormError('Ürün adı zorunludur.')
      return
    }
    if (!mpStoreName.trim()) {
      setManualFormError('Mağaza adı zorunludur.')
      return
    }
    if (!mpCity.trim()) {
      setManualFormError('Şehir zorunludur.')
      return
    }

    const payload = {
      product_name: mpProductName.trim(),
      price: mpPrice !== '' ? parseFloat(mpPrice) : null,
      currency: mpCurrency,
      category: mpCategory,
      store_name: mpStoreName.trim(),
      branch: mpBranch.trim(),
      city: mpCity.trim(),
      district: mpDistrict.trim() || null,
      address: mpAddress.trim() || null,
      latitude: mpLatitude !== '' ? Number(mpLatitude) : null,
      longitude: mpLongitude !== '' ? Number(mpLongitude) : null,
      in_stock: mpInStock,
      notes: mpNotes.trim() || null
    }

    try {
      setManualSubmitting(true)
      if (isManualEditMode) {
        await apiClient.put(`/admin/manual-products/${mpId}`, payload)
      } else {
        await apiClient.post('/admin/manual-products', payload)
      }
      setIsManualModalOpen(false)
      loadManualProducts()
    } catch (err: any) {
      console.error('Manual product submit failed:', err)
      setManualFormError(err.response?.data?.detail || 'Ürün kaydedilemedi.')
    } finally {
      setManualSubmitting(false)
    }
  }

  const handleEditManualProduct = (product: any) => {
    setIsManualEditMode(true)
    setMpId(product.id)
    setMpProductName(product.product_name)
    setMpPrice(product.price !== null && product.price !== undefined ? product.price.toString() : '')
    setMpCurrency(product.currency || 'TRY')
    setMpCategory(product.category)
    setMpStoreName(product.store_name)
    setMpBranch(product.branch || '')
    setMpCity(product.city)
    setMpDistrict(product.district || '')
    setMpAddress(product.address || '')
    setMpLatitude(product.latitude !== null && product.latitude !== undefined ? product.latitude : '')
    setMpLongitude(product.longitude !== null && product.longitude !== undefined ? product.longitude : '')
    setMpInStock(product.in_stock !== false)
    setMpNotes(product.notes || '')
    
    setManualFormError(null)
    setIsManualModalOpen(true)
  }

  const handleDeleteManualProduct = async (id: string) => {
    if (!window.confirm('Bu manuel ürünü silmek istediğinize emin misiniz?')) {
      return
    }
    try {
      await apiClient.delete(`/admin/manual-products/${id}`)
      loadManualProducts()
    } catch (err) {
      console.error('Failed to delete manual product:', err)
      alert('Ürün silinemedi.')
    }
  }

  const handleOpenAddManualModal = () => {
    setIsManualEditMode(false)
    setMpId('')
    setMpProductName('')
    setMpPrice('')
    setMpCurrency('TRY')
    setMpCategory('electronics')
    setMpStoreName('')
    setMpBranch('')
    setMpCity('İzmir')
    setMpDistrict('')
    setMpAddress('')
    setMpLatitude('')
    setMpLongitude('')
    setMpInStock(true)
    setMpNotes('')
    
    setManualFormError(null)
    setIsManualModalOpen(true)
  }

  // Dynamic Map center for the map picker inside Create/Edit Modal
  const mapCenter: [number, number] = useMemo(() => {
    if (mpLatitude !== '' && mpLongitude !== '') {
      return [Number(mpLatitude), Number(mpLongitude)]
    }
    // Default to city centers
    if (mpCity.toLowerCase().includes('ist')) return [41.0082, 28.9784]
    if (mpCity.toLowerCase().includes('ank')) return [39.9334, 32.8597]
    return [38.4237, 27.1428] // İzmir default
  }, [mpLatitude, mpLongitude, mpCity])

  const handleMapClick = ({ latLng }: { latLng: [number, number] }) => {
    setMpLatitude(Number(latLng[0].toFixed(6)))
    setMpLongitude(Number(latLng[1].toFixed(6)))
  }



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

  // Toggle store status (active/passive)
  const handleToggleStore = async (key: string) => {
    const originalStores = [...stores]
    // Optimistic UI Update
    setStores(prev => prev.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s))
    
    try {
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 1.0 }}
        className="fixed inset-0 grid-bg grid-bg-fade gradient-mesh pointer-events-none z-0"
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
            {activeTab === 'stores' ? (
              <Button
                onClick={handleOpenAddModal}
                className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] h-9 px-4 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Store
              </Button>
            ) : activeTab === 'manual' ? (
              <Button
                onClick={handleOpenAddManualModal}
                className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] h-9 px-4 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" /> Ürün Ekle
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="container mx-auto px-4 pt-8 relative z-10 flex-1 flex flex-col gap-6"
      >

        {/* Sub-Navigation Tabs */}
        <div className="flex gap-6 border-b border-border/40 pb-px">
          <button
            onClick={() => setActiveTab('stores')}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold tracking-tight transition-all relative
              ${activeTab === 'stores' 
                ? 'text-primary border-b-2 border-primary font-bold' 
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <Store className="w-4 h-4" />
            <span>🏪 E-Ticaret Mağazaları</span>
          </button>
          
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold tracking-tight transition-all relative
              ${activeTab === 'manual' 
                ? 'text-primary border-b-2 border-primary font-bold' 
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <Package className="w-4 h-4" />
            <span>📦 Manuel Stok Girişi</span>
          </button>

          <button
            onClick={() => setActiveTab('scheduler')}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold tracking-tight transition-all relative
              ${activeTab === 'scheduler' 
                ? 'text-primary border-b-2 border-primary font-bold' 
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <Clock className="w-4 h-4 animate-pulse" />
            <span>⏰ Zamanlayıcı (Oto Tarama)</span>
          </button>
        </div>

        {/* ===== Notification Center Panel (Rapor & Bildirim Merkezi) ===== */}
        <AnimatePresence>
          {showNotifPanel && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -15 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="glass-strong rounded-2xl p-6 shadow-xl border border-indigo-500/20 overflow-hidden" 
              style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.06) 100%)'}}
            >
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
          </motion.div>
        )}
      </AnimatePresence>

        {activeTab === 'stores' && (
          <>
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
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search store brand..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs glass border-border/50 focus-visible:ring-primary focus-visible:ring-1 focus-visible:ring-offset-0 bg-transparent placeholder:text-muted-foreground/45"
                  />
                </div>
                {/* Export Buttons */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-[11px] font-semibold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-all gap-1.5"
                    disabled={exportDownloading === '/export/stores-excel'}
                    onClick={() => handleExportDownload('/export/stores', 'excel', 'magaza_listesi')}
                  >
                    {exportDownloading === '/export/stores-excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-[11px] font-semibold border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all gap-1.5"
                    disabled={exportDownloading === '/export/stores-pdf'}
                    onClick={() => handleExportDownload('/export/stores', 'pdf', 'magaza_listesi')}
                  >
                    {exportDownloading === '/export/stores-pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    PDF
                  </Button>
                </div>
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
              <motion.div 
                layout
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {filteredStores.map((store) => {
                    const catDesign = CATEGORY_STYLES[store.category] || {
                      bg: 'bg-muted border-border text-muted-foreground',
                      dot: 'bg-muted-foreground',
                      label: store.category
                    }
                    
                    return (
                      <motion.div
                        layout
                        key={store.key}
                        variants={itemVariants}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        data-store-key={store.key}
                        className={`store-card glass-strong rounded-2xl p-5 flex flex-col justify-between relative shadow-md hover:shadow-xl transition-all duration-300 hover:border-primary/20
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
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Globe className="w-3.5 h-3.5 text-muted-foreground/75" />
                            <span className="truncate">{store.domain}</span>
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
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}

        {activeTab === 'manual' && (
          <>
            {/* Filters and Search Bar Container */}
            <div className="glass-strong rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {['all', 'electronics', 'appliances', 'clothing', 'sports', 'cosmetics'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setManualCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-300 capitalize
                      ${manualCategory === cat 
                        ? 'gradient-primary text-white border-transparent shadow-md' 
                        : 'glass text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 border-border/50'
                      }
                    `}
                  >
                    {cat === 'all' ? 'Tüm Kategoriler' : cat}
                  </button>
                ))}
              </div>

              {/* Search bar & City filter inside admin */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Ürün adı ara..."
                    value={manualSearchQuery}
                    onChange={(e) => setManualSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs glass border-border/50 focus-visible:ring-primary bg-transparent placeholder:text-muted-foreground/45"
                  />
                </div>
                <div className="relative w-full sm:w-40">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Şehir (örn: İzmir)..."
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    className="pl-9 h-9 text-xs glass border-border/50 focus-visible:ring-primary bg-transparent placeholder:text-muted-foreground/45"
                  />
                </div>
                {/* Export Buttons */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-[11px] font-semibold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-all gap-1.5"
                    disabled={exportDownloading === '/export/manual-products-excel'}
                    onClick={() => handleExportDownload('/export/manual-products', 'excel', 'manuel_urunler')}
                  >
                    {exportDownloading === '/export/manual-products-excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-[11px] font-semibold border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all gap-1.5"
                    disabled={exportDownloading === '/export/manual-products-pdf'}
                    onClick={() => handleExportDownload('/export/manual-products', 'pdf', 'manuel_urunler')}
                  >
                    {exportDownloading === '/export/manual-products-pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* Dynamic Loading State */}
            {manualLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="animate-spin text-primary w-10 h-10 mb-4" />
                <p className="text-muted-foreground text-sm font-medium">Manuel ürünler getiriliyor...</p>
              </div>
            ) : manualProducts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] glass-strong rounded-2xl border-dashed border-border p-12">
                <FolderOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-sm font-medium">Manuel stok kaydı bulunamadı.</p>
                <p className="text-muted-foreground/50 text-xs mt-1">Elde satış yapan dükkanlar için yeni ürün stokları ekleyin.</p>
              </div>
            ) : (
              /* Products Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {manualProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`glass-strong rounded-2xl p-5 flex flex-col justify-between relative shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.01] hover:border-primary/20
                      ${!product.in_stock ? 'opacity-65 grayscale-[35%]' : ''}
                    `}
                  >
                    {/* Header: Category Tag & Stock switch */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold border capitalize tracking-wider bg-primary/10 border-primary/20 text-primary">
                        {product.category}
                      </span>
                      
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        product.in_stock 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {product.in_stock ? 'Stokta' : 'Stokta Yok'}
                      </span>
                    </div>

                    {/* Product details */}
                    <div className="mb-4">
                      <h3 className="text-base font-bold tracking-tight mb-2">
                        {product.product_name}
                      </h3>
                      
                      <div className="text-xs space-y-1.5 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-semibold text-foreground">{product.store_name}</span>
                          {product.branch && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Şube: {product.branch}</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-400" />
                          <span>{[product.district, product.city].filter(Boolean).join(', ')}</span>
                        </div>
                        {product.address && (
                          <div className="text-[10px] italic leading-tight pl-5">
                            {product.address}
                          </div>
                        )}
                        {product.latitude !== null && product.longitude !== null && (
                          <div className="text-[9px] font-mono pl-5 text-muted-foreground/60">
                            🌐 {product.latitude.toFixed(4)}, {product.longitude.toFixed(4)}
                          </div>
                        )}
                        {product.notes && (
                          <div className="text-[10px] bg-muted/40 p-2 rounded-lg border border-border/30 mt-2 text-foreground/80">
                            📝 {product.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price and Action Buttons */}
                    <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-auto">
                      <span className="text-base font-bold font-mono text-primary">
                        {product.price !== null && product.price !== undefined 
                          ? `${product.price.toLocaleString('tr-TR')} ${product.currency}`
                          : 'Fiyat Belirtilmemiş'}
                      </span>

                      <div className="flex gap-2.5">
                        <button 
                          onClick={() => handleEditManualProduct(product)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Düzenle"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteManualProduct(product.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {manualTotal > manualPerPage && (
              <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t border-border/20">
                <Button
                  disabled={manualPage === 1}
                  onClick={() => setManualPage(prev => Math.max(1, prev - 1))}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  Geri
                </Button>
                <span className="text-xs font-medium">
                  Sayfa {manualPage} / {Math.ceil(manualTotal / manualPerPage)} (Toplam {manualTotal} Ürün)
                </span>
                <Button
                  disabled={manualPage >= Math.ceil(manualTotal / manualPerPage)}
                  onClick={() => setManualPage(prev => prev + 1)}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  İleri
                </Button>
              </div>
            )}
          </>
        )}

        {activeTab === 'scheduler' && (
          <>
            {/* Export Buttons for Scheduler */}
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground mr-2">Tarama Geçmişi Dışa Aktar:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-[11px] font-semibold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-all gap-1.5"
                disabled={exportDownloading === '/export/scan-history-excel'}
                onClick={() => handleExportDownload('/export/scan-history', 'excel', 'tarama_gecmisi')}
              >
                {exportDownloading === '/export/scan-history-excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-[11px] font-semibold border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all gap-1.5"
                disabled={exportDownloading === '/export/scan-history-pdf'}
                onClick={() => handleExportDownload('/export/scan-history', 'pdf', 'tarama_gecmisi')}
              >
                {exportDownloading === '/export/scan-history-pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                PDF
              </Button>
            </div>

            {/* Scheduler Status and Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Card 1: Status & Quick Controls */}
              <div className="glass-strong rounded-2xl p-6 shadow-lg border border-border/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-400" />
                      Zamanlayıcı Durumu
                    </h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      schedulerStatus?.is_running 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${schedulerStatus?.is_running ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                      {schedulerStatus?.is_running ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>

                  {schedulerLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-primary w-8 h-8" />
                    </div>
                  ) : schedulerError ? (
                    <div className="text-destructive text-sm py-4">{schedulerError}</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="glass rounded-xl p-3 border border-border/20">
                          <span className="text-[11px] text-muted-foreground block mb-1">Çalışma Modu</span>
                          <span className="text-sm font-semibold capitalize text-foreground">
                            {schedulerStatus?.mode === 'interval' 
                              ? `Aralıklı (${schedulerStatus?.interval_hours} Saat)` 
                              : `Cron (${String(schedulerStatus?.cron_hour).padStart(2, '0')}:${String(schedulerStatus?.cron_minute).padStart(2, '0')})`}
                          </span>
                        </div>
                        <div className="glass rounded-xl p-3 border border-border/20">
                          <span className="text-[11px] text-muted-foreground block mb-1">Bir Sonraki Çalışma</span>
                          <span className="text-sm font-semibold text-foreground">
                            {schedulerStatus?.next_run_time 
                              ? new Date(schedulerStatus.next_run_time).toLocaleString('tr-TR') 
                              : 'Planlanmadı'}
                          </span>
                        </div>
                      </div>

                      {schedulerStatus?.last_scan && (
                        <div className="glass rounded-xl p-4 border border-border/20 mt-4">
                          <h4 className="text-xs font-bold mb-2 text-indigo-400 uppercase tracking-wider">Son Otomatik Tarama Özeti</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <div className="bg-card/30 rounded-lg p-2 border border-border/10">
                              <span className="text-[10px] text-muted-foreground block">Taranan Ürün</span>
                              <span className="text-sm font-bold font-mono">{schedulerStatus.last_scan.total_items}</span>
                            </div>
                            <div className="bg-card/30 rounded-lg p-2 border border-border/10">
                              <span className="text-[10px] text-muted-foreground block">Tetiklenen Alarm</span>
                              <span className="text-sm font-bold font-mono text-emerald-400">{schedulerStatus.last_scan.alerts_triggered}</span>
                            </div>
                            <div className="bg-card/30 rounded-lg p-2 border border-border/10">
                              <span className="text-[10px] text-muted-foreground block">Hata Sayısı</span>
                              <span className="text-sm font-bold font-mono text-red-400">{schedulerStatus.last_scan.errors}</span>
                            </div>
                            <div className="bg-card/30 rounded-lg p-2 border border-border/10">
                              <span className="text-[10px] text-muted-foreground block">Süre (sn)</span>
                              <span className="text-sm font-bold font-mono">{schedulerStatus.last_scan.duration_seconds?.toFixed(1) || 0}s</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6 border-t border-border/20 pt-4">
                  {schedulerStatus?.is_running ? (
                    <Button 
                      onClick={handleStopScheduler} 
                      disabled={schedulerUpdating}
                      variant="destructive"
                      className="flex-1 text-xs font-semibold h-10 transition-all duration-300"
                    >
                      <Pause className="w-4 h-4 mr-2" /> Zamanlayıcıyı Durdur
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStartScheduler} 
                      disabled={schedulerUpdating}
                      className="flex-1 text-xs font-semibold h-10 gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Play className="w-4 h-4 mr-2" /> Zamanlayıcıyı Başlat
                    </Button>
                  )}
                  
                  <Button 
                    onClick={handleRunScanNow} 
                    disabled={runNowLoading}
                    variant="outline"
                    className="flex-1 text-xs font-semibold h-10 glass border-border/50 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all duration-300"
                  >
                    {runNowLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Tarama Yapılıyor...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" /> Şimdi Tara (Manuel Tetikle)
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Card 2: Configuration & Reschedule */}
              <div className="glass-strong rounded-2xl p-6 shadow-lg border border-border/40 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight mb-6 flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-indigo-400" />
                    Zamanlayıcı Ayarları
                  </h3>

                  <div className="space-y-4">
                    {/* Mode selector */}
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-2 block font-medium">Tarama Frekans Modu</label>
                      <div className="grid grid-cols-2 gap-2 bg-card/40 p-1 rounded-xl border border-border/30">
                        <button
                          type="button"
                          onClick={() => setSchedulerMode('interval')}
                          className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                            schedulerMode === 'interval'
                              ? 'gradient-primary text-white shadow-md'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Saatlik Periyot
                        </button>
                        <button
                          type="button"
                          onClick={() => setSchedulerMode('cron')}
                          className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                            schedulerMode === 'cron'
                              ? 'gradient-primary text-white shadow-md'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Belirli Saat (Her Gün)
                        </button>
                      </div>
                    </div>

                    {/* Mode specific fields */}
                    {schedulerMode === 'interval' ? (
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Tekrarlama Aralığı (Saat)</label>
                        <select
                          value={schedulerConfigHours}
                          onChange={(e) => setSchedulerConfigHours(parseInt(e.target.value))}
                          className="w-full h-9 rounded-lg border border-border/50 bg-card/50 text-xs px-3 text-foreground outline-none focus:border-primary/50 transition-colors"
                        >
                          <option value={1}>Her 1 Saat</option>
                          <option value={2}>Her 2 Saat</option>
                          <option value={4}>Her 4 Saat</option>
                          <option value={6}>Her 6 Saat</option>
                          <option value={12}>Her 12 Saat</option>
                          <option value={24}>Her 24 Saat (Günde 1)</option>
                          <option value={48}>Her 48 Saat (2 Günde 1)</option>
                          <option value={72}>Her 72 Saat (3 Günde 1)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Saat (0-23)</label>
                          <Input
                            type="number"
                            min={0}
                            max={23}
                            value={schedulerConfigCronHour}
                            onChange={(e) => setSchedulerConfigCronHour(parseInt(e.target.value) || 0)}
                            className="h-9 text-xs bg-card/50 border-border/50"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Dakika (0-59)</label>
                          <Input
                            type="number"
                            min={0}
                            max={59}
                            value={schedulerConfigCronMinute}
                            onChange={(e) => setSchedulerConfigCronMinute(parseInt(e.target.value) || 0)}
                            className="h-9 text-xs bg-card/50 border-border/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-border/20 pt-4">
                  <Button
                    onClick={handleConfigureScheduler}
                    disabled={schedulerUpdating}
                    className="w-full text-xs font-semibold h-10 gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {schedulerUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...
                      </>
                    ) : (
                      'Ayarları Kaydet ve Yeniden Planla'
                    )}
                  </Button>
                </div>
              </div>

            </div>

            {/* Scan History Section */}
            <div className="glass-strong rounded-2xl p-6 shadow-lg border border-border/40 mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  Tarama Geçmişi
                </h3>
                <span className="text-xs text-muted-foreground">Toplam {schedulerHistoryTotal} tarama kaydı</span>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Başlangıç</th>
                      <th className="py-3 px-4">Tetikleyen</th>
                      <th className="py-3 px-4">Süre</th>
                      <th className="py-3 px-4 text-center">Taranan Ürün</th>
                      <th className="py-3 px-4 text-center">Gönderilen Alarm</th>
                      <th className="py-3 px-4 text-center">Hatalar</th>
                      <th className="py-3 px-4 text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground italic">
                          Henüz hiçbir tarama kaydı bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      scanHistory.map((scan) => {
                        const hasErrors = scan.errors > 0;
                        const isSuccess = !hasErrors && scan.completed_at;
                        return (
                          <tr key={scan.id || scan.started_at} className="border-b border-border/20 hover:bg-card/10 transition-colors">
                            <td className="py-3 px-4 font-medium text-foreground">
                              {new Date(scan.started_at).toLocaleString('tr-TR')}
                            </td>
                            <td className="py-3 px-4 capitalize">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                scan.trigger === 'manual' 
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {scan.trigger === 'manual' ? 'Manuel' : 'Otomatik'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-muted-foreground">
                              {scan.duration_seconds ? `${scan.duration_seconds.toFixed(1)} sn` : '-'}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-semibold">
                              {scan.total_items}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-emerald-400 font-semibold">
                              {scan.alerts_triggered}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-red-400 font-semibold">
                              {scan.errors}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isSuccess 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {isSuccess ? 'Başarılı' : 'Hatalı'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination for history */}
              {schedulerHistoryTotal > schedulerPerPage && (
                <div className="flex items-center justify-center gap-4 pt-4 border-t border-border/20">
                  <Button
                    disabled={schedulerPage === 1}
                    onClick={() => setSchedulerPage(prev => Math.max(1, prev - 1))}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    Geri
                  </Button>
                  <span className="text-xs font-medium">
                    Sayfa {schedulerPage} / {Math.ceil(schedulerHistoryTotal / schedulerPerPage)}
                  </span>
                  <Button
                    disabled={schedulerPage >= Math.ceil(schedulerHistoryTotal / schedulerPerPage)}
                    onClick={() => setSchedulerPage(prev => prev + 1)}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    İleri
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </motion.main>

      {/* CRUD Overlay Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto" 
              onClick={() => setIsModalOpen(false)} 
            />
            
            {/* Form Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="relative w-full max-w-xl glass-strong rounded-2xl shadow-2xl p-6 border border-border overflow-hidden z-10 animate-pulse-glow pointer-events-auto"
            >
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manuel Ürün Ekleme/Düzenleme Modalı */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto" 
              onClick={() => setIsManualModalOpen(false)} 
            />
            
            {/* Form Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="relative w-full max-w-xl glass-strong rounded-2xl shadow-2xl p-6 border border-border z-10 my-8 pointer-events-auto"
            >
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {isManualEditMode ? `Ürünü Düzenle: ${mpProductName}` : 'Yeni Manuel Ürün Ekle'}
              </h2>
              <button 
                onClick={() => setIsManualModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {manualFormError && (
              <div className="mb-4 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{manualFormError}</span>
              </div>
            )}

            <form onSubmit={handleManualFormSubmit} className="space-y-4">
              {/* Ürün Adı */}
              <div>
                <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                  Ürün Adı *
                </label>
                <Input
                  placeholder="örn: iPhone 15 Pro Max 256GB Siyah"
                  value={mpProductName}
                  onChange={(e) => setMpProductName(e.target.value)}
                  className="h-9 glass border-border/50 text-xs focus-visible:ring-primary focus-visible:ring-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Fiyat */}
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    Fiyat (TRY)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="74999.00"
                    value={mpPrice}
                    onChange={(e) => setMpPrice(e.target.value)}
                    className="h-9 glass border-border/50 text-xs focus-visible:ring-primary focus-visible:ring-1"
                  />
                </div>
                
                {/* Kategori */}
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    Kategori *
                  </label>
                  <select
                    value={mpCategory}
                    onChange={(e) => setMpCategory(e.target.value as any)}
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

              <div className="grid grid-cols-2 gap-4">
                {/* Mağaza Adı */}
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    Mağaza / Esnaf Adı *
                  </label>
                  <Input
                    placeholder="örn: Akman İletişim"
                    value={mpStoreName}
                    onChange={(e) => setMpStoreName(e.target.value)}
                    className="h-9 glass border-border/50 text-xs focus-visible:ring-primary"
                    required
                  />
                </div>
                
                {/* Şube */}
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    Şube / Lokasyon Etiketi
                  </label>
                  <Input
                    placeholder="örn: Bornova Şubesi"
                    value={mpBranch}
                    onChange={(e) => setMpBranch(e.target.value)}
                    className="h-9 glass border-border/50 text-xs focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Şehir */}
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    Şehir *
                  </label>
                  <Input
                    placeholder="İzmir"
                    value={mpCity}
                    onChange={(e) => setMpCity(e.target.value)}
                    className="h-9 glass border-border/50 text-xs focus-visible:ring-primary"
                    required
                  />
                </div>

                {/* İlçe */}
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    İlçe
                  </label>
                  <Input
                    placeholder="Bornova"
                    value={mpDistrict}
                    onChange={(e) => setMpDistrict(e.target.value)}
                    className="h-9 glass border-border/50 text-xs focus-visible:ring-primary"
                  />
                </div>

                {/* Adres */}
                <div className="col-span-1">
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    Açık Adres
                  </label>
                  <Input
                    placeholder="Bornova Cd. No:4"
                    value={mpAddress}
                    onChange={(e) => setMpAddress(e.target.value)}
                    className="h-9 glass border-border/50 text-xs focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Enlem */}
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    Enlem (Latitude)
                  </label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="38.4628"
                    value={mpLatitude}
                    onChange={(e) => setMpLatitude(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="h-9 glass border-border/50 text-xs focus-visible:ring-primary"
                  />
                </div>

                {/* Boylam */}
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                    Boylam (Longitude)
                  </label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="27.2199"
                    value={mpLongitude}
                    onChange={(e) => setMpLongitude(e.target.value !== '' ? Number(e.target.value) : '')}
                    className="h-9 glass border-border/50 text-xs focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* Map Picker Component */}
              <div>
                <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                  Haritadan Konum Seç (Dükkanın üzerine tıklayın)
                </label>
                <div className="w-full h-[220px] rounded-xl overflow-hidden border border-border/50 relative">
                  <PigeonMap
                    height={220}
                    center={mapCenter}
                    zoom={12}
                    onClick={handleMapClick}
                  >
                    {mpLatitude !== '' && mpLongitude !== '' && (
                      <PigeonMarker anchor={[Number(mpLatitude), Number(mpLongitude)]} />
                    )}
                  </PigeonMap>
                  <div className="absolute bottom-2 left-2 right-2 bg-black/85 backdrop-blur-sm text-[9px] text-muted-foreground px-2.5 py-1 rounded-md text-center">
                    Tıklandığında koordinatlar enlem ve boylam alanlarına otomatik doldurulur.
                  </div>
                </div>
              </div>

              {/* Açıklama / Notlar */}
              <div>
                <label className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider block mb-1">
                  Ek Notlar / Açıklama
                </label>
                <textarea
                  placeholder="örn: Salı günleri kapalı, sadece nakit geçerli vb."
                  value={mpNotes}
                  onChange={(e) => setMpNotes(e.target.value)}
                  className="w-full min-h-[60px] rounded-lg border border-border/50 bg-card text-foreground p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-6">
                {/* Stokta mı checkbox toggle */}
                <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={mpInStock}
                    onChange={(e) => setMpInStock(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-card"
                  />
                  <span>Stokta Var</span>
                </label>

                {/* Form Actions */}
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsManualModalOpen(false)}
                    className="text-xs h-9 px-4 rounded-lg"
                  >
                    Vazgeç
                  </Button>
                  <Button
                    type="submit"
                    disabled={manualSubmitting}
                    className="gradient-primary text-white shadow-lg text-xs h-9 px-5 rounded-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    {manualSubmitting ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      'Kaydet'
                    )}
                  </Button>
                </div>
              </div>
            </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

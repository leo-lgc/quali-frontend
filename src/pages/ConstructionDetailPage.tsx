import { ArrowLeft, CalendarDays, Camera, ClipboardList, FileText, Hammer, Users } from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChecklistModal } from '../components/construction-detail/ChecklistModal'
import { DetailInfoSection } from '../components/construction-detail/DetailInfoSection'
import { DetailModuleCard } from '../components/construction-detail/DetailModuleCard'
import { MaterialsModal } from '../components/construction-detail/MaterialsModal'
import { PhotosModal } from '../components/construction-detail/PhotosModal'
import { TeamModal } from '../components/construction-detail/TeamModal'
import { useToast } from '../components/feedback/ToastProvider'
import { ApiError, apiRequest } from '../lib/api'
import { useAuth } from '../features/auth/AuthContext'

type Status = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'
type Weather = 'SUNNY' | 'CLOUDY' | 'RAINY' | 'STORMY' | 'SNOWY' | 'WINDY'
type TabKey = 'overview' | 'checklist'

type ReportResponse = {
  id: number
  name: string
  localContact: string
  client: {
    name: string
    phone: string
    email: string
  }
  address: {
    cep: string
    city: string
    street: string
    neighborhood: string
    number: number
    complement: string | null
  }
  workers: Array<{
    id: number
    email: string
  }>
  startDate: string
  endDate: string
  agreedDeadLine: number
  daysElapsed: number
  overdueDays: number
  isCorrective: boolean
  status: Status
  weather: Weather | null
  comments: string | null
  pictures: Array<{
    url: string
  }>
}

type CheckListItem = {
  id: number
  title: string
  checked: boolean
}

type CheckList = {
  id: number
  constructionId: number
  items: CheckListItem[]
}

type Material = {
  id: number
  name: string
  amount: number
  isAvailable: boolean
}

type Photo = {
  id: number
  url: string
  uploadDate: string
  description: string | null
}

type PagedResponse<T> = {
  content: T[]
}

type MaterialFormState = {
  name: string
  amount: string
}

const statusLabel: Record<Status, string> = {
  SCHEDULED: 'Aguardando inicio',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Finalizada',
}

export function ConstructionDetailPage() {
  const { constructionId } = useParams()
  const { token } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false)
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false)
  const [report, setReport] = useState<ReportResponse | null>(null)
  const [checkListId, setCheckListId] = useState<number | null>(null)
  const [checklistItems, setChecklistItems] = useState<CheckListItem[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [materialForm, setMaterialForm] = useState<MaterialFormState>({ name: '', amount: '0' })
  const [materialEditForm, setMaterialEditForm] = useState<MaterialFormState>({ name: '', amount: '0' })
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null)
  const [isMaterialSubmitting, setIsMaterialSubmitting] = useState(false)
  const [materialActionId, setMaterialActionId] = useState<number | null>(null)
  const [materialsError, setMaterialsError] = useState('')
  const [isPhotoUploading, setIsPhotoUploading] = useState(false)
  const [photoDeleteId, setPhotoDeleteId] = useState<number | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [photosError, setPhotosError] = useState('')
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState('')
  const [photoDescription, setPhotoDescription] = useState('')
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isChecklistLoading, setIsChecklistLoading] = useState(false)
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false)
  const [isCreatingItem, setIsCreatingItem] = useState(false)
  const [checklistError, setChecklistError] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      if (!constructionId) {
        setError('Obra nao encontrada.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const [reportResponse, materialsResponse, photosResponse] = await Promise.all([
          apiRequest<ReportResponse>(`/construction/report/${constructionId}`, { token }),
          apiRequest<PagedResponse<Material>>(`/material/${constructionId}`, { token }),
          apiRequest<PagedResponse<Photo>>(`/photos/construction/${constructionId}`, { token }),
        ])

        setReport({
          ...reportResponse,
          pictures: reportResponse.pictures ?? [],
          workers: reportResponse.workers ?? [],
          client: reportResponse.client ?? {
            name: 'Cliente nao informado',
            phone: '-',
            email: '-',
          },
          daysElapsed: reportResponse.daysElapsed ?? 0,
          overdueDays: reportResponse.overdueDays ?? 0,
        })
        setMaterials(materialsResponse.content ?? [])
        setPhotos(photosResponse.content ?? [])
        await loadChecklistData(constructionId)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Nao foi possivel carregar os detalhes da obra.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [constructionId, token])

  async function loadChecklistData(currentConstructionId: string) {
    setIsChecklistLoading(true)
    setChecklistError('')

    try {
      const checkListResponse = await apiRequest<CheckList>(`/checklist/construction/${currentConstructionId}`, {
        token,
      })

      setCheckListId(checkListResponse.id)
      setChecklistItems(checkListResponse.items ?? [])
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setCheckListId(null)
        setChecklistItems([])
        return
      }

      if (err instanceof ApiError) {
        setChecklistError(err.message)
      } else {
        setChecklistError('Nao foi possivel carregar o checklist.')
      }
    } finally {
      setIsChecklistLoading(false)
    }
  }

  async function loadMaterials(currentConstructionId: string) {
    const materialsResponse = await apiRequest<PagedResponse<Material>>(`/material/${currentConstructionId}`, { token })
    setMaterials(materialsResponse.content ?? [])
  }

  async function loadPhotos(currentConstructionId: string) {
    const photosResponse = await apiRequest<PagedResponse<Photo>>(`/photos/construction/${currentConstructionId}`, {
      token,
    })
    setPhotos(photosResponse.content ?? [])
  }

  async function reloadReport() {
    if (!constructionId) return

    try {
      const reportResponse = await apiRequest<ReportResponse>(`/construction/report/${constructionId}`, { token })

      setReport({
        ...reportResponse,
        pictures: reportResponse.pictures ?? [],
        workers: reportResponse.workers ?? [],
        client: reportResponse.client ?? {
          name: 'Cliente nao informado',
          phone: '-',
          email: '-',
        },
        daysElapsed: reportResponse.daysElapsed ?? 0,
        overdueDays: reportResponse.overdueDays ?? 0,
      })
    } catch {
      toast.error('Nao foi possivel recarregar os dados da obra.')
    }
  }

  async function handleCreateChecklist() {
    if (!constructionId) return

    setIsCreatingChecklist(true)
    setChecklistError('')

    try {
      const response = await apiRequest<CheckList>(`/checklist/${constructionId}`, {
        method: 'POST',
        token,
      })

      setCheckListId(response.id)
      setChecklistItems(response.items ?? [])
    } catch (err) {
      if (err instanceof ApiError) {
        setChecklistError(err.message)
      } else {
        setChecklistError('Nao foi possivel criar o checklist.')
      }
    } finally {
      setIsCreatingChecklist(false)
    }
  }

  async function handleCreateChecklistItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!checkListId || !newChecklistItem.trim()) return

    setIsCreatingItem(true)
    setChecklistError('')

    try {
      const createdItem = await apiRequest<CheckListItem>(`/checklist/item/${checkListId}`, {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newChecklistItem.trim() }),
      })

      setChecklistItems((current) => [...current, createdItem])
      setNewChecklistItem('')
    } catch (err) {
      if (err instanceof ApiError) {
        setChecklistError(err.message)
      } else {
        setChecklistError('Nao foi possivel criar o item.')
      }
    } finally {
      setIsCreatingItem(false)
    }
  }

  async function handleToggleChecklistItem(itemId: number) {
    setChecklistError('')

    try {
      const updatedItem = await apiRequest<CheckListItem>(`/checklist/item/${itemId}`, {
        method: 'PATCH',
        token,
      })

      setChecklistItems((current) => current.map((item) => (item.id === itemId ? updatedItem : item)))
    } catch (err) {
      if (err instanceof ApiError) {
        setChecklistError(err.message)
      } else {
        setChecklistError('Nao foi possivel atualizar o item.')
      }
    }
  }

  async function handleDeleteChecklistItem(itemId: number) {
    setChecklistError('')

    try {
      await apiRequest(`/checklist/item/${itemId}`, {
        method: 'DELETE',
        token,
      })

      setChecklistItems((current) => current.filter((item) => item.id !== itemId))
    } catch (err) {
      if (err instanceof ApiError) {
        setChecklistError(err.message)
      } else {
        setChecklistError('Nao foi possivel excluir o item.')
      }
    }
  }

  async function handleCreateMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!constructionId) return

    setIsMaterialSubmitting(true)
    setMaterialsError('')

    try {
      await apiRequest('/material', {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          constructionId: Number(constructionId),
          name: materialForm.name.trim(),
          amount: Number(materialForm.amount || 0),
        }),
      })

      await loadMaterials(constructionId)
      setMaterialForm({ name: '', amount: '0' })
      toast.success('Material adicionado com sucesso.')
    } catch (err) {
      if (err instanceof ApiError) {
        setMaterialsError(err.message)
      } else {
        setMaterialsError('Nao foi possivel adicionar o material.')
      }
    } finally {
      setIsMaterialSubmitting(false)
    }
  }

  async function handleIncreaseMaterial(materialId: number) {
    if (!constructionId) return

    setMaterialActionId(materialId)
    setMaterialsError('')

    try {
      await apiRequest(`/material/amount/${materialId}/1`, {
        method: 'PATCH',
        token,
      })

      await loadMaterials(constructionId)
      toast.success('Quantidade atualizada.')
    } catch (err) {
      if (err instanceof ApiError) {
        setMaterialsError(err.message)
      } else {
        setMaterialsError('Nao foi possivel atualizar a quantidade.')
      }
    } finally {
      setMaterialActionId(null)
    }
  }

  async function handleDecreaseMaterial(materialId: number, currentAmount: number) {
    if (!constructionId || currentAmount <= 0) return

    setMaterialActionId(materialId)
    setMaterialsError('')

    try {
      await apiRequest(`/material/amount/${materialId}/-1`, {
        method: 'PATCH',
        token,
      })

      await loadMaterials(constructionId)
      toast.success('Quantidade atualizada.')
    } catch (err) {
      if (err instanceof ApiError) {
        setMaterialsError(err.message)
      } else {
        setMaterialsError('Nao foi possivel atualizar a quantidade.')
      }
    } finally {
      setMaterialActionId(null)
    }
  }

  async function handleDeleteMaterial(materialId: number) {
    if (!constructionId) return

    setMaterialActionId(materialId)
    setMaterialsError('')

    try {
      await apiRequest(`/material/${materialId}`, {
        method: 'DELETE',
        token,
      })

      await loadMaterials(constructionId)
      toast.success('Material removido com sucesso.')
    } catch (err) {
      if (err instanceof ApiError) {
        setMaterialsError(err.message)
      } else {
        setMaterialsError('Nao foi possivel remover o material.')
      }
    } finally {
      setMaterialActionId(null)
    }
  }

  function handleStartEditMaterial(material: Material) {
    setEditingMaterialId(material.id)
    setMaterialEditForm({
      name: material.name,
      amount: String(material.amount ?? 0),
    })
    setMaterialsError('')
  }

  function handleCancelEditMaterial() {
    setEditingMaterialId(null)
    setMaterialEditForm({ name: '', amount: '0' })
  }

  async function handleSaveMaterial(materialId: number) {
    if (!constructionId) return

    setMaterialActionId(materialId)
    setMaterialsError('')

    try {
      await apiRequest('/material', {
        method: 'PATCH',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: materialId,
          name: materialEditForm.name.trim(),
          amount: Number(materialEditForm.amount || 0),
        }),
      })

      await loadMaterials(constructionId)
      handleCancelEditMaterial()
      toast.success('Material atualizado com sucesso.')
    } catch (err) {
      if (err instanceof ApiError) {
        setMaterialsError(err.message)
      } else {
        setMaterialsError('Nao foi possivel atualizar o material.')
      }
    } finally {
      setMaterialActionId(null)
    }
  }

  function handlePhotoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null

    if (selectedPhotoPreviewUrl) {
      URL.revokeObjectURL(selectedPhotoPreviewUrl)
    }

    setSelectedPhotoFile(file)
    setSelectedPhotoPreviewUrl(file ? URL.createObjectURL(file) : '')
    setPhotosError('')
  }

  async function handleUploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!constructionId || !selectedPhotoFile) return

    setIsPhotoUploading(true)
    setPhotosError('')

    try {
      const body = new FormData()
      body.append('file', selectedPhotoFile)
      if (photoDescription.trim()) {
        body.append('description', photoDescription.trim())
      }

      await apiRequest(`/photos/uploads/${constructionId}`, {
        method: 'POST',
        token,
        body,
      })

      await loadPhotos(constructionId)
      setSelectedPhotoFile(null)
      if (selectedPhotoPreviewUrl) {
        URL.revokeObjectURL(selectedPhotoPreviewUrl)
      }
      setSelectedPhotoPreviewUrl('')
      setPhotoDescription('')
      setPhotoInputKey((current) => current + 1)
      toast.success('Foto enviada com sucesso.')
    } catch (err) {
      if (err instanceof ApiError) {
        setPhotosError(err.message)
      } else {
        setPhotosError('Nao foi possivel enviar a foto.')
      }
    } finally {
      setIsPhotoUploading(false)
    }
  }

  async function handleDeletePhoto(photoId: number) {
    if (!constructionId) return

    setPhotoDeleteId(photoId)
    setPhotosError('')

    try {
      await apiRequest(`/photos/${photoId}`, {
        method: 'DELETE',
        token,
      })

      await loadPhotos(constructionId)
      toast.success('Foto excluida com sucesso.')
    } catch (err) {
      if (err instanceof ApiError) {
        setPhotosError(err.message)
      } else {
        setPhotosError('Nao foi possivel excluir a foto.')
      }
    } finally {
      setPhotoDeleteId(null)
    }
  }

  function handleMaterialFormChange(field: keyof MaterialFormState, value: string) {
    setMaterialForm((current) => ({
      ...current,
      [field]: field === 'amount' ? value.replace(',', '.') : value,
    }))
  }

  const checklistProgress = useMemo(() => {
    const total = checklistItems.length
    const done = checklistItems.filter((item) => item.checked).length
    return { total, done }
  }, [checklistItems])

  const progressPercent = useMemo(() => {
    if (checklistProgress.total > 0) {
      return Math.round((checklistProgress.done / checklistProgress.total) * 100)
    }

    if (!report || report.agreedDeadLine <= 0) {
      return 0
    }

    return Math.min(100, Math.round((report.daysElapsed / report.agreedDeadLine) * 100))
  }, [checklistProgress.done, checklistProgress.total, report])

  async function handleGenerateReportPdf() {
    if (!report || isGeneratingReport) return

    setIsGeneratingReport(true)

    try {
      const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])

      const doc = new JsPDF({ unit: 'pt', format: 'a4' })
      const generatedAt = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date())

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text(`Relatorio da obra - ${report.name}`, 40, 46)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Gerado em ${generatedAt}`, 40, 64)

      let cursorY = 84

      autoTable(doc, {
        startY: cursorY,
        head: [['Campo', 'Valor']],
        body: [
          ['Status', statusLabel[report.status]],
          ['Cliente', report.client.name],
          ['Contato local', report.localContact || '-'],
          ['Equipe', `${report.workers.length} colaboradores`],
          ['Inicio', formatDate(report.startDate)],
          ['Fim previsto', formatDate(report.endDate)],
          ['Prazo acordado', `${report.agreedDeadLine} dias`],
          ['Dias corridos', String(report.daysElapsed)],
          ['Atraso', `${report.overdueDays} dias`],
          ['Progresso checklist', `${checklistProgress.done}/${checklistProgress.total}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [23, 50, 75], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 6 },
        columnStyles: { 0: { cellWidth: 160 }, 1: { cellWidth: 340 } },
      })

      cursorY = ((doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? cursorY) + 18

      autoTable(doc, {
        startY: cursorY,
        head: [['Endereco', 'Telefone', 'Email']],
        body: [[formatAddress(report.address), report.client.phone || '-', report.client.email || '-']],
        theme: 'grid',
        headStyles: { fillColor: [53, 81, 107], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 6 },
      })

      cursorY = ((doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? cursorY) + 18

      autoTable(doc, {
        startY: cursorY,
        head: [['Materiais', 'Quantidade', 'Disponivel']],
        body: materials.length
          ? materials.map((material) => [material.name, formatMaterialAmount(material.amount), material.isAvailable ? 'Sim' : 'Nao'])
          : [['Sem materiais cadastrados', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [53, 81, 107], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 6 },
      })

      cursorY = ((doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? cursorY) + 18

      autoTable(doc, {
        startY: cursorY,
        head: [['Checklist', 'Status']],
        body: checklistItems.length
          ? checklistItems.map((item) => [item.title, item.checked ? 'Concluido' : 'Pendente'])
          : [['Sem checklist cadastrado', '-']],
        theme: 'grid',
        headStyles: { fillColor: [53, 81, 107], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 6 },
      })

      const sanitizedName = report.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()

      doc.save(`reporte-${sanitizedName || report.id}.pdf`)
      toast.success('Reporte em PDF gerado com sucesso.')
    } catch {
      toast.error('Nao foi possivel gerar o PDF do reporte.')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  if (isLoading) {
    return <p className="feedback">Carregando detalhe da obra...</p>
  }

  if (error || !report) {
    return (
      <div className="page-stack">
        <Link to="/obras" className="back-link">
          Voltar para obras
        </Link>
        <p className="form-error">{error || 'Obra nao encontrada.'}</p>
      </div>
    )
  }

  return (
    <div className="page-stack detail-page-stack">
      <section className="panel work-hub-hero quali-work-hub-hero">
        <div className="work-hub-hero__content">
          <Link to="/obras" className="detail-back-button">
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar
          </Link>
          <span className="hero-panel__date">Obra selecionada</span>
          <h2>{report.name}</h2>
          <p>Visao geral da obra.</p>
        </div>

        <div className="work-hub-hero__summary">
          <div className="summary-chip summary-chip--wide">
            <strong>{progressPercent}%</strong>
            <span>andamento geral</span>
          </div>
          <div className="summary-chip summary-chip--wide">
            <strong>{report.workers.length} trabalhadores previstos</strong>
            <span>equipe atual</span>
          </div>
          <div className="summary-chip summary-chip--wide">
            <strong>Prazo em {formatShortDate(report.endDate)}</strong>
            <span>proximo marco</span>
          </div>
        </div>
      </section>

      <section className="detail-header-grid">
        <article className="work-overview-card work-overview-card--primary">
          <div className="work-overview-card__header">
            <div>
              <span className="panel__eyebrow">Resumo da obra</span>
              <h3>{buildStatusHeadline(report)}</h3>
            </div>
            <span className="work-status-pill">{statusLabel[report.status]}</span>
          </div>

          <div className="work-overview-card__metrics detail-summary-metrics">
            <div>
              <span>Local</span>
              <strong>{report.address.neighborhood || report.address.city}</strong>
            </div>
            <div>
              <span>Responsavel</span>
              <strong>{report.localContact}</strong>
            </div>
            <div>
              <span>Alerta</span>
              <strong>{buildAlertText(report)}</strong>
            </div>
          </div>
        </article>

        <article className="work-overview-card detail-side-actions">
          <div className="work-overview-card__header">
            <div>
              <h3>O que normalmente procuram aqui</h3>
            </div>
          </div>

          <div className="key-links detail-key-links">
            <button type="button" className="key-link" onClick={() => setActiveTab('overview')}>
              Ver cronograma
            </button>
            <button type="button" className="key-link" onClick={() => setIsPhotosModalOpen(true)}>
              Ver fotos
            </button>
            <button type="button" className="key-link" onClick={() => setIsChecklistModalOpen(true)}>
              Ver checklist
            </button>
          </div>
        </article>
      </section>

      <section className="detail-module-grid">
        <DetailModuleCard
          icon={ClipboardList}
          title="Checklist"
          description="Itens planejados."
          metric={`${checklistProgress.done} de ${checklistProgress.total} itens planejados`}
          actions={[
            { label: 'Ver', onClick: () => setIsChecklistModalOpen(true) },
            { label: 'Editar checklist', variant: 'secondary', onClick: () => setIsChecklistModalOpen(true) },
          ]}
        />

        <DetailModuleCard
          icon={CalendarDays}
          title="Cronograma"
          description="Prazos e etapas."
          metric={`Prazo base ate ${formatShortDate(report.endDate)}`}
          actions={[
            { label: 'Ver', onClick: () => setActiveTab('overview') },
            { label: 'Editar cronograma', variant: 'secondary', onClick: () => setActiveTab('overview') },
          ]}
        />

        <DetailModuleCard
          icon={Users}
          title="Equipe"
          description="Equipe alocada."
          metric={buildTeamMetric(report)}
          actions={[
            { label: 'Ver', onClick: () => setIsTeamModalOpen(true) },
            { label: 'Adicionar colaborador', variant: 'secondary', onClick: () => setIsTeamModalOpen(true) },
          ]}
        />

        <DetailModuleCard
          icon={Hammer}
          title="Lista de materiais"
          description="Itens da obra."
          metric={buildMaterialMetric(materials)}
          actions={[
            { label: 'Ver', onClick: () => setIsMaterialsModalOpen(true) },
            { label: 'Adicionar material', variant: 'secondary', onClick: () => setIsMaterialsModalOpen(true) },
          ]}
        />

        <DetailModuleCard
          icon={Camera}
          title="Fotos"
          description="Registros visuais."
          metric={photos.length ? `${photos.length} registros de campo` : 'Sem registros de campo'}
          actions={[
            { label: 'Ver', onClick: () => setIsPhotosModalOpen(true) },
            { label: 'Ver fotos', variant: 'secondary', onClick: () => setIsPhotosModalOpen(true) },
          ]}
        />

        <DetailModuleCard
          icon={FileText}
          title="Reporte"
          description="Resumo da obra."
          metric={report.pictures.length ? `${report.pictures.length} fotos no report` : 'Reporte inicial para cliente pendente'}
          actions={[
            { label: 'Ver', onClick: () => setActiveTab('overview') },
            { label: isGeneratingReport ? 'Gerando...' : 'Gerar PDF', variant: 'secondary', onClick: () => void handleGenerateReportPdf() },
          ]}
        />
      </section>

      {activeTab === 'overview' ? (
        <DetailInfoSection title="Panorama e contato" copy="Dados principais.">
          <div className="detail-grid">
            <article className="detail-card detail-card--soft">
              <h3 className="panel__title">Cronograma base</h3>
              <div className="key-value-list">
                <div><span>Inicio</span><strong>{formatDate(report.startDate)}</strong></div>
                <div><span>Fim previsto</span><strong>{formatDate(report.endDate)}</strong></div>
                <div><span>Prazo acordado</span><strong>{report.agreedDeadLine} dias</strong></div>
                <div><span>Dias corridos</span><strong>{report.daysElapsed}</strong></div>
                <div><span>Atraso</span><strong>{report.overdueDays}</strong></div>
              </div>
            </article>

            <article className="detail-card detail-card--soft">
              <h3 className="panel__title">Cliente e endereco</h3>
              <div className="key-value-list">
                <div><span>Cliente</span><strong>{report.client.name}</strong></div>
                <div><span>Telefone</span><strong>{report.client.phone}</strong></div>
                <div><span>Email</span><strong>{report.client.email}</strong></div>
                <div><span>Cidade</span><strong>{report.address.city}</strong></div>
                <div><span>Endereco</span><strong>{formatAddress(report.address)}</strong></div>
              </div>
            </article>
          </div>
        </DetailInfoSection>
      ) : null}

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        workers={report.workers}
        constructionId={constructionId!}
        token={token!}
        onTeamUpdated={() => void reloadReport()}
        apiRequest={apiRequest}
        toast={toast}
      />

      <MaterialsModal
        isOpen={isMaterialsModalOpen}
        onClose={() => setIsMaterialsModalOpen(false)}
        materials={materials}
        form={materialForm}
        isSubmitting={isMaterialSubmitting}
        actionMaterialId={materialActionId}
        error={materialsError}
        onFormChange={handleMaterialFormChange}
        onSubmit={handleCreateMaterial}
        onIncrease={(materialId) => void handleIncreaseMaterial(materialId)}
        onDecrease={(materialId, currentAmount) => void handleDecreaseMaterial(materialId, currentAmount)}
        onDelete={(materialId) => void handleDeleteMaterial(materialId)}
        editingMaterialId={editingMaterialId}
        editingForm={materialEditForm}
        onStartEdit={handleStartEditMaterial}
        onCancelEdit={handleCancelEditMaterial}
        onEditFormChange={(field, value) => setMaterialEditForm((current) => ({ ...current, [field]: value }))}
        onSaveEdit={(materialId) => void handleSaveMaterial(materialId)}
      />

      <PhotosModal
        isOpen={isPhotosModalOpen}
        onClose={() => setIsPhotosModalOpen(false)}
        photos={photos}
        isUploading={isPhotoUploading}
        deletePhotoId={photoDeleteId}
        error={photosError}
        selectedFileName={selectedPhotoFile?.name ?? ''}
        selectedPhotoPreviewUrl={selectedPhotoPreviewUrl}
        photoDescription={photoDescription}
        fileInputKey={photoInputKey}
        onFileChange={handlePhotoFileChange}
        onPhotoDescriptionChange={setPhotoDescription}
        onUpload={handleUploadPhoto}
        onDelete={(photoId) => void handleDeletePhoto(photoId)}
        resolvePhotoUrl={resolvePhotoUrl}
        formatDate={formatDate}
      />

      <ChecklistModal
        isOpen={isChecklistModalOpen}
        onClose={() => setIsChecklistModalOpen(false)}
        checklistProgress={checklistProgress}
        checkListId={checkListId}
        checklistItems={checklistItems}
        isChecklistLoading={isChecklistLoading}
        checklistError={checklistError}
        isCreatingChecklist={isCreatingChecklist}
        isCreatingItem={isCreatingItem}
        newChecklistItem={newChecklistItem}
        onNewChecklistItemChange={setNewChecklistItem}
        onCreateChecklist={handleCreateChecklist}
        onCreateChecklistItem={handleCreateChecklistItem}
        onToggleChecklistItem={(itemId) => void handleToggleChecklistItem(itemId)}
        onDeleteChecklistItem={(itemId) => void handleDeleteChecklistItem(itemId)}
      />
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
}

function formatAddress(address: ReportResponse['address']) {
  return `${address.street}, ${address.number} - ${address.neighborhood}${address.complement ? `, ${address.complement}` : ''}`
}

function buildStatusHeadline(report: ReportResponse) {
  if (report.status === 'COMPLETED') return 'Entrega concluida'
  if (report.status === 'SCHEDULED') return 'Mobilizacao inicial'
  return 'Frente em execucao'
}

function buildAlertText(report: ReportResponse) {
  if (report.comments) return report.comments
  if (report.overdueDays > 0) return `${report.overdueDays} dias de atraso`
  return 'Sem alertas criticos no momento'
}

function buildTeamMetric(report: ReportResponse) {
  if (report.workers.length) return `${report.workers.length} colaboradores vinculados`
  return 'Equipe base ainda nao vinculada'
}

function buildMaterialMetric(materials: Material[]) {
  if (!materials.length) return 'Pedido inicial em aprovacao'
  const available = materials.filter((material) => material.isAvailable).length
  return `${available} de ${materials.length} itens disponiveis`
}

function formatMaterialAmount(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function resolvePhotoUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
  return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`
}

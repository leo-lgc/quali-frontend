import { ArrowLeft, Camera, ClipboardList, FileText, Hammer, Users } from 'lucide-react'
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
  items: Array<CheckListItem & { checkList?: number }>
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
  SCHEDULED: 'Aguardando início',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Finalizada',
}

export function ConstructionDetailPage() {
  const { constructionId } = useParams()
  const { token, user } = useAuth()
  const toast = useToast()
  const canManageConstruction = user?.role === 'ADMIN' || user?.role === 'MANAGER'
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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
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
        setError('Obra não encontrada.')
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
            name: 'Cliente não informado',
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
          setError('Não foi possível carregar os detalhes da obra.')
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
      setChecklistItems(
        (checkListResponse.items ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          checked: Boolean(item.checked),
        })),
      )
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setCheckListId(null)
        setChecklistItems([])
        return
      }

      if (err instanceof ApiError) {
        setChecklistError(err.message)
      } else {
        setChecklistError('Não foi possível carregar o checklist.')
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
          name: 'Cliente não informado',
          phone: '-',
          email: '-',
        },
        daysElapsed: reportResponse.daysElapsed ?? 0,
        overdueDays: reportResponse.overdueDays ?? 0,
      })
    } catch {
      toast.error('Não foi possível recarregar os dados da obra.')
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
      setChecklistItems(
        (response.items ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          checked: Boolean(item.checked),
        })),
      )
    } catch (err) {
      if (err instanceof ApiError) {
        setChecklistError(err.message)
      } else {
        setChecklistError('Não foi possível criar o checklist.')
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

      setChecklistItems((current) => [
        ...current,
        {
          id: createdItem.id,
          title: createdItem.title,
          checked: Boolean(createdItem.checked),
        },
      ])
      setNewChecklistItem('')
    } catch (err) {
      if (err instanceof ApiError) {
        setChecklistError(err.message)
      } else {
        setChecklistError('Não foi possível criar o item.')
      }
    } finally {
      setIsCreatingItem(false)
    }
  }

  async function handleToggleChecklistItem(itemId: number) {
    setChecklistError('')

    try {
      await apiRequest(`/checklist/item/${itemId}`, {
        method: 'PATCH',
        token,
      })

      setChecklistItems((current) =>
        current.map((item) => (item.id === itemId ? { ...item, checked: !item.checked } : item)),
      )
    } catch (err) {
      if (err instanceof ApiError) {
        setChecklistError(err.message)
      } else {
        setChecklistError('Não foi possível atualizar o item.')
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
        setChecklistError('Não foi possível excluir o item.')
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
        setMaterialsError('Não foi possível adicionar o material.')
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
        setMaterialsError('Não foi possível atualizar a quantidade.')
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
        setMaterialsError('Não foi possível atualizar a quantidade.')
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
        setMaterialsError('Não foi possível remover o material.')
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
        setMaterialsError('Não foi possível atualizar o material.')
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

  function handleClearPhotoPreview() {
    setSelectedPhotoFile(null)
    if (selectedPhotoPreviewUrl) {
      URL.revokeObjectURL(selectedPhotoPreviewUrl)
    }
    setSelectedPhotoPreviewUrl('')
    setPhotoDescription('')
    setPhotoInputKey((current) => current + 1)
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
        setPhotosError('Não foi possível enviar a foto.')
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
        setPhotosError('Não foi possível excluir a foto.')
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
      const photoItems = photos.slice(0, 4)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text(`Relatório da obra - ${report.name}`, 40, 46)
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
          ['Início', formatDate(report.startDate)],
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
        head: [['Endereço', 'Telefone', 'Email']],
        body: [[formatAddress(report.address), report.client.phone || '-', report.client.email || '-']],
        theme: 'grid',
        headStyles: { fillColor: [53, 81, 107], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 6 },
      })

      cursorY = ((doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? cursorY) + 18

      autoTable(doc, {
        startY: cursorY,
        head: [['Materiais', 'Quantidade', 'Disponível']],
        body: materials.length
          ? materials.map((material) => [material.name, formatMaterialAmount(material.amount), material.isAvailable ? 'Sim' : 'Não'])
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
          ? checklistItems.map((item) => [item.title, item.checked ? 'Concluído' : 'Pendente'])
          : [['Sem checklist cadastrado', '-']],
        theme: 'grid',
        headStyles: { fillColor: [53, 81, 107], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 6 },
      })

      cursorY = ((doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? cursorY) + 18

      if (photoItems.length) {
        if (cursorY > 660) {
          doc.addPage()
          cursorY = 48
        }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.text('Fotos da obra', 40, cursorY)
        cursorY += 18

        const photoWidth = 240
        const photoHeight = 150
        const photoGap = 24

        for (let index = 0; index < photoItems.length; index += 1) {
          const photo = photoItems[index]
          if (index > 0 && index % 2 === 0) {
            cursorY += photoHeight + 58
          }

          if (cursorY + photoHeight + 58 > 760) {
            doc.addPage()
            cursorY = 48
          }

          const x = 40 + (index % 2) * (photoWidth + photoGap)
          const imageData = await loadPhotoAsDataUrl(resolvePhotoUrl(photo.url))
          if (imageData) {
            doc.addImage(imageData, detectImageFormat(imageData), x, cursorY, photoWidth, photoHeight)
          } else {
            doc.setDrawColor(210, 220, 231)
            doc.rect(x, cursorY, photoWidth, photoHeight)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(10)
            doc.text('Imagem indisponível', x + 12, cursorY + 22)
          }

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10)
          doc.text(`Foto ${index + 1}`, x, cursorY + photoHeight + 18)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.text(photo.description || 'Sem descrição cadastrada.', x, cursorY + photoHeight + 34, { maxWidth: photoWidth })
        }
      }

      const sanitizedName = report.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()

      doc.save(`reporte-${sanitizedName || report.id}.pdf`)
      toast.success('Reporte em PDF gerado com sucesso.')
    } catch {
      toast.error('Não foi possível gerar o PDF do reporte.')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  async function handleStatusChange(nextStatus: Status) {
    if (!constructionId || !report || nextStatus === report.status || isUpdatingStatus) return

    setIsUpdatingStatus(true)

    try {
      await apiRequest(`/construction/status/${constructionId}/${nextStatus}`, {
        method: 'PATCH',
        token,
      })

      setReport((current) => (current ? { ...current, status: nextStatus } : current))
      toast.success('Status da obra atualizado com sucesso.')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Não foi possível atualizar o status da obra.')
      }
    } finally {
      setIsUpdatingStatus(false)
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
          <p className="form-error">{error || 'Obra não encontrada.'}</p>
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
          <p>Visão geral da obra.</p>
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
            <span>próximo marco</span>
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
            <div className="detail-status-controls">
              <span className="work-status-pill">{statusLabel[report.status]}</span>
              {canManageConstruction ? (
                <label className="detail-status-select">
                  <span className="sr-only">Alterar status da obra</span>
                  <select value={report.status} onChange={(event) => void handleStatusChange(event.target.value as Status)} disabled={isUpdatingStatus}>
                    {Object.entries(statusLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </div>

          <div className="work-overview-card__metrics detail-summary-metrics">
            <div>
              <span>Local</span>
              <strong>{report.address.neighborhood || report.address.city}</strong>
            </div>
            <div>
              <span>Responsável</span>
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
              <h3>{canManageConstruction ? 'Atalhos da operação' : 'Consultas rápidas'}</h3>
              <p>{canManageConstruction ? 'Acesse os pontos mais usados do acompanhamento desta obra.' : 'Abra os módulos mais consultados desta obra.'}</p>
            </div>
          </div>

          <div className="key-links detail-key-links">
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
            { label: 'Abrir checklist', variant: 'secondary', onClick: () => setIsChecklistModalOpen(true) },
          ]}
        />

        <DetailModuleCard
          icon={Users}
          title="Equipe"
          description="Equipe alocada."
          metric={buildTeamMetric(report)}
          actions={[
            { label: canManageConstruction ? 'Gerenciar equipe' : 'Ver equipe', variant: 'secondary', onClick: () => setIsTeamModalOpen(true) },
          ]}
        />

        <DetailModuleCard
          icon={Hammer}
          title="Lista de materiais"
          description="Itens da obra."
          metric={buildMaterialMetric(materials)}
          actions={[
            { label: 'Gerenciar materiais', variant: 'secondary', onClick: () => setIsMaterialsModalOpen(true) },
          ]}
        />

        <DetailModuleCard
          icon={Camera}
          title="Fotos"
          description="Registros visuais."
          metric={photos.length ? `${photos.length} registros de campo` : 'Sem registros de campo'}
          actions={[
            { label: 'Abrir fotos', variant: 'secondary', onClick: () => setIsPhotosModalOpen(true) },
          ]}
        />

        <DetailModuleCard
          icon={FileText}
          title="Reporte"
          description="Resumo da obra."
              metric={report.pictures.length ? `${report.pictures.length} fotos no report` : 'Reporte inicial para cliente pendente'}
          actions={[
            { label: isGeneratingReport ? 'Gerando...' : 'Gerar PDF', variant: 'secondary', onClick: () => void handleGenerateReportPdf() },
          ]}
        />
      </section>

      <DetailInfoSection title="Panorama e contato" copy="Dados principais.">
        <div className="detail-grid">
          <article className="detail-card detail-card--soft">
            <h3 className="panel__title">Prazos da obra</h3>
            <div className="key-value-list">
              <div><span>Início</span><strong>{formatDate(report.startDate)}</strong></div>
              <div><span>Fim previsto</span><strong>{formatDate(report.endDate)}</strong></div>
              <div><span>Prazo acordado</span><strong>{report.agreedDeadLine} dias</strong></div>
              <div><span>Dias corridos</span><strong>{report.daysElapsed}</strong></div>
              <div><span>Atraso</span><strong>{report.overdueDays}</strong></div>
            </div>
          </article>

          <article className="detail-card detail-card--soft">
            <h3 className="panel__title">Cliente e endereço</h3>
            <div className="key-value-list">
              <div><span>Cliente</span><strong>{report.client.name}</strong></div>
              <div><span>Telefone</span><strong>{report.client.phone}</strong></div>
              <div><span>Email</span><strong>{report.client.email}</strong></div>
              <div><span>Cidade</span><strong>{report.address.city}</strong></div>
              <div><span>Endereço</span><strong>{formatAddress(report.address)}</strong></div>
            </div>
          </article>
        </div>
      </DetailInfoSection>

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        workers={report.workers}
        constructionId={constructionId!}
        token={token!}
        onTeamUpdated={() => void reloadReport()}
        canManage={canManageConstruction}
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
        onClearPreview={handleClearPhotoPreview}
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
  if (report.status === 'COMPLETED') return 'Entrega concluída'
  if (report.status === 'SCHEDULED') return 'Mobilização inicial'
  return 'Frente em execução'
}

function buildAlertText(report: ReportResponse) {
  if (report.comments) return report.comments
  if (report.overdueDays > 0) return `${report.overdueDays} dias de atraso`
  return 'Sem alertas criticos no momento'
}

function buildTeamMetric(report: ReportResponse) {
  if (report.workers.length) return `${report.workers.length} colaboradores vinculados`
  return 'Equipe base ainda não vinculada'
}

function buildMaterialMetric(materials: Material[]) {
  if (!materials.length) return 'Pedido inicial em aprovação'
  const available = materials.filter((material) => material.isAvailable).length
  return `${available} de ${materials.length} itens disponíveis`
}

function formatMaterialAmount(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

async function loadPhotoAsDataUrl(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) return ''

    const blob = await response.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(new Error('Falha ao ler imagem'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

function detectImageFormat(dataUrl: string) {
  if (dataUrl.startsWith('data:image/png')) return 'PNG'
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP'
  return 'JPEG'
}

function resolvePhotoUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
  return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`
}

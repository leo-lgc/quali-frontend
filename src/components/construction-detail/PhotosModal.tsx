import { Camera, ImagePlus, Trash2, Upload, X } from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'
import { ModalShell } from '../modals/ModalShell'

type Photo = {
  id: number
  url: string
  uploadDate: string
  description: string | null
}

type PhotosModalProps = {
  isOpen: boolean
  onClose: () => void
  photos: Photo[]
  isUploading: boolean
  deletePhotoId: number | null
  error: string
  selectedFileName: string
  selectedPhotoPreviewUrl: string
  photoDescription: string
  fileInputKey: number
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onPhotoDescriptionChange: (value: string) => void
  onClearPreview: () => void
  onUpload: (event: FormEvent<HTMLFormElement>) => void
  onDelete: (photoId: number) => void
  resolvePhotoUrl: (url: string) => string
  formatDate: (value: string) => string
}

export function PhotosModal({
  isOpen,
  onClose,
  photos,
  isUploading,
  deletePhotoId,
  error,
  selectedFileName,
  selectedPhotoPreviewUrl,
  photoDescription,
  fileInputKey,
  onFileChange,
  onPhotoDescriptionChange,
  onClearPreview,
  onUpload,
  onDelete,
  resolvePhotoUrl,
  formatDate,
}: PhotosModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Fotos da obra"
      title="Registros visuais"
      description="Adicione e gerencie as fotos desta obra."
      className="photos-modal"
      ariaLabel="Fotos da obra"
    >
      <div className="panel photos-panel">
        <div className="panel__header">
          <div>
            <h3 className="panel__title">Fotos cadastradas</h3>
            <p className="panel__copy">{photos.length} {photos.length === 1 ? 'registro' : 'registros'} na obra.</p>
          </div>
          <span className="weather-pill">{photos.length}</span>
        </div>

        <form className="photos-upload-form" onSubmit={onUpload}>
          <div className="field photos-upload-form__file">
            <span>Nova foto</span>

            <input
              id={`photo-upload-${fileInputKey}`}
              key={`picker-${fileInputKey}`}
              className="photos-upload-form__hidden-input"
              type="file"
              accept="image/*"
              onChange={onFileChange}
              required
            />

            <div className="photos-upload-form__picker-row">
              <label htmlFor={`photo-upload-${fileInputKey}`} className="photos-upload-form__picker">
                <ImagePlus size={16} />
                Selecionar foto
              </label>
              <span className="photos-upload-form__file-name">
                {selectedFileName || 'Nenhum arquivo selecionado'}
              </span>
              <button type="submit" className="primary-button photos-upload-form__submit" disabled={isUploading}>
                <Upload size={16} />
                {isUploading ? 'Enviando...' : 'Enviar foto'}
              </button>
            </div>

            <small className="field-help photos-upload-form__help">Selecione uma imagem para enviar.</small>

            <label className="field photos-upload-form__description">
              <span>Descrição</span>
              <input
                type="text"
                value={photoDescription}
                onChange={(event) => onPhotoDescriptionChange(event.target.value)}
                placeholder="Descreva a imagem"
              />
            </label>

            {selectedPhotoPreviewUrl ? (
              <div className="photos-upload-form__preview">
                <button type="button" className="photos-upload-form__preview-close" onClick={onClearPreview} aria-label="Remover foto selecionada">
                  <X size={14} />
                </button>
                <img src={selectedPhotoPreviewUrl} alt="Preview da nova foto" />
              </div>
            ) : null}
          </div>
        </form>

        {error ? <p className="form-error">{error}</p> : null}

        {photos.length ? (
          <div className="photo-grid photos-modal__grid">
            {photos.map((photo) => {
              const isDeleting = deletePhotoId === photo.id

              return (
                <article key={photo.id} className="photo-card detail-photo-card">
                  <div className="photo-card__frame">
                    <img src={resolvePhotoUrl(photo.url)} alt={photo.description || `Foto ${photo.id}`} />
                  </div>
                  <div className="photo-card__body">
                    <strong>Foto #{photo.id}</strong>
                    <span>{formatDate(photo.uploadDate)}</span>
                    <p>{photo.description || 'Sem descrição cadastrada.'}</p>
                  </div>
                  <div className="photos-modal__actions">
                    <button
                      type="button"
                      className="ghost-page-button"
                      onClick={() => onDelete(photo.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 size={15} />
                      {isDeleting ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="photos-empty-state">
            <strong>Nenhuma foto cadastrada.</strong>
            <span>Envie a primeira imagem para registrar a evolução da obra.</span>
            <Camera size={18} />
          </div>
        )}
      </div>
    </ModalShell>
  )
}

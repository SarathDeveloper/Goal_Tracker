import { fieldErrors, categoryInputSchema } from '@shared/schemas'
import type { Category } from '@shared/types'
import { useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { FormField } from '../../components/FormField'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/toastContext'
import { api } from '../../lib/api'

interface CategoriesModalProps {
  open: boolean
  categories: Category[]
  onClose: () => void
  onChange: () => void
}

export function CategoriesModal({ open, categories, onClose, onChange }: CategoriesModalProps) {
  const push = useToast()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#0f766e')
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  async function create(event: FormEvent) {
    event.preventDefault()
    const parsed = categoryInputSchema.safeParse({ name, color })
    if (!parsed.success) {
      setError(fieldErrors(parsed.error).name ?? fieldErrors(parsed.error).color ?? 'Check the category')
      return
    }
    try {
      await api<Category>('/api/categories', { method: 'POST', body: JSON.stringify(parsed.data) })
      setName('')
      setError('')
      onChange()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not add the category' })
    }
  }

  async function rename(category: Category, nextName: string, nextColor: string) {
    const parsed = categoryInputSchema.safeParse({ name: nextName, color: nextColor })
    if (!parsed.success) {
      push({ tone: 'error', message: 'Enter a name and a color' })
      return
    }
    try {
      await api(`/api/categories/${category.id}`, { method: 'PUT', body: JSON.stringify(parsed.data) })
      onChange()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not rename the category' })
    }
  }

  async function remove() {
    if (!pendingDelete) {
      return
    }
    try {
      await api(`/api/categories/${pendingDelete.id}`, { method: 'DELETE' })
      setPendingDelete(null)
      onChange()
    } catch (caught) {
      push({ tone: 'error', message: caught instanceof Error ? caught.message : 'Could not delete the category' })
    }
  }

  return (
    <>
      <Modal open={open} title="Categories" onClose={onClose}>
        <p className="muted">Deleting a category keeps its goals and clears their category.</p>
        <form className="form-grid" onSubmit={create}>
          <div className="category-row">
            <FormField label="New category" htmlFor="category-name" error={error}>
              <input id="category-name" value={name} onChange={(event) => setName(event.target.value)} />
            </FormField>
            <FormField label="Color" htmlFor="category-color">
              <input id="category-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
            </FormField>
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </div>
        </form>
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} onSave={rename} onDelete={() => setPendingDelete(category)} />
        ))}
      </Modal>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this category?"
        body={
          pendingDelete
            ? `${pendingDelete.goalCount} goal${pendingDelete.goalCount === 1 ? '' : 's'} will become uncategorized.`
            : ''
        }
        confirmLabel="Delete category"
        danger
        onConfirm={() => void remove()}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}

function CategoryRow({
  category,
  onSave,
  onDelete,
}: {
  category: Category
  onSave: (category: Category, name: string, color: string) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  return (
    <div className="category-row">
      <input aria-label={`${category.name} name`} value={name} onChange={(event) => setName(event.target.value)} />
      <input aria-label={`${category.name} color`} type="color" value={color} onChange={(event) => setColor(event.target.value)} />
      <button type="button" className="btn btn-ghost" onClick={() => onSave(category, name, color)}>
        Save
      </button>
      <button type="button" className="btn btn-ghost" onClick={onDelete}>
        Delete
      </button>
    </div>
  )
}

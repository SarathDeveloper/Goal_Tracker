import { categoryInputSchema } from '@shared/schemas'
import { Router } from 'express'
import { createCategory, deleteCategory, listCategories, updateCategory } from '../goals/categoryService'
import { asyncHandler, parseBody, parseIdParam } from '../lib/http'

const router = Router()

router.get(
  '/',
  asyncHandler((_req, res) => {
    res.json({ categories: listCategories() })
  }),
)

router.post(
  '/',
  asyncHandler((req, res) => {
    res.status(201).json(createCategory(parseBody(categoryInputSchema, req.body)))
  }),
)

router.put(
  '/:id',
  asyncHandler((req, res) => {
    res.json(updateCategory(parseIdParam(req.params.id), parseBody(categoryInputSchema, req.body)))
  }),
)

router.delete(
  '/:id',
  asyncHandler((req, res) => {
    deleteCategory(parseIdParam(req.params.id))
    res.status(204).end()
  }),
)

export default router

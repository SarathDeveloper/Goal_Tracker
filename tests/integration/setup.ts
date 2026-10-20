import { afterEach } from 'vitest'
import { closeDatabase } from '../../server/db/index'

afterEach(() => {
  closeDatabase()
})

import { Hono } from 'npm:hono'
import * as kv from './kv_store.tsx'
import { 
  requireAuth, 
  getAuthenticatedUser, 
  createUserKey,
  createCategoryDataKey
} from './auth.tsx'

export function setupDeleteCategoryRoutes(app: Hono) {
  // Delete category data endpoint (authenticated)
  app.delete('/make-server-ce8ebc43/category-data', requireAuth, async (c) => {
    try {
      const user = getAuthenticatedUser(c)
      console.log('=== DELETING CATEGORY DATA ===')
      console.log(`Deleting all category data for user ${user.id}`)
      
      // Delete both processed and raw category data
      await kv.del(createCategoryDataKey(user.id))
      await kv.del(createUserKey(user.id, 'category_data_raw'))
      
      const deletedAt = new Date().toISOString()
      
      console.log(`Category data deleted successfully for user ${user.id} at ${deletedAt}`)
      
      return c.json({ 
        success: true, 
        message: 'All category data deleted successfully',
        deletedAt,
        deletedUploadsCount: 2 // Both processed and raw data
      })
    } catch (error) {
      console.error('Error deleting category data:', error)
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }
  })
}
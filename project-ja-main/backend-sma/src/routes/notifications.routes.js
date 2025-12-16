import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { prisma } from '../db/prisma.js'
import { subscribe, publishNotification } from '../utils/notificationBroker.js'

const router = Router()

// SSE stream for notifications
router.get('/stream', requireAuth, (req, res) => {
  const userId = Number(req.user?.id || req.user?.sub || null)
  // if user is also a store, include storeId
  const storeId = req.user?.role === 'STORE' ? userId : null
  subscribe({ userId, storeId, res })
})

// GET /notifications - notifications for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user?.id || req.user?.sub || null)
    const list = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json(list)
  } catch (err) {
    console.error('GET /notifications error', err)
    res.status(500).json({ message: 'Unable to load notifications' })
  }
})

// GET /store/:id/notifications is handled by store route, but provide here for convenience
router.get('/store/:storeId', requireAuth, async (req, res) => {
  try {
    const storeId = Number(req.params.storeId)
    const list = await prisma.notification.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json(list)
  } catch (err) {
    console.error('GET /store/:id/notifications error', err)
    res.status(500).json({ message: 'Unable to load notifications' })
  }
})

// helper to create notification and publish
export async function createAndPublish({ prisma, attrs }) {
  const n = await prisma.notification.create({ data: attrs })
  await publishNotification({ prisma, notification: n })
  return n
}

export default router

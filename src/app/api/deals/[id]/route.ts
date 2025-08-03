import { NextRequest, NextResponse } from 'next/server'
import { DealOperations } from '@/lib/dynamodb-operations'
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware'

async function getDeal(request: NextRequest, user: AuthenticatedUser, { params }: { params: { id: string } }) {
  try {
    const deal = await DealOperations.getDeal(params.id)
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }
    return NextResponse.json(deal)
  } catch (error) {
    console.error('Error fetching deal:', error)
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 })
  }
}

export const GET = withAuth(getDeal)
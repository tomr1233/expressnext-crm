import { NextRequest, NextResponse } from 'next/server'
import { DealOperations } from '@/lib/dynamodb-operations'
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware'

async function getDeals(request: NextRequest, user: AuthenticatedUser) {
  try {
    const deals = await DealOperations.getAllDeals()
    return NextResponse.json(deals)
  } catch (error) {
    console.error('Error fetching deals:', error)
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
  }
}

async function createDeal(request: NextRequest, user: AuthenticatedUser) {
  try {
    const dealData = await request.json()
    const deal = await DealOperations.createDeal(dealData)
    return NextResponse.json(deal, { status: 201 })
  } catch (error) {
    console.error('Error creating deal:', error)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}

export const GET = withAuth(getDeals)
export const POST = withAuth(createDeal)
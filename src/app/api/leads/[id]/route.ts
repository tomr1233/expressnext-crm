import { NextRequest, NextResponse } from 'next/server'
import { LeadOperations } from '@/lib/dynamodb-operations'
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware'

async function getLead(request: NextRequest, user: AuthenticatedUser, { params }: { params: { id: string } }) {
  try {
    const lead = await LeadOperations.getLead(params.id)
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 })
  }
}

async function updateLead(request: NextRequest, user: AuthenticatedUser, { params }: { params: { id: string } }) {
  try {
    const updates = await request.json()
    const lead = await LeadOperations.updateLead(params.id, updates)
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

async function deleteLead(request: NextRequest, user: AuthenticatedUser, { params }: { params: { id: string } }) {
  try {
    await LeadOperations.deleteLead(params.id)
    return NextResponse.json({ message: 'Lead deleted successfully' })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}

export const GET = withAuth(getLead)
export const PUT = withAuth(updateLead)
export const DELETE = withAuth(deleteLead)
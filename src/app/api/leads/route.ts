import { NextRequest, NextResponse } from 'next/server'
import { LeadOperations } from '@/lib/dynamodb-operations'

export async function GET() {
  try {
    const leads = await LeadOperations.getAllLeads()
    return NextResponse.json(leads)
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const leadData = await request.json()
    const lead = await LeadOperations.createLead(leadData)
    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
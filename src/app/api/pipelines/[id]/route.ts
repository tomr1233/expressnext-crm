import { NextRequest, NextResponse } from 'next/server'
import { PipelineOperations } from '@/lib/dynamodb-operations'
import { withAuth, AuthenticatedUser } from '@/lib/auth-middleware'

async function getPipeline(request: NextRequest, user: AuthenticatedUser, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pipeline = await PipelineOperations.getPipeline(id)
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }
    return NextResponse.json(pipeline)
  } catch (error) {
    console.error('Error fetching pipeline:', error)
    return NextResponse.json({ error: 'Failed to fetch pipeline' }, { status: 500 })
  }
}

export const GET = withAuth(getPipeline)
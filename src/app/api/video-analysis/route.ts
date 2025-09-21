import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward request to Python API
    const response = await fetch(`${PYTHON_API_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Video analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to start video analysis' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const action = searchParams.get('action');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID required' },
      { status: 400 }
    );
  }

  try {
    let endpoint = `/api/status/${sessionId}`;

    if (action === 'transcript') {
      endpoint = `/api/transcript/${sessionId}`;
      const timestamp = searchParams.get('timestamp');
      if (timestamp) {
        endpoint += `?timestamp=${timestamp}`;
      }
    } else if (action === 'scenes') {
      endpoint = `/api/scenes/${sessionId}`;
      const timestamp = searchParams.get('timestamp');
      if (timestamp) {
        endpoint += `?timestamp=${timestamp}`;
      }
    } else if (action === 'comparison') {
      endpoint = `/api/comparison/${sessionId}`;
    } else if (action === 'search') {
      const query = searchParams.get('query');
      endpoint = `/api/search?session_id=${sessionId}&query=${encodeURIComponent(query || '')}`;
    }

    const response = await fetch(`${PYTHON_API_URL}${endpoint}`);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Video analysis fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis data' },
      { status: 500 }
    );
  }
}
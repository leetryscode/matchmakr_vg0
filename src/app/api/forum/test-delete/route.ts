import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  console.log('=== TEST DELETE ROUTE CALLED ===');
  
  return NextResponse.json({ 
    message: 'Test delete successful',
    timestamp: new Date().toISOString(),
    route: 'test-delete-route'
  });
} 